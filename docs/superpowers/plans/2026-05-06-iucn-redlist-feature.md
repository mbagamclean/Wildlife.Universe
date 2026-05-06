# IUCN Red List Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a three-part IUCN Red List feature — admin sidebar autofill panel, an `ANIMALS_SYSTEM` AI prompt with FAQ + IUCN Analysis sections, and a frontend `/redlist` browsing page — driven by AI detection with optional IUCN API verification.

**Architecture:** Extends the existing prompt-template dispatch in `app/api/ai/write/route.js` with a new `iucn_detect` task and an `ANIMALS_SYSTEM` prompt (gated on `category=animals` + label ∈ {mammals, reptiles, amphibians, fish}). New schema columns persist `scientific_name`, `iucn_verified`, `iucn_verified_at`. A new `IUCNPanel` sidebar component in `PostEditor.jsx` exposes three triggers (manual button, full-article generation bundle, opt-in title-blur). Frontend reuses the existing `IUCNCard` for a dedicated `/redlist` page; nav links added to `MobileMenu.jsx` and `Navbar.jsx`.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres, Vercel AI SDK (`generateObject`/`streamText`), Zod, Zustand (`aiStore`), Tiptap editor, `lucide-react` icons.

**Spec:** `docs/superpowers/specs/2026-05-06-iucn-redlist-feature-design.md`

**Verification approach:** This codebase has no automated test framework (no vitest/jest, no `test` script in `package.json`). Each task includes an explicit **manual verify** step — run the dev server (`npm run dev`, port 3001), curl the route, or check the browser. Lint via `npm run lint` after structural changes.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/010_iucn_redlist.sql` | Create | Add `scientific_name`, `iucn_verified`, `iucn_verified_at`; add partial index on `iucn_status`. |
| `lib/storage/db.js` | Modify | Add new columns to `POST_COLUMNS`, extend `postToDb` / `mapPostFromDb`, add `posts.listAllForRedlist()`. |
| `components/iucn/iucnConfig.js` | Modify | Add `NE` (Not Evaluated) entry; append `'NE'` to `IUCN_ORDER`. |
| `app/api/ai/write/route.js` | Modify | Add `IUCN_DETECT_SYSTEM`, `IUCN_SCHEMA`, `iucn_detect` task short-circuit, `ANIMALS_SYSTEM`, `buildAnimalsPrompt`, `isAnimalsPost`, `IUCN_REDLIST_SYSTEM`, `buildIucnRedlistPrompt`, `isIucnRedlistAnimalPost`, two dispatch branches. |
| `app/api/iucn/verify/route.js` | Create | POST endpoint that calls IUCN Red List API v4 when `IUCN_API_TOKEN` is set; silent fallback otherwise. |
| `lib/stores/aiStore.js` | Modify | Add `autoDetectIUCNOnTitleBlur` flag + `setAutoDetectIUCN`; persist via `partialize`. |
| `components/admin/settings/AIProviderSettings.jsx` | Modify | Add a toggle for `autoDetectIUCNOnTitleBlur`. |
| `components/admin/editor/IUCNPanel.jsx` | Create | Sidebar `FlatCard` showing status, scientific name, verified badge, three action buttons. |
| `components/admin/PostEditor.jsx` | Modify | Add IUCN draft state + autosave keys; render `<IUCNPanel>`; wire title `onBlur` autodetect. |
| `components/admin/editor/AIWritingToolkit.jsx` | Modify | After `full_article` stream completes, fire-and-forget `iucn_detect` and lift result to PostEditor via callback. |
| `app/redlist/page.jsx` | Create | Server component. Fetches `db.posts.listAllForRedlist()`. Hero + filter row + `IUCNCard` grid. |
| `app/redlist/opengraph-image.jsx` | Create | OG image for `/redlist`. |
| `components/nav/MobileMenu.jsx` | Modify | Add hardcoded "IUCN Red List" entry alongside categories. |
| `components/nav/Navbar.jsx` | Modify | Add hardcoded "IUCN Red List" entry alongside categories. |

---

## Task 1: Migration 010 — schema columns

**Files:**
- Create: `supabase/migrations/010_iucn_redlist.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/010_iucn_redlist.sql`:

```sql
-- 010_iucn_redlist.sql
-- IUCN Red List feature — adds scientific name and verification metadata.
-- Frontend filtering via /redlist page benefits from a partial index on iucn_status.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS scientific_name   TEXT,
  ADD COLUMN IF NOT EXISTS iucn_verified     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iucn_verified_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS posts_iucn_status_idx
  ON posts (iucn_status)
  WHERE iucn_status IS NOT NULL;
```

- [ ] **Step 2: Apply the migration**

Run via Supabase CLI or paste into the Supabase SQL editor against the project's database. The exact apply mechanism is the same one used for migrations 001–009 — follow the project's existing convention.

- [ ] **Step 3: Verify**

```sql
\d posts
-- Expect: scientific_name TEXT, iucn_verified BOOLEAN NOT NULL DEFAULT false,
--         iucn_verified_at TIMESTAMPTZ
\di posts_iucn_status_idx
-- Expect: index exists, partial WHERE clause shown
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/010_iucn_redlist.sql
git commit -m "feat(db): migration 010 - IUCN Red List columns and partial index"
```

---

## Task 2: db.js extensions — column whitelist, mappers, listAllForRedlist

**Files:**
- Modify: `lib/storage/db.js`

- [ ] **Step 1: Extend `POST_COLUMNS` whitelist**

Open `lib/storage/db.js`. Find the `POST_COLUMNS` set (around line 66). Add the three new columns:

```js
const POST_COLUMNS = new Set([
  'id', 'slug', 'title', 'body', 'category', 'label', 'description',
  'excerpt', 'cover', 'cover_palette', 'featured', 'status', 'views',
  'iucn_status', 'tags', 'author_id',
  'meta_title', 'meta_description', 'meta_keywords',
  'publish_date', 'created_at', 'updated_at',
  // IUCN Red List feature (migration 010)
  'scientific_name', 'iucn_verified', 'iucn_verified_at',
]);
```

- [ ] **Step 2: Extend `postToDb` (camelCase → snake_case)**

Find `postToDb` (around line 74). Update the destructure and the if-blocks that follow:

```js
function postToDb(payload) {
  const {
    coverPalette, iucnStatus, createdAt, updatedAt,
    metaTitle, metaDesc, metaKw, publishDate, authorId,
    scientificName, iucnVerified, iucnVerifiedAt,
    ...rest
  } = payload;

  const row = {};
  for (const [k, v] of Object.entries(rest)) {
    if (POST_COLUMNS.has(k)) row[k] = v;
  }
  if (coverPalette     !== undefined) row.cover_palette    = coverPalette;
  if (iucnStatus       !== undefined) row.iucn_status      = iucnStatus;
  if (metaTitle        !== undefined) row.meta_title       = metaTitle;
  if (metaDesc         !== undefined) row.meta_description = metaDesc;
  if (metaKw           !== undefined) row.meta_keywords    = metaKw;
  if (publishDate      !== undefined) row.publish_date     = publishDate || null;
  if (authorId         !== undefined) row.author_id        = authorId;
  if (scientificName   !== undefined) row.scientific_name  = scientificName;
  if (iucnVerified     !== undefined) row.iucn_verified    = !!iucnVerified;
  if (iucnVerifiedAt   !== undefined) row.iucn_verified_at = iucnVerifiedAt;
  return row;
}
```

- [ ] **Step 3: Extend `mapPostFromDb` (snake_case → camelCase)**

Find `mapPostFromDb` (around line 98). Update the destructure and return:

```js
function mapPostFromDb(row) {
  if (!row) return null;
  const {
    cover_palette, iucn_status, created_at, updated_at,
    meta_title, meta_description, meta_keywords, publish_date, author_id,
    scientific_name, iucn_verified, iucn_verified_at,
    ...rest
  } = row;
  return {
    ...rest,
    coverPalette:    cover_palette,
    iucnStatus:      iucn_status,
    createdAt:       created_at,
    updatedAt:       updated_at,
    metaTitle:       meta_title,
    metaDesc:        meta_description,
    metaKw:          meta_keywords,
    publishDate:     publish_date,
    authorId:        author_id,
    scientificName:  scientific_name,
    iucnVerified:    !!iucn_verified,
    iucnVerifiedAt:  iucn_verified_at,
  };
}
```

- [ ] **Step 4: Add `posts.listAllForRedlist()` method**

Find the existing `posts.listAllWithIUCN()` method (around line 250). Add a new sibling method right below it:

```js
  async listAllWithIUCN() {
    const { data } = await getDb().from('posts').select('*').not('iucn_status', 'is', null).order('created_at', { ascending: false });
    return (data || []).map(mapPostFromDb);
  },

  async listAllForRedlist() {
    // Posts that are either (a) IUCN-statused species OR (b) explicitly
    // tagged with the curated "IUCN Redlist" label (topical lists / articles).
    const { data } = await getDb()
      .from('posts')
      .select('*')
      .or('iucn_status.not.is.null,label.ilike.IUCN Redlist')
      .order('created_at', { ascending: false });
    return (data || []).map(mapPostFromDb);
  },
```

- [ ] **Step 5: Verify**

```bash
npm run lint
```
Expected: zero new errors related to `db.js`.

Quick console verify (paste into Supabase SQL editor):
```sql
SELECT id, title, iucn_status, scientific_name, iucn_verified
FROM posts
WHERE iucn_status IS NOT NULL OR label ILIKE 'IUCN Redlist'
LIMIT 5;
```

- [ ] **Step 6: Commit**

```bash
git add lib/storage/db.js
git commit -m "feat(db): persist scientific_name + iucn_verified, add listAllForRedlist"
```

---

## Task 3: Add NE (Not Evaluated) status to iucnConfig

**Files:**
- Modify: `components/iucn/iucnConfig.js`

- [ ] **Step 1: Append the `NE` entry to `IUCN_CONFIG`**

Open `components/iucn/iucnConfig.js`. The file ends with the `DD` entry. Add `NE` immediately before the closing `};`:

```js
  DD: {
    code: 'DD',
    label: 'Data Deficient',
    shortDesc: 'Inadequate information to assess risk of extinction',
    longDesc: 'Data Deficient species lack adequate information to make a direct or indirect assessment of their risk of extinction. Their true conservation status remains uncertain — they may be threatened, or they may be relatively secure. More research, field surveys, and data collection are urgently needed to reveal their situation.',
    color: '#5858a0',
    textColor: '#9898d0',
    badgeBg: 'rgba(12,12,40,0.92)',
    glow: 'rgba(88,88,160,0.28)',
    rowAccent: '#404080',
  },
  NE: {
    code: 'NE',
    label: 'Not Evaluated',
    shortDesc: 'Not yet assessed against the IUCN Red List criteria',
    longDesc: 'Not Evaluated species have not yet been assessed against the IUCN Red List criteria. Their conservation status is unknown — they may be common and secure, or they may be at risk. Formal assessment is the prerequisite for prioritisation, funding, and protection.',
    color: '#6b7280',
    textColor: '#9ca3af',
    badgeBg: 'rgba(20,20,28,0.92)',
    glow: 'rgba(107,114,128,0.22)',
    rowAccent: '#4b5563',
  },
};
```

- [ ] **Step 2: Update `IUCN_ORDER`**

Same file, last line:

```js
export const IUCN_ORDER = ['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE'];
```

- [ ] **Step 3: Verify**

Start the dev server: `npm run dev`. Visit `/` (homepage). The IUCN section should now show 9 status buttons including a muted-grey "NE" pill (count `0 spp` until any post uses it).

- [ ] **Step 4: Commit**

```bash
git add components/iucn/iucnConfig.js
git commit -m "feat(iucn): add NE (Not Evaluated) status to config and order"
```

---

## Task 4: ANIMALS_SYSTEM prompt + helpers + dispatch

**Files:**
- Modify: `app/api/ai/write/route.js`

- [ ] **Step 1: Add `isAnimalsPost` helper**

Open `app/api/ai/write/route.js`. Find `isArticlesPost` (around line 156). Add `isAnimalsPost` immediately after it:

```js
function isAnimalsPost(category, label) {
  const cat = (category || '').trim().toLowerCase();
  const lbl = (label || '').trim().toLowerCase();
  // ANIMALS_SYSTEM is for single-species articles only.
  // The "IUCN Redlist" label is reserved for curated/topical posts and falls
  // through to WILDLIFE_SYSTEM. A dedicated topical-list system can be added
  // later without touching this gate.
  return cat === 'animals' && [
    'mammals', 'reptiles', 'amphibians', 'fish',
  ].includes(lbl);
}
```

- [ ] **Step 2: Add `ANIMALS_SYSTEM` constant**

Find the `ARTICLES_SYSTEM` constant (around line 296) and add `ANIMALS_SYSTEM` immediately after it (before `function buildArticlesPrompt`):

```js
const ANIMALS_SYSTEM = `You are an advanced AI wildlife content generation engine integrated inside a CMS. You are simultaneously a world-class wildlife scientist, documentary storyteller, ecological analyst, and SEO strategist. You produce deeply immersive, scientifically accurate, emotionally engaging, authority-level wildlife species articles.

POST REQUIREMENTS
- Word count: 6500+ words
- Topic: a single wildlife species (mammal, reptile, amphibian, or fish)
- Tone: documentary storytelling, scientific, deep ecological analysis, immersive narrative
- Goal: build authority-level wildlife content; deliver realistic behavioural and ecological analysis; create emotional and visual immersion

TITLE RULE (HARD CONSTRAINT)
The H1 must be exactly the format "Common Name (Scientific name)" — for example "African Elephant (Loxodonta africana)". No SEO clickbait. Do not write "The Amazing Life of …", "Why … Are Important", "Discover the Secret World of …", "Inside the World of …", or any emotional/marketing phrasing. Encyclopedia / documentary style only. If the supplied title contains clickbait, rewrite it to the canonical "Common Name (Scientific name)" form.

SEO OPTIMISATION (mandatory)
- Identify a primary keyword from the species, plus 3–5 secondary keywords and 5–8 semantic LSI keywords. Distribute naturally across introduction, several H2 sections, and conclusion. Never keyword-stuff.
- Use SEO-friendly heading hierarchy (<h1>, <h2>, <h3>), short readable paragraphs, natural keyword placement.

CORE WRITING PRINCIPLE
The article must feel simultaneously like a high-end wildlife documentary, a scientific field study, a storytelling experience, and an ecological exploration. Deeply explore: true behaviour, environmental interaction, predator-prey relationships, ecological role, survival psychology, adaptation mechanisms, social dynamics.

DEPTH REQUIREMENT
Do NOT write surface-level explanations. Analyse WHY the animal behaves as it does, HOW environment shapes behaviour, predator-prey relationships, territory behaviour, seasonal changes, communication systems, intelligence and emotional behaviour, parenting and hierarchy, ecological role.

MANDATORY 18-SECTION STRUCTURE (never skip a section, keep this exact order)
1. Introduction — vivid wildlife scene, emotional/visual immersion, introduce the species naturally.
2. Scientific Classification — scientific name + Kingdom / Phylum / Class / Order / Family / Genus / Species (use a <ul> of <li> rows with <strong> labels).
3. Physical Characteristics — size, weight, body structure, colours and patterns, sensory adaptations.
4. Habitat & Geographic Distribution — ecosystems, climate, migration ranges, environmental preferences.
5. Behaviour & Social Structure — group dynamics, dominance hierarchy, territorial behaviour, communication systems, emotional and intelligence traits.
6. Daily Life & Activity Cycle — hunting patterns, sleeping behaviour, movement patterns, seasonal behaviour.
7. Diet & Survival Strategies — feeding behaviour, hunting methods, competition, adaptation to food scarcity.
8. Interaction with Other Animals — predator/prey, cooperation, competition, symbiosis, conflict.
9. Interaction with Environment — relationship with habitat, ecological dependence, impact on vegetation/water/balance, climate adaptation.
10. Reproduction & Parenting — courtship, mating, birth, parenting, juvenile survival.
11. Evolutionary Adaptations — camouflage, defence, speed, intelligence, specialised anatomy.
12. Ecological Importance — ecosystem role, keystone impact, population control, environmental balance.
13. Threats & Conservation — habitat destruction, human conflict, climate change, poaching; mention IUCN status briefly here, then expand in section 14.
14. IUCN Red List Analysis — DEDICATED H2 with six H3 sub-sections in this exact order:
    <h3>Current IUCN Status</h3>     — official category + scientific explanation of the classification
    <h3>Population Trend</h3>        — increasing / stable / decreasing, estimated population if known, historical decline or recovery
    <h3>Main Threats</h3>            — habitat destruction, poaching, climate change, human conflict, pollution, disease, invasive species — explain how each affects survival
    <h3>Ecological Consequences</h3> — what happens if population declines further, ecosystem imbalance risks, predator/prey impact, biodiversity consequences
    <h3>Conservation Efforts</h3>    — protected areas, breeding programmes, government efforts, NGO projects, international protections
    <h3>Future Outlook</h3>          — chances of recovery, future risks, long-term survival outlook
    Tone: scientific but understandable, deep ecological analysis, realistic and factual, documentary-style.
15. Human Relationship — cultural significance, tourism impact, human-wildlife conflict, historical relationship.
16. Unique & Rare Facts — rare behaviour, scientific discoveries, unexpected abilities (5–10 items, can use <ul>).
17. Conclusion — powerful emotional closing, reinforce ecological importance, leave a memorable impression.
18. Frequently Asked Questions — 6–12 real search-intent questions as <h3> headings with short 1–3 paragraph answers each. Schema-friendly, conversational phrasing, primary keyword naturally placed. Do not invent irrelevant questions. Examples of good shape: "What do African elephants eat?", "How long do Siberian tigers live?", "Are Nile crocodiles dangerous to humans?"

WRITING TECHNIQUES
- Deep storytelling, ecological analysis, cause-and-effect reasoning, scientific realism, sensory description, behavioural interpretation.

STYLE RULES
- Clear but advanced English, professional documentary tone, cinematic descriptions, smooth transitions.
- No robotic writing. No AI-sounding clichés ("delve", "nuanced", "comprehensive", "robust", "in today's world", "as we explore", etc.).

QUALITY CONTROL
- Scientific realism, ecological depth, emotional engagement, storytelling quality, SEO optimisation.
- Do NOT create shallow explanations. Do NOT repeat unnecessarily. Do NOT skip ecological interaction. Each species article must feel unique.

FORMAT
- Output clean HTML only — never markdown.
- Open with <h1> in the exact "Common Name (Scientific name)" form.
- Use <h2> for each of the 18 main sections; <h3> for sub-sections (especially in section 14 — IUCN Red List Analysis).
- Use <p> for paragraphs, <ul>/<li> for lists where appropriate (Scientific Classification, Unique Facts).
- Do not include <html>, <head>, or <body> wrappers — output the article body fragment only.
- Ready to publish, no commentary outside the article.`;
```

- [ ] **Step 3: Add `buildAnimalsPrompt` helper**

Find `buildArticlesPrompt` (around line 358). Add `buildAnimalsPrompt` immediately after it:

```js
function buildAnimalsPrompt(title, context) {
  const t = title?.trim();
  const sci = context?.scientificName?.trim();
  const status = context?.iucnStatus;

  const iucnHint = status
    ? `\n\nThe species' IUCN Red List category is **${status}**. Use this exact status in section 14 — do not invent a different status.${sci ? ` Scientific name: ${sci}.` : ''}`
    : '\n\nIf the species has an official IUCN Red List status, identify it from your knowledge and use it accurately in section 14. If the species has not been assessed, mark as NE (Not Evaluated) and explain the lack of assessment.';

  return `Write a complete 6500+ word authority-level wildlife species article${t ? ` titled "${t}"` : ''}.

TITLE RULE (HARD): The H1 must be exactly the format "Common Name (Scientific name)" — for example "African Elephant (Loxodonta africana)". No SEO clickbait, no "Amazing", "Discover", "Secret World", "Inside the World", "Why … Are Important", emotional headlines, or extra phrases. Encyclopedia/documentary style only. If the supplied title is not in the canonical form, rewrite it to that form before using it as the <h1>.

Follow the mandatory 18-section structure exactly:
1.  <h2>Introduction</h2>
2.  <h2>Scientific Classification</h2>
3.  <h2>Physical Characteristics</h2>
4.  <h2>Habitat & Geographic Distribution</h2>
5.  <h2>Behaviour & Social Structure</h2>
6.  <h2>Daily Life & Activity Cycle</h2>
7.  <h2>Diet & Survival Strategies</h2>
8.  <h2>Interaction with Other Animals</h2>
9.  <h2>Interaction with Environment</h2>
10. <h2>Reproduction & Parenting</h2>
11. <h2>Evolutionary Adaptations</h2>
12. <h2>Ecological Importance</h2>
13. <h2>Threats & Conservation</h2>
14. <h2>IUCN Red List Analysis</h2>
    <h3>Current IUCN Status</h3>
    <h3>Population Trend</h3>
    <h3>Main Threats</h3>
    <h3>Ecological Consequences</h3>
    <h3>Conservation Efforts</h3>
    <h3>Future Outlook</h3>
15. <h2>Human Relationship</h2>
16. <h2>Unique & Rare Facts</h2>
17. <h2>Conclusion</h2>
18. <h2>Frequently Asked Questions</h2> (6–12 questions, each as <h3>, with 1–3 paragraph short answers; FAQ-schema-friendly; conversational phrasing; primary keyword naturally placed)
${iucnHint}

Output clean HTML only. Begin immediately with the <h1> title — no preamble.`;
}
```

- [ ] **Step 4: Wire into the POST handler dispatch**

Find the POST handler block where the existing template flags are computed (around lines 536–540). Add the Animals flag, then add the dispatch branch:

```js
    // Existing flags above this line:
    // const useHowTemplate = ...
    // const useWhyTemplate = ...
    // const useConservationTemplate = ...
    // const useTourismTemplate = ...
    // const useArticlesTemplate = ...
    const useAnimalsTemplate = task === 'full_article' && isAnimalsPost(context.category, effectiveLabel);

    let systemPrompt = WILDLIFE_SYSTEM;
    let userPrompt = buildPrompt(task, context);
    let maxTokens = task === 'full_article' ? 8000 : 2000;

    if (useHowTemplate) {
      systemPrompt = HOW_QUESTIONS_SYSTEM;
      userPrompt = buildHowQuestionsPrompt(context.title);
      maxTokens = 4000;
    } else if (useWhyTemplate) {
      systemPrompt = WHY_QUESTIONS_SYSTEM;
      userPrompt = buildWhyQuestionsPrompt(context.title);
      maxTokens = 5000;
    } else if (useConservationTemplate) {
      systemPrompt = CONSERVATION_SYSTEM;
      userPrompt = buildConservationPrompt(context.title);
      maxTokens = 7000;
    } else if (useTourismTemplate) {
      systemPrompt = TOURISM_SYSTEM;
      userPrompt = buildTourismPrompt(context.title);
      maxTokens = 6000;
    } else if (useArticlesTemplate) {
      systemPrompt = ARTICLES_SYSTEM;
      userPrompt = buildArticlesPrompt(context.title);
      maxTokens = 9000;
    } else if (useAnimalsTemplate) {
      systemPrompt = ANIMALS_SYSTEM;
      userPrompt = buildAnimalsPrompt(context.title, context);
      maxTokens = 14000; // 6500 words ≈ 8500 tokens + headroom
    }
```

The `useAnimalsTemplate` branch is the new one. The other branches remain unchanged.

- [ ] **Step 5: Verify (lint only — full integration test in Task 5)**

```bash
npm run lint
```
Expected: zero new errors related to `route.js`.

- [ ] **Step 6: Commit**

```bash
git add app/api/ai/write/route.js
git commit -m "feat(ai): ANIMALS_SYSTEM prompt with FAQ + IUCN Analysis sections"
```

---

## Task 5: `iucn_detect` task in the AI write route

**Files:**
- Modify: `app/api/ai/write/route.js`

- [ ] **Step 1: Add imports**

At the top of `route.js`, after the existing `import { streamText } from 'ai';` line, add:

```js
import { streamText, generateObject } from 'ai';
import { z } from 'zod';
```

(If `streamText` is already imported on its own, replace that line with the multi-import; if `z` is not in `package.json`, run `npm install zod` first — but `zod` is already a dependency per the package.json read.)

- [ ] **Step 2: Add `IUCN_DETECT_SYSTEM` and `IUCN_SCHEMA`**

Place these constants near the top, after the existing system prompts but before the helpers. A natural spot is right after `ANIMALS_SYSTEM` (added in Task 4):

```js
const IUCN_SCHEMA = z.object({
  iucnStatus: z.enum(['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE']),
  scientificName: z.string().nullable(),
  commonName: z.string().nullable(),
  populationTrend: z.enum(['increasing', 'stable', 'decreasing', 'unknown']),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string(),
});

const IUCN_DETECT_SYSTEM = `You are a conservation biologist with full knowledge of the IUCN Red List of Threatened Species.

Given a wildlife article title and (optionally) the article body, identify the species and return its current IUCN Red List category as JSON.

Rules:
- Return ONLY one of: EX, EW, CR, EN, VU, NT, LC, DD, NE.
- Never invent a status. If you are not confident, return DD with confidence: 'low'.
- If the input describes a topical / multi-species article (e.g. "Top 10 Critically Endangered Mammals") rather than a single species, return NE with confidence: 'low' and explain in reasoning.
- scientificName must be the binomial Latin name (e.g. "Panthera tigris"). null if not derivable from the input.
- commonName is the everyday English name. null if not derivable.
- populationTrend must reflect the latest IUCN assessment if known, else 'unknown'.
- confidence: 'high' for textbook/iconic species, 'medium' for lesser-known, 'low' for obscure or genus-only inputs.
- reasoning: 1–2 sentences citing why you chose this status.`;
```

- [ ] **Step 3: Short-circuit the `iucn_detect` task**

In the POST handler, after the `model = ...` resolution but BEFORE the `useHowTemplate` flag computation, add the short-circuit:

```js
    if (task === 'iucn_detect') {
      const bodyText = (context.body || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);
      const { object } = await generateObject({
        model,
        system: IUCN_DETECT_SYSTEM,
        schema: IUCN_SCHEMA,
        prompt: `Title: ${context.title || '(no title supplied)'}\n\nFirst 500 chars of body:\n${bodyText || '(empty)'}`,
        temperature: 0.2,
      });
      return Response.json(object);
    }
```

The exact insertion point: just inside the `try { ... }` block of the POST handler, after the model is selected and before the existing `effectiveLabel` and template-flag work begins. Refer to lines around 530–540 of `route.js` for context.

- [ ] **Step 4: Verify with curl**

Start the dev server: `npm run dev`. In another terminal:

```bash
curl -X POST http://localhost:3001/api/ai/write \
  -H "Content-Type: application/json" \
  -d '{
    "task": "iucn_detect",
    "provider": "claude",
    "model": "claude-opus-4-7",
    "context": {
      "title": "African Elephant (Loxodonta africana)",
      "body": "",
      "category": "animals",
      "label": "Mammals"
    }
  }'
```

Expected JSON (status will vary by latest IUCN assessment knowledge):
```json
{
  "iucnStatus": "EN",
  "scientificName": "Loxodonta africana",
  "commonName": "African Elephant",
  "populationTrend": "decreasing",
  "confidence": "high",
  "reasoning": "..."
}
```

Try a topical post:
```bash
curl -X POST http://localhost:3001/api/ai/write \
  -H "Content-Type: application/json" \
  -d '{
    "task": "iucn_detect",
    "provider": "claude",
    "model": "claude-opus-4-7",
    "context": {
      "title": "Top 10 Critically Endangered Mammals",
      "body": "",
      "category": "animals",
      "label": "IUCN Redlist"
    }
  }'
```

Expected: `iucnStatus: "NE"`, `confidence: "low"`, reasoning explains it's a topical article.

- [ ] **Step 5: Commit**

```bash
git add app/api/ai/write/route.js
git commit -m "feat(ai): iucn_detect task returning structured IUCN status JSON"
```

---

## Task 6: `/api/iucn/verify` route

**Files:**
- Create: `app/api/iucn/verify/route.js`

- [ ] **Step 1: Write the route**

Create `app/api/iucn/verify/route.js`:

```js
// IUCN Red List API v4 verification endpoint.
// Requires IUCN_API_TOKEN in env. When the token is missing, returns
// { verified: false, reason: 'no-token' } so the UI silently falls back
// to AI-detected values without surfacing an error.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const IUCN_API_BASE = 'https://api.iucnredlist.org/api/v4';

export async function POST(req) {
  try {
    const { scientificName, postId } = await req.json();

    if (!scientificName || typeof scientificName !== 'string') {
      return NextResponse.json({ verified: false, reason: 'no-scientific-name' }, { status: 400 });
    }

    const token = process.env.IUCN_API_TOKEN;
    if (!token) {
      return NextResponse.json({ verified: false, reason: 'no-token' });
    }

    // IUCN API v4 species lookup by scientific name. The exact endpoint
    // shape may evolve — confirm against current IUCN docs at
    // https://api.iucnredlist.org/ when implementing.
    const [genus, species] = scientificName.trim().split(/\s+/);
    if (!genus || !species) {
      return NextResponse.json({ verified: false, reason: 'invalid-scientific-name' });
    }

    const url = `${IUCN_API_BASE}/taxa/scientific_name?genus_name=${encodeURIComponent(genus)}&species_name=${encodeURIComponent(species)}`;
    const apiRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (apiRes.status === 404) {
      return NextResponse.json({ verified: false, reason: 'not-found' });
    }
    if (!apiRes.ok) {
      console.error('[iucn/verify] API error', apiRes.status, await apiRes.text().catch(() => ''));
      return NextResponse.json({ verified: false, reason: 'api-error' });
    }

    const data = await apiRes.json();
    // Defensive shape — IUCN response may include nested assessments.
    // We pick the most-recent assessment's category code.
    const assessments = data?.assessments || data?.taxon?.assessments || [];
    const latest = Array.isArray(assessments) && assessments.length
      ? [...assessments].sort((a, b) => (b.year_published || 0) - (a.year_published || 0))[0]
      : null;
    const officialStatus = latest?.red_list_category?.code || data?.red_list_category?.code || null;
    const populationTrend = latest?.population_trend || data?.population_trend || 'unknown';
    const lastAssessmentYear = latest?.year_published || null;
    const assessmentId = latest?.assessment_id || null;

    if (!officialStatus) {
      return NextResponse.json({ verified: false, reason: 'no-assessment' });
    }

    // Persist verification on the post row, if a postId was supplied.
    if (postId) {
      try {
        const supabase = await createClient();
        await supabase.from('posts').update({
          iucn_status: officialStatus,
          iucn_verified: true,
          iucn_verified_at: new Date().toISOString(),
          scientific_name: scientificName,
        }).eq('id', postId);
      } catch (err) {
        console.warn('[iucn/verify] persistence failed (non-fatal):', err?.message);
      }
    }

    return NextResponse.json({
      verified: true,
      officialStatus,
      populationTrend,
      lastAssessmentYear,
      assessmentId,
    });
  } catch (err) {
    console.error('[iucn/verify]', err);
    return NextResponse.json({ verified: false, reason: 'api-error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify (no token path)**

With `IUCN_API_TOKEN` unset:

```bash
curl -X POST http://localhost:3001/api/iucn/verify \
  -H "Content-Type: application/json" \
  -d '{"scientificName":"Panthera leo"}'
```

Expected:
```json
{ "verified": false, "reason": "no-token" }
```

- [ ] **Step 3: Verify (with token, when available)**

Once `IUCN_API_TOKEN` is set in `.env.local`, repeat the curl. Expected:
```json
{
  "verified": true,
  "officialStatus": "VU",
  "populationTrend": "decreasing",
  "lastAssessmentYear": 2023,
  "assessmentId": 15951
}
```

(Exact values depend on the latest IUCN assessment.)

- [ ] **Step 4: Commit**

```bash
git add app/api/iucn/verify/route.js
git commit -m "feat(api): /api/iucn/verify with IUCN Red List v4 + silent no-token fallback"
```

---

## Task 7: aiStore extensions + AIProviderSettings toggle

**Files:**
- Modify: `lib/stores/aiStore.js`
- Modify: `components/admin/settings/AIProviderSettings.jsx`

- [ ] **Step 1: Add `autoDetectIUCNOnTitleBlur` to aiStore state**

Open `lib/stores/aiStore.js`. Find the SEO block (around line 64). Add a new IUCN block right after the SEO block, before the "Editor AI extensions" comment:

```js
  // ── IUCN ──────────────────────────────────────────────────
  autoDetectIUCNOnTitleBlur: false,
  setAutoDetectIUCN: (v) => set({ autoDetectIUCNOnTitleBlur: !!v }),

  // ── Editor AI extensions (rewrite, proof, plagiarism, headlines) ──
```

- [ ] **Step 2: Persist the flag**

Same file. Find `partialize` (around line 149). Add `autoDetectIUCNOnTitleBlur` to the persisted keys:

```js
      partialize: (s) => ({
        provider: s.provider,
        claudeModel: s.claudeModel,
        openaiModel: s.openaiModel,
        openaiTtsModel: s.openaiTtsModel,
        openaiTtsVoice: s.openaiTtsVoice,
        openaiTranscribeModel: s.openaiTranscribeModel,
        openaiImageModel: s.openaiImageModel,
        geminiTextModel: s.geminiTextModel,
        geminiImageModel: s.geminiImageModel,
        selectedTones: s.selectedTones,
        toneIntensity: s.toneIntensity,
        audioVoice: s.audioVoice,
        audioSpeed: s.audioSpeed,
        autoDetectIUCNOnTitleBlur: s.autoDetectIUCNOnTitleBlur,
      }),
```

- [ ] **Step 3: Add toggle to `AIProviderSettings`**

Open `components/admin/settings/AIProviderSettings.jsx`. Find the existing list of toggles/options (Claude vs OpenAI, etc.). Add a new section near the bottom — adapt the styling to match what's already in the file:

```jsx
{/* IUCN auto-detect toggle */}
<div style={{
  marginTop: 16, padding: 12, borderRadius: 9,
  border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
}}>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--adm-text)' }}>
        Auto-detect IUCN status on title blur
      </div>
      <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 2 }}>
        For Animals / Birds / Insects categories. Fires when you finish typing a title containing a scientific name in parentheses.
      </div>
    </div>
    <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20 }}>
      <input
        type="checkbox"
        checked={!!store.autoDetectIUCNOnTitleBlur}
        onChange={(e) => store.setAutoDetectIUCN(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span style={{
        position: 'absolute', cursor: 'pointer', inset: 0,
        background: store.autoDetectIUCNOnTitleBlur ? '#7c3aed' : 'var(--adm-border)',
        transition: '0.2s', borderRadius: 999,
      }}>
        <span style={{
          position: 'absolute', height: 16, width: 16, left: 2, top: 2,
          background: '#fff', transition: '0.2s', borderRadius: '50%',
          transform: store.autoDetectIUCNOnTitleBlur ? 'translateX(16px)' : 'translateX(0)',
        }} />
      </span>
    </label>
  </div>
</div>
```

If the component doesn't already destructure the store, ensure `const store = useAIStore();` is present near the top of the component.

- [ ] **Step 4: Verify**

```bash
npm run dev
```
Visit `/admin/settings` (or wherever AIProviderSettings is rendered). Toggle the new switch on/off, refresh the page — the value should persist (localStorage).

- [ ] **Step 5: Commit**

```bash
git add lib/stores/aiStore.js components/admin/settings/AIProviderSettings.jsx
git commit -m "feat(ai): aiStore.autoDetectIUCNOnTitleBlur + settings toggle"
```

---

## Task 8: `IUCNPanel` sidebar component

**Files:**
- Create: `components/admin/editor/IUCNPanel.jsx`

- [ ] **Step 1: Write the component**

Create `components/admin/editor/IUCNPanel.jsx`:

```jsx
'use client';

import { useState, useCallback } from 'react';
import { Shield, Sparkles, ShieldCheck, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { IUCN_CONFIG } from '@/components/iucn/iucnConfig';
import { useAIStore } from '@/lib/stores/aiStore';

const PURPLE = '#7c3aed';

const TREND_ICON = {
  increasing: TrendingUp,
  decreasing: TrendingDown,
  stable: Minus,
  unknown: Minus,
};

const TREND_COLOR = {
  increasing: '#22c55e',
  decreasing: '#ef4444',
  stable: '#f59e0b',
  unknown: 'var(--adm-text-subtle)',
};

const IN_SCOPE_CATEGORIES = new Set(['animals', 'birds', 'insects']);

/**
 * Sidebar panel for setting the IUCN Red List status on a post.
 * Renders only when `category` is animals / birds / insects.
 *
 * Props:
 *   category, label, title, body                           — from PostEditor
 *   iucnStatus, scientificName, iucnVerified, iucnVerifiedAt
 *   populationTrend, confidence                            — local UI state, lifted up
 *   onChange({iucnStatus?, scientificName?, iucnVerified?, iucnVerifiedAt?})
 */
export function IUCNPanel({
  category,
  label,
  title,
  body,
  iucnStatus,
  scientificName,
  iucnVerified,
  iucnVerifiedAt,
  onChange,
}) {
  const store = useAIStore();
  const [detecting, setDetecting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [populationTrend, setPopulationTrend] = useState('unknown');
  const [confidence, setConfidence] = useState(null);
  const [reasoning, setReasoning] = useState('');
  const [verifyReason, setVerifyReason] = useState(null);

  const inScope = IN_SCOPE_CATEGORIES.has((category || '').toLowerCase());

  const runDetect = useCallback(async () => {
    if (detecting) return;
    setDetecting(true);
    setVerifyReason(null);
    try {
      const res = await fetch('/api/ai/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'iucn_detect',
          provider: store.provider,
          model: store.getCurrentTextModel(),
          context: { title, body, category, label },
        }),
      });
      if (!res.ok) throw new Error(`detect failed: ${res.status}`);
      const data = await res.json();
      setPopulationTrend(data.populationTrend || 'unknown');
      setConfidence(data.confidence || null);
      setReasoning(data.reasoning || '');
      onChange({
        iucnStatus: data.iucnStatus || null,
        scientificName: data.scientificName || null,
        iucnVerified: false,
        iucnVerifiedAt: null,
      });
    } catch (err) {
      console.error('[IUCNPanel] detect failed', err);
    } finally {
      setDetecting(false);
    }
  }, [detecting, title, body, category, label, store, onChange]);

  const runVerify = useCallback(async () => {
    if (verifying || !scientificName) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/iucn/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scientificName }),
      });
      const data = await res.json();
      if (data.verified) {
        onChange({
          iucnStatus: data.officialStatus,
          iucnVerified: true,
          iucnVerifiedAt: new Date().toISOString(),
        });
        setPopulationTrend(data.populationTrend || 'unknown');
        setVerifyReason(null);
      } else {
        setVerifyReason(data.reason || 'unknown');
      }
    } catch (err) {
      console.error('[IUCNPanel] verify failed', err);
      setVerifyReason('api-error');
    } finally {
      setVerifying(false);
    }
  }, [verifying, scientificName, onChange]);

  const clear = useCallback(() => {
    setPopulationTrend('unknown');
    setConfidence(null);
    setReasoning('');
    setVerifyReason(null);
    onChange({
      iucnStatus: null,
      scientificName: null,
      iucnVerified: false,
      iucnVerifiedAt: null,
    });
  }, [onChange]);

  if (!inScope) return null;

  const cfg = iucnStatus ? IUCN_CONFIG[iucnStatus] : null;
  const TrendIcon = TREND_ICON[populationTrend] || Minus;
  const trendColor = TREND_COLOR[populationTrend] || 'var(--adm-text-subtle)';

  return (
    <div
      style={{
        background: 'var(--adm-surface)',
        border: '1px solid var(--adm-border)',
        borderRadius: 12,
        padding: 16,
        boxShadow: 'var(--adm-shadow)',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 7,
          background: `${PURPLE}1a`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: PURPLE, flexShrink: 0,
        }}>
          <Shield size={14} />
        </span>
        <h3 style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--adm-text)' }}>
          IUCN Red List
        </h3>
        {iucnVerified && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 9, fontWeight: 800, color: '#22c55e',
            background: 'rgba(34,197,94,0.12)', padding: '2px 7px',
            borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <ShieldCheck size={9} /> Verified
          </span>
        )}
      </div>

      {/* ── Body ── */}
      {iucnStatus ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 10,
            background: cfg?.badgeBg || 'rgba(20,20,28,0.92)',
            border: `1.5px solid ${cfg?.color || '#888'}80`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: cfg ? `0 0 14px ${cfg.glow}` : 'none',
          }}>
            <span style={{
              fontSize: 16, fontWeight: 900, letterSpacing: '0.08em',
              color: cfg?.textColor || '#fff',
              textShadow: cfg ? `0 0 10px ${cfg.color}80` : 'none',
            }}>{iucnStatus}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--adm-text)' }}>
              {cfg?.label || 'Unknown'}
            </div>
            {scientificName && (
              <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--adm-text-muted)', marginTop: 2 }}>
                {scientificName}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 10, color: trendColor }}>
              <TrendIcon size={11} />
              <span style={{ textTransform: 'capitalize' }}>{populationTrend}</span>
              {confidence && (
                <>
                  <span style={{ color: 'var(--adm-text-subtle)' }}>•</span>
                  <span style={{ color: 'var(--adm-text-subtle)', textTransform: 'capitalize' }}>
                    {confidence} confidence
                  </span>
                </>
              )}
            </div>
            {iucnVerifiedAt && (
              <div style={{ fontSize: 9, color: 'var(--adm-text-subtle)', marginTop: 3 }}>
                Verified {new Date(iucnVerifiedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '10px 12px', borderRadius: 8,
          border: '1px dashed var(--adm-border)',
          fontSize: 11, color: 'var(--adm-text-subtle)', marginBottom: 12,
          lineHeight: 1.5,
        }}>
          No status detected yet. Click <strong>Detect from species</strong> to autofill.
        </div>
      )}

      {reasoning && (
        <div style={{
          fontSize: 10, color: 'var(--adm-text-muted)', marginBottom: 10,
          padding: '7px 9px', background: 'var(--adm-bg)', borderRadius: 6,
          border: '1px solid var(--adm-border)', lineHeight: 1.5,
        }}>
          {reasoning}
        </div>
      )}

      {verifyReason === 'no-token' && (
        <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginBottom: 8 }}>
          Set <code>IUCN_API_TOKEN</code> in env to enable verification.
        </div>
      )}
      {verifyReason && verifyReason !== 'no-token' && (
        <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 8 }}>
          Verification failed: {verifyReason}
        </div>
      )}

      {/* ── Buttons ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          type="button"
          onClick={runDetect}
          disabled={detecting || !title}
          style={{
            padding: '8px 11px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: detecting ? 'var(--adm-hover-bg)' : `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
            color: detecting ? 'var(--adm-text-muted)' : '#fff',
            border: 'none',
            cursor: detecting || !title ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: !title && !detecting ? 0.5 : 1,
          }}
        >
          <Sparkles size={12} />
          {detecting ? 'Detecting…' : 'Detect from species'}
        </button>

        {iucnStatus && scientificName && !iucnVerified && (
          <button
            type="button"
            onClick={runVerify}
            disabled={verifying}
            style={{
              padding: '7px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: 'transparent',
              color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.4)',
              cursor: verifying ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <ShieldCheck size={11} />
            {verifying ? 'Verifying…' : 'Verify against IUCN'}
          </button>
        )}

        {iucnStatus && (
          <button
            type="button"
            onClick={clear}
            style={{
              padding: '6px 11px', borderRadius: 8, fontSize: 10, fontWeight: 600,
              background: 'transparent',
              color: 'var(--adm-text-subtle)',
              border: '1px solid var(--adm-border)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            <X size={10} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify (visual)**

The component is integrated in the next task. For now confirm it imports cleanly:

```bash
npm run lint
```
Expected: zero errors related to `IUCNPanel.jsx`.

- [ ] **Step 3: Commit**

```bash
git add components/admin/editor/IUCNPanel.jsx
git commit -m "feat(admin): IUCNPanel sidebar component with detect/verify/clear"
```

---

## Task 9: PostEditor integration — state, render, title onBlur, autosave

**Files:**
- Modify: `components/admin/PostEditor.jsx`

- [ ] **Step 1: Add IUCN draft state**

Open `components/admin/PostEditor.jsx`. Find the state declarations (multiple `useState` calls near the top of the component, in the same area as `setMetaTitle`, `setMetaDesc`, etc.). Add:

```jsx
  const [iucnStatus, setIucnStatus] = useState(initial?.iucnStatus || null);
  const [scientificName, setScientificName] = useState(initial?.scientificName || null);
  const [iucnVerified, setIucnVerified] = useState(initial?.iucnVerified || false);
  const [iucnVerifiedAt, setIucnVerifiedAt] = useState(initial?.iucnVerifiedAt || null);
```

Place these alongside the other field state — search for a nearby `useState(initial?.metaTitle ...)` line and add the four new lines right next to it.

- [ ] **Step 2: Add IUCNPanel import**

Near the top of the file, with the other editor imports:

```jsx
import { IUCNPanel } from './editor/IUCNPanel';
```

- [ ] **Step 3: Add the `onChange` handler**

Inside the component body, define an `onIUCNChange` callback that lifts state changes from the panel:

```jsx
  const onIUCNChange = useCallback((patch) => {
    if ('iucnStatus' in patch) setIucnStatus(patch.iucnStatus);
    if ('scientificName' in patch) setScientificName(patch.scientificName);
    if ('iucnVerified' in patch) setIucnVerified(!!patch.iucnVerified);
    if ('iucnVerifiedAt' in patch) setIucnVerifiedAt(patch.iucnVerifiedAt);
  }, []);
```

Place near the other `useCallback` blocks (e.g. after `insertVideo`).

- [ ] **Step 4: Render the panel in the right rail**

Find where the right-rail cards are rendered — the file already places `AISEOAssistant`, `AIWritingToolkit`, etc. Add `<IUCNPanel>` between `AISEOAssistant` and the publish/schedule card. Insert in the JSX (search for `<AISEOAssistant`):

```jsx
<AISEOAssistant
  /* ...existing props... */
/>

<IUCNPanel
  category={category}
  label={label}
  title={title}
  body={editor?.getHTML() || ''}
  iucnStatus={iucnStatus}
  scientificName={scientificName}
  iucnVerified={iucnVerified}
  iucnVerifiedAt={iucnVerifiedAt}
  onChange={onIUCNChange}
/>

{/* existing schedule/publish card stays below */}
```

The panel internally returns `null` for non-{animals,birds,insects} categories — no extra conditional needed here.

- [ ] **Step 5: Add title `onBlur` handler for opt-in autodetect**

Find the title `<input>` element. Add `onBlur`:

```jsx
<input
  /* ...existing props... */
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  onBlur={(e) => {
    const ai = useAIStore.getState();
    if (!ai.autoDetectIUCNOnTitleBlur) return;
    const cat = (category || '').toLowerCase();
    if (!['animals', 'birds', 'insects'].includes(cat)) return;
    if (!/\(.+\)/.test(e.target.value)) return; // require scientific name parens
    fetch('/api/ai/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'iucn_detect',
        provider: ai.provider,
        model: ai.getCurrentTextModel(),
        context: { title: e.target.value, body: editor?.getHTML() || '', category, label },
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setIucnStatus(data.iucnStatus || null);
        setScientificName(data.scientificName || null);
        setIucnVerified(false);
        setIucnVerifiedAt(null);
      })
      .catch((err) => console.error('[PostEditor] title-blur iucn detect failed', err));
  }}
/>
```

If `useAIStore` isn't already imported in this file, add at the top:

```jsx
import { useAIStore } from '@/lib/stores/aiStore';
```

- [ ] **Step 6: Persist IUCN fields in the autosave loop**

Find the autosave `useEffect` (around line 391 — uses `localStorage.setItem(draftKey, ...)`). Add the four IUCN fields to the JSON payload:

```jsx
  useEffect(() => {
    autosaveRef.current = setInterval(() => {
      const body = editor?.getHTML() || '';
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          title, slug, category, label, description, excerpt, body,
          cover, palette, featured, tags,
          metaTitle, metaDesc, metaKw, publishDate,
          iucnStatus, scientificName, iucnVerified, iucnVerifiedAt,
        }));
        setSavedAt(new Date());
      } catch (_) {}
    }, 10000);
    return () => clearInterval(autosaveRef.current);
  }, [
    title, slug, category, label, description, excerpt, cover, palette, featured, tags,
    metaTitle, metaDesc, metaKw, publishDate,
    iucnStatus, scientificName, iucnVerified, iucnVerifiedAt,
  ]); // eslint-disable-line
```

- [ ] **Step 7: Restore IUCN fields from draft on mount**

Find the mount `useEffect` that reads `draftKey` (around line 367). Extend it:

```jsx
      if (d.iucnStatus !== undefined) setIucnStatus(d.iucnStatus);
      if (d.scientificName !== undefined) setScientificName(d.scientificName);
      if (d.iucnVerified !== undefined) setIucnVerified(!!d.iucnVerified);
      if (d.iucnVerifiedAt !== undefined) setIucnVerifiedAt(d.iucnVerifiedAt);
```

Place these inside the same try block, alongside the other `if (d.metaTitle !== undefined)` lines.

- [ ] **Step 8: Pass IUCN fields to the save payload**

Find `handleSave` at line 452. The existing payload at lines 465–476 looks like this:

```jsx
const payload = {
  title: title.trim(), slug: slug.trim(), category, label,
  description: description.trim(),
  excerpt: excerpt.trim(),
  body, cover: coverUrl, coverPalette: palette,
  featured, status,
  tags: tags.split(',').map(t => t.trim()).filter(Boolean),
  metaTitle: metaTitle.trim(),
  metaDesc: metaDesc.trim(),
  metaKw: metaKw.trim(),
  publishDate,
};
```

Add the four IUCN fields immediately before the closing brace:

```jsx
const payload = {
  title: title.trim(), slug: slug.trim(), category, label,
  description: description.trim(),
  excerpt: excerpt.trim(),
  body, cover: coverUrl, coverPalette: palette,
  featured, status,
  tags: tags.split(',').map(t => t.trim()).filter(Boolean),
  metaTitle: metaTitle.trim(),
  metaDesc: metaDesc.trim(),
  metaKw: metaKw.trim(),
  publishDate,
  iucnStatus, scientificName, iucnVerified, iucnVerifiedAt,
};
```

`db.js`'s `postToDb` (Task 2) maps these camelCase keys to the new snake_case columns automatically.

- [ ] **Step 9: Verify**

```bash
npm run dev
```

1. Open `/admin/content/animals/new` (or wherever the create-animal route is). Set title to `African Elephant (Loxodonta africana)`, category to Animals, label to Mammals.
2. The IUCN panel should appear in the right rail.
3. Click "Detect from species". After ~2s the panel should show `EN — Endangered` (or current status), scientific name, and a confidence pill.
4. With `autoDetectIUCNOnTitleBlur` enabled in settings, blurring the title should fire the same flow silently.
5. Switch category to Posts → the panel should disappear (returns null).
6. Save the post. Reload — the status should still be visible (loaded from DB after Task 2 wired the mappers).

- [ ] **Step 10: Commit**

```bash
git add components/admin/PostEditor.jsx
git commit -m "feat(admin): wire IUCNPanel + title-blur detect into PostEditor"
```

---

## Task 10: AIWritingToolkit — bundle iucn_detect with full_article generation

**Files:**
- Modify: `components/admin/editor/AIWritingToolkit.jsx`

- [ ] **Step 1: Accept the `onIUCNChange` prop**

Open `components/admin/editor/AIWritingToolkit.jsx`. Find the `AIWritingToolkit` function signature (around line 170) and add `onIUCNChange` to the destructured props:

```jsx
export function AIWritingToolkit({
  editor,
  title,
  wordCount,
  onUseHeadline,
  metaTitle = '',
  metaDescription = '',
  metaKeywords = '',
  category = '',
  label = '',
  excerpt = '',
  cover = null,
  palette = { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' },
  onPaletteChange = () => {},
  postId = null,
  onRestoreVersion = null,
  onIUCNChange = null,
}) {
```

- [ ] **Step 2: Fire the bundled `iucn_detect` after stream completion**

Find `runGeneration` (around line 192). Inside the `try` block, after `store.finishStream()` succeeds, add the bundle:

```jsx
      store.finishStream();

      // Bundle: when a full Animals/Birds/Insects article finishes
      // generating, fire-and-forget an iucn_detect to autofill the sidebar
      // panel. Silent — failures are non-fatal.
      if (
        task === 'full_article' &&
        typeof onIUCNChange === 'function' &&
        ['animals', 'birds', 'insects'].includes((category || '').toLowerCase())
      ) {
        fetch('/api/ai/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: 'iucn_detect',
            provider: store.provider,
            model: store.getCurrentTextModel(),
            context: {
              title,
              body: editor?.getHTML() || '',
              category,
              label,
            },
          }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data) return;
            onIUCNChange({
              iucnStatus: data.iucnStatus || null,
              scientificName: data.scientificName || null,
              iucnVerified: false,
              iucnVerifiedAt: null,
            });
          })
          .catch((err) => console.warn('[Write] post-gen iucn detect failed', err));
      }
```

- [ ] **Step 3: Pass `onIUCNChange` from PostEditor**

Open `components/admin/PostEditor.jsx`. Find where `<AIWritingToolkit ... />` is rendered. Add the prop:

```jsx
<AIWritingToolkit
  /* ...existing props... */
  onIUCNChange={onIUCNChange}
/>
```

- [ ] **Step 4: Verify**

`npm run dev`. Create a new Animals/Mammals post titled `Lion (Panthera leo)`. Click "Generate 4,000+ Word Article" (the AIWritingToolkit Generate button). Wait for the stream to complete. The IUCN panel should populate within ~2s after completion with `VU` (Vulnerable).

- [ ] **Step 5: Commit**

```bash
git add components/admin/editor/AIWritingToolkit.jsx components/admin/PostEditor.jsx
git commit -m "feat(admin): bundle iucn_detect after full_article generation"
```

---

## Task 11: `/redlist` frontend page

**Files:**
- Create: `app/redlist/page.jsx`
- Create: `app/redlist/opengraph-image.jsx`

- [ ] **Step 1: Write the page**

Create `app/redlist/page.jsx`:

```jsx
import { Container } from '@/components/ui/Container';
import { db } from '@/lib/storage/db';
import { IUCN_CONFIG, IUCN_ORDER } from '@/components/iucn/iucnConfig';
import { IUCNCard } from '@/components/iucn/IUCNCard';

export const metadata = {
  title: 'IUCN Red List Species — Wildlife Universe',
  description:
    'Browse all wildlife species classified by the IUCN Red List of Threatened Species, from Extinct to Least Concern. The world\'s most comprehensive inventory of conservation status, since 1964.',
  alternates: { canonical: '/redlist' },
};

export default async function RedListPage() {
  const posts = await db.posts.listAllForRedlist();

  // Group by status. Curated label-only posts (no iucn_status) bucket
  // under "NE" so they still surface but are visually de-emphasised.
  const grouped = {};
  for (const post of posts) {
    const code = post.iucnStatus || 'NE';
    if (!grouped[code]) grouped[code] = [];
    grouped[code].push(post);
  }
  for (const code of Object.keys(grouped)) {
    grouped[code].sort((a, b) => (b.views || 0) - (a.views || 0));
  }

  return (
    <main style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <section style={{ position: 'relative', overflow: 'hidden', padding: '64px 0 32px' }}>
        <Container>
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(40,160,40,0.9)',
              textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 12,
            }}>
              International Union for Conservation of Nature
            </p>
            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, lineHeight: 1.05,
              letterSpacing: '-0.02em', color: 'var(--color-fg)', marginBottom: 16,
            }}>
              IUCN Red List Species
            </h1>
            <p style={{
              fontSize: 16, lineHeight: 1.6, color: 'var(--color-fg-soft)',
            }}>
              The world&apos;s most comprehensive inventory of the global conservation
              status of biological species — updated continuously since 1964. Browse
              every species featured on Wildlife Universe, grouped by official IUCN category.
            </p>
          </div>
        </Container>
      </section>

      <section style={{ padding: '32px 0 96px' }}>
        <Container>
          {IUCN_ORDER.map((code) => {
            const cfg = IUCN_CONFIG[code];
            const list = grouped[code] || [];
            if (!list.length) return null;
            return (
              <div key={code} style={{ marginBottom: 56 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18,
                  paddingLeft: 4, borderLeft: `4px solid ${cfg.color}`,
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '4px 10px', borderRadius: 6,
                    background: cfg.badgeBg, color: cfg.textColor,
                    fontSize: 12, fontWeight: 900, letterSpacing: '0.1em',
                    border: `1px solid ${cfg.color}50`,
                  }}>
                    {cfg.code}
                  </span>
                  <h2 style={{
                    fontSize: 22, fontWeight: 800, color: 'var(--color-fg)',
                    margin: 0,
                  }}>{cfg.label}</h2>
                  <span style={{
                    fontSize: 11, color: 'var(--color-fg-soft)',
                    marginLeft: 'auto',
                  }}>
                    {list.length} {list.length === 1 ? 'species' : 'species'}
                  </span>
                </div>
                <p style={{
                  fontSize: 13, color: 'var(--color-fg-soft)',
                  marginBottom: 16, paddingLeft: 18, maxWidth: 720,
                }}>
                  {cfg.shortDesc}
                </p>
                <div style={{
                  display: 'grid', gap: 16,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  paddingLeft: 18,
                }}>
                  {list.map((post, idx) => (
                    <IUCNCard
                      key={post.id || post.slug}
                      post={post}
                      statusConfig={cfg}
                      index={idx}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {posts.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '64px 16px',
              color: 'var(--color-fg-soft)', fontSize: 14,
            }}>
              No IUCN Red List species published yet. Check back soon.
            </div>
          )}
        </Container>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add an OG image**

Create `app/redlist/opengraph-image.jsx`. The other category folders already have an `opengraph-image.jsx`. Copy the structure from `app/animals/opengraph-image.jsx` and adapt copy:

```jsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'IUCN Red List Species — Wildlife Universe';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        background: 'linear-gradient(135deg, #030803, #0c4a1a 60%, #28a028)',
        color: '#fff', padding: 64,
      }}>
        <div style={{
          fontSize: 18, letterSpacing: 6, color: '#a8e0c0',
          textTransform: 'uppercase', marginBottom: 24,
        }}>
          IUCN Red List
        </div>
        <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.05, marginBottom: 16 }}>
          Threatened Species
        </div>
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.75)', maxWidth: 880 }}>
          The world&apos;s most comprehensive inventory of conservation status, since 1964.
        </div>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```
Visit `http://localhost:3001/redlist`. Expected:
- Hero with "IUCN Red List Species" headline.
- One section per status code that has at least one post (in IUCN_ORDER from EX → NE).
- Each section shows the colour bar, status badge, label, species count, and a grid of `IUCNCard`s.
- A post manually saved with `label="IUCN Redlist"` (no `iucn_status`) should appear under the NE bucket.

Visit `http://localhost:3001/redlist/opengraph-image` — should render the gradient OG image.

- [ ] **Step 4: Commit**

```bash
git add app/redlist/page.jsx app/redlist/opengraph-image.jsx
git commit -m "feat(frontend): /redlist page grouping species by IUCN status"
```

---

## Task 12: Nav links — MobileMenu + Navbar

**Files:**
- Modify: `components/nav/MobileMenu.jsx`
- Modify: `components/nav/Navbar.jsx`

- [ ] **Step 1: Add the static "IUCN Red List" entry to MobileMenu**

Open `components/nav/MobileMenu.jsx`. Find `STATIC_NAV` (around line 15) and `buildEnrichedNav` (around line 21). Add a hardcoded extra item to both:

```jsx
const REDLIST_NAV_ITEM = {
  name: 'IUCN Red List',
  href: '/redlist',
  labels: [],
  slug: 'redlist',
};

const STATIC_NAV = [
  ...navItems.map((item) => {
    const slug = item.href.replace('/', '');
    const cat = categories.find((c) => c.slug === slug);
    return { ...item, labels: cat?.labels || [], slug };
  }),
  REDLIST_NAV_ITEM,
];

function buildEnrichedNav(cats) {
  return [
    { name: 'Home', href: '/', labels: [], slug: '' },
    ...cats.map((c) => ({ name: c.name, href: `/${c.slug}`, labels: c.labels || [], slug: c.slug })),
    REDLIST_NAV_ITEM,
  ];
}
```

- [ ] **Step 2: Give the new entry a category-meta colour**

Same file. Find `CAT_META` (around line 29). Add the redlist entry — use `Shield` icon and red conservation colour:

```jsx
import { ChevronDown, Home, PawPrint, Leaf, Feather, Bug, FileText, Shield } from 'lucide-react';

// ...

const CAT_META = {
  '':       { Icon: Home,     color: '#008000', glow: 'rgba(0,128,0,0.28)'    },
  home:     { Icon: Home,     color: '#008000', glow: 'rgba(0,128,0,0.28)'    },
  animals:  { Icon: PawPrint, color: '#f97316', glow: 'rgba(249,115,22,0.28)' },
  plants:   { Icon: Leaf,     color: '#22c55e', glow: 'rgba(34,197,94,0.28)'  },
  birds:    { Icon: Feather,  color: '#3b82f6', glow: 'rgba(59,130,246,0.28)' },
  insects:  { Icon: Bug,      color: '#eab308', glow: 'rgba(234,179,8,0.28)'  },
  posts:    { Icon: FileText, color: '#008000', glow: 'rgba(0,128,0,0.28)'    },
  redlist:  { Icon: Shield,   color: '#dc2020', glow: 'rgba(220,32,32,0.28)'  },
};
```

- [ ] **Step 3: Add the equivalent entry to Navbar (desktop nav)**

Open `components/nav/Navbar.jsx`. Lines 17–28 have the **identical** `STATIC_NAV` and `buildEnrichedNav` shape as MobileMenu — copy the same change here. The `REDLIST_NAV_ITEM` constant is local to MobileMenu, so re-declare it (or, if you'd rather DRY it, lift `REDLIST_NAV_ITEM` into `lib/mock/categories.js` as a named export and import it in both files; either approach is fine).

```jsx
// At the top of Navbar.jsx, near other constants:
const REDLIST_NAV_ITEM = {
  name: 'IUCN Red List',
  href: '/redlist',
  labels: [],
  slug: 'redlist',
};

const STATIC_NAV = [
  ...navItems.map((item) => {
    const slug = item.href.replace('/', '');
    const cat  = categories.find((c) => c.slug === slug);
    return { ...item, labels: cat?.labels || [], slug };
  }),
  REDLIST_NAV_ITEM,
];

function buildEnrichedNav(cats) {
  return [
    { name: 'Home', href: '/', labels: [], slug: '' },
    ...cats.map((c) => ({ name: c.name, href: `/${c.slug}`, labels: c.labels || [], slug: c.slug })),
    REDLIST_NAV_ITEM,
  ];
}
```

Navbar.jsx's desktop rendering iterates over `enrichedNav` and renders dropdowns based on `labels.length > 0`. Since `REDLIST_NAV_ITEM` has empty labels, it renders as a flat link — no dropdown. No further rendering changes needed.

- [ ] **Step 4: Verify**

```bash
npm run dev
```
1. Resize the browser to mobile width — open the hamburger. The "IUCN Red List" item should appear at the bottom of the category list with a red shield icon.
2. Resize to desktop — the desktop nav should also show the link.
3. Click it — should navigate to `/redlist`.

- [ ] **Step 5: Commit**

```bash
git add components/nav/MobileMenu.jsx components/nav/Navbar.jsx
git commit -m "feat(nav): add IUCN Red List link to mobile and desktop nav"
```

---

## Task 13: IUCN_REDLIST_SYSTEM prompt for category=Animals + label="IUCN Redlist"

This prompt is a conservation-engineering / ecological-analysis frame for species, distinct from `ANIMALS_SYSTEM`'s natural-history-profile frame. Title rule and word target match Animals; section list and emphasis differ.

**Files:**
- Modify: `app/api/ai/write/route.js`

- [ ] **Step 1: Add `isIucnRedlistAnimalPost` helper**

In `app/api/ai/write/route.js`, find `isAnimalsPost` (added in Task 4). Add the new helper immediately after it:

```js
function isIucnRedlistAnimalPost(category, label) {
  const cat = (category || '').trim().toLowerCase();
  const lbl = (label || '').trim().toLowerCase();
  return cat === 'animals' && lbl === 'iucn redlist';
}
```

- [ ] **Step 2: Add `IUCN_REDLIST_SYSTEM` constant**

Find `ANIMALS_SYSTEM` (added in Task 4). Add `IUCN_REDLIST_SYSTEM` immediately after it (before `IUCN_SCHEMA` from Task 5):

```js
const IUCN_REDLIST_SYSTEM = `You are an advanced AI wildlife content generation engine integrated inside a CMS. You write as a world-class wildlife management engineer, ecological analyst, conservation strategist, biodiversity researcher, and documentary storyteller. You produce authority-level ecological and IUCN Red List articles with deep scientific analysis, ecosystem understanding, and professional conservation assessment.

ARTICLE PURPOSE
This article must NOT be a generic species description. It must deeply analyse:
- Ecological importance, population stability, environmental interaction, ecosystem impact, conservation engineering concerns, long-term survival risks, biodiversity consequences.
The article must read simultaneously like a wildlife documentary, a scientific ecological report, and a conservation engineering assessment.

POST REQUIREMENTS
- Word count: 6500+ words
- Topic: a single wildlife species, framed through its conservation status and ecological footprint
- Tone: scientific, documentary-style, ecological analysis, professional conservation language

TITLE RULE (HARD CONSTRAINT)
The H1 must be exactly the format "Common Name (Scientific name)" — for example "African Elephant (Loxodonta africana)" or "Black Rhinoceros (Diceros bicornis)". No emotional headlines, no clickbait, no extra phrases. If the supplied title contains marketing language, rewrite it to the canonical form.

SEO OPTIMISATION (mandatory)
- Identify a primary keyword (typically the species' common name and conservation context), 3–5 secondary keywords, and 5–8 semantic LSI keywords. Distribute naturally across introduction, several H2 sections, the IUCN section, and the conclusion. Never keyword-stuff.
- Use SEO-friendly heading hierarchy (<h1>, <h2>, <h3>), short readable paragraphs, natural search-intent phrasing.

CORE WRITING PRINCIPLE
Every analysis section must explain causation, not just description. The reader should finish the article understanding WHY each ecological pressure matters, HOW it propagates through the ecosystem, and WHAT conservation engineering can realistically achieve.

MANDATORY 14-SECTION STRUCTURE (never skip a section, keep this exact order)
1. Introduction — vivid ecological scene, set conservation stakes, introduce the species in its threatened context.
2. Population Dynamics — population increase or decline, breeding success, mortality rates, juvenile survival, migration effects, habitat fragmentation effects. Explain WHY population changes occur with cause-and-effect reasoning.
3. Habitat Stability & Ecological Pressure — habitat destruction, deforestation, wetland collapse, water scarcity, vegetation changes, ecosystem degradation, climate pressure. Explain environmental dependency and tipping points.
4. Ecological Role (Keystone Analysis) — ecosystem importance, food-web role, predator/prey influence, biodiversity stability, trophic cascade effects. Explicitly answer: what happens if the species disappears?
5. Human-Wildlife Conflict — agriculture expansion, livestock conflict, urbanisation, infrastructure development, road impacts, migration disruption.
6. Climate Change Vulnerability — temperature effects, rainfall instability, drought, wildfires, sea-level rise. Critically: assess the species' adaptability capacity (behavioural plasticity, range shift potential, dietary flexibility).
7. Genetic Diversity Concerns — inbreeding, population isolation, low genetic diversity, evolutionary resilience.
8. Conservation Engineering Solutions — wildlife corridors, habitat restoration, AI wildlife monitoring, protected-area systems, anti-poaching technologies, ecosystem rehabilitation.
9. Ecosystem Interdependence — pollination systems, nutrient cycling, vegetation balance, predator-prey systems, species interconnectedness.
10. Future Extinction Risk Modelling — future population projections, extinction risks, ecosystem collapse possibilities, recovery probabilities. Cite IUCN trend data and known modelling approaches where relevant.
11. Conservation Policy & Governance — conservation laws, enforcement problems, international cooperation (CITES, regional treaties), indigenous conservation systems, funding limitations.
12. IUCN Red List Analysis — DEDICATED H2 with six H3 sub-sections in this exact order:
    <h3>Current IUCN Status</h3>     — official category + scientific explanation of the classification
    <h3>Population Trend</h3>        — increasing / stable / decreasing, estimated population if known, historical decline or recovery
    <h3>Main Threats</h3>            — habitat destruction, poaching, climate change, human conflict, pollution, disease, invasive species — explain how each affects survival
    <h3>Ecological Consequences</h3> — what happens if population declines further, ecosystem imbalance risks, predator/prey impact, biodiversity consequences
    <h3>Conservation Efforts</h3>    — protected areas, breeding programmes, government efforts, NGO projects, international protections
    <h3>Future Outlook</h3>          — chances of recovery, future risks, long-term survival outlook
13. Conclusion — synthesise the ecological argument, reinforce stakes, leave a memorable closing reflection.
14. Frequently Asked Questions — 6–12 real search-intent questions as <h3> headings with short 1–3 paragraph answers each. Schema-friendly, conversational phrasing, primary keyword naturally placed. Do not invent irrelevant questions.

WRITING STYLE
- Deep ecological storytelling, scientific realism, documentary narration, emotional environmental awareness, professional conservation analysis.
- No robotic writing. No AI-sounding clichés ("delve", "nuanced", "comprehensive", "robust", "in today's world", "as we explore", etc.).

QUALITY CONTROL
- Scientific depth, ecological realism, SEO optimisation, authority-level quality, readability.
- Do NOT create shallow content. Do NOT oversimplify ecological systems. Do NOT skip ecosystem analysis. Each species must feel unique.

FORMAT
- Output clean HTML only — never markdown.
- Open with <h1> in the exact "Common Name (Scientific name)" form.
- Use <h2> for each of the 14 main sections; <h3> for sub-sections (especially in section 12).
- Use <p> for paragraphs, <ul>/<li> for lists where appropriate.
- Do not include <html>, <head>, or <body> wrappers — output the article body fragment only.
- Ready to publish, no commentary outside the article.`;
```

- [ ] **Step 3: Add `buildIucnRedlistPrompt` helper**

Find `buildAnimalsPrompt` (added in Task 4). Add `buildIucnRedlistPrompt` immediately after it:

```js
function buildIucnRedlistPrompt(title, context) {
  const t = title?.trim();
  const sci = context?.scientificName?.trim();
  const status = context?.iucnStatus;

  const iucnHint = status
    ? `\n\nThe species' IUCN Red List category is **${status}**. Use this exact status in section 12 — do not invent a different status.${sci ? ` Scientific name: ${sci}.` : ''}`
    : '\n\nIf the species has an official IUCN Red List status, identify it from your knowledge and use it accurately in section 12. If the species has not been assessed, mark as NE (Not Evaluated) and explain the lack of assessment.';

  return `Write a complete 6500+ word authority-level IUCN Red List conservation analysis article${t ? ` titled "${t}"` : ''}.

TITLE RULE (HARD): The H1 must be exactly the format "Common Name (Scientific name)" — for example "African Elephant (Loxodonta africana)" or "Black Rhinoceros (Diceros bicornis)". No SEO clickbait, no emotional headlines, no extra phrases. If the supplied title is not in the canonical form, rewrite it to that form before using it as the <h1>.

Follow the mandatory 14-section structure exactly:
1.  <h2>Introduction</h2>
2.  <h2>Population Dynamics</h2>
3.  <h2>Habitat Stability & Ecological Pressure</h2>
4.  <h2>Ecological Role (Keystone Analysis)</h2>
5.  <h2>Human-Wildlife Conflict</h2>
6.  <h2>Climate Change Vulnerability</h2>
7.  <h2>Genetic Diversity Concerns</h2>
8.  <h2>Conservation Engineering Solutions</h2>
9.  <h2>Ecosystem Interdependence</h2>
10. <h2>Future Extinction Risk Modelling</h2>
11. <h2>Conservation Policy & Governance</h2>
12. <h2>IUCN Red List Analysis</h2>
    <h3>Current IUCN Status</h3>
    <h3>Population Trend</h3>
    <h3>Main Threats</h3>
    <h3>Ecological Consequences</h3>
    <h3>Conservation Efforts</h3>
    <h3>Future Outlook</h3>
13. <h2>Conclusion</h2>
14. <h2>Frequently Asked Questions</h2> (6–12 questions, each as <h3>, with 1–3 paragraph short answers; FAQ-schema-friendly; conversational phrasing; primary keyword naturally placed)

Every analysis section must explain causation, not just description. The reader must understand WHY each ecological pressure matters, HOW it propagates through the ecosystem, and WHAT conservation engineering can realistically achieve.${iucnHint}

Output clean HTML only. Begin immediately with the <h1> title — no preamble.`;
}
```

- [ ] **Step 4: Wire into the POST handler dispatch**

In the POST handler, find the template-flag block (modified in Task 4). Add the new flag, then add the dispatch branch immediately after `useAnimalsTemplate`:

```js
    const useAnimalsTemplate = task === 'full_article' && isAnimalsPost(context.category, effectiveLabel);
    const useIucnRedlistTemplate = task === 'full_article' && isIucnRedlistAnimalPost(context.category, effectiveLabel);

    let systemPrompt = WILDLIFE_SYSTEM;
    let userPrompt = buildPrompt(task, context);
    let maxTokens = task === 'full_article' ? 8000 : 2000;

    if (useHowTemplate) {
      systemPrompt = HOW_QUESTIONS_SYSTEM;
      userPrompt = buildHowQuestionsPrompt(context.title);
      maxTokens = 4000;
    } else if (useWhyTemplate) {
      systemPrompt = WHY_QUESTIONS_SYSTEM;
      userPrompt = buildWhyQuestionsPrompt(context.title);
      maxTokens = 5000;
    } else if (useConservationTemplate) {
      systemPrompt = CONSERVATION_SYSTEM;
      userPrompt = buildConservationPrompt(context.title);
      maxTokens = 7000;
    } else if (useTourismTemplate) {
      systemPrompt = TOURISM_SYSTEM;
      userPrompt = buildTourismPrompt(context.title);
      maxTokens = 6000;
    } else if (useArticlesTemplate) {
      systemPrompt = ARTICLES_SYSTEM;
      userPrompt = buildArticlesPrompt(context.title);
      maxTokens = 9000;
    } else if (useAnimalsTemplate) {
      systemPrompt = ANIMALS_SYSTEM;
      userPrompt = buildAnimalsPrompt(context.title, context);
      maxTokens = 14000;
    } else if (useIucnRedlistTemplate) {
      systemPrompt = IUCN_REDLIST_SYSTEM;
      userPrompt = buildIucnRedlistPrompt(context.title, context);
      maxTokens = 14000; // 6500 words ≈ 8500 tokens + headroom
    }
```

The new branch sits at the end of the if/else chain, after `useAnimalsTemplate`. Order matters: `useAnimalsTemplate` excludes `iucn redlist` per Task 4's `isAnimalsPost` definition, so the two cases never overlap.

- [ ] **Step 5: Verify**

```bash
npm run lint
```
Expected: zero new errors related to `route.js`.

Quick integration check via curl. Start `npm run dev` and:

```bash
curl -X POST http://localhost:3001/api/ai/write \
  -H "Content-Type: application/json" \
  -d '{
    "task": "full_article",
    "provider": "claude",
    "model": "claude-opus-4-7",
    "context": {
      "title": "Black Rhinoceros (Diceros bicornis)",
      "body": "",
      "category": "animals",
      "label": "IUCN Redlist"
    }
  }' | head -c 2000
```

Expected: a streamed article opening with `<h1>Black Rhinoceros (Diceros bicornis)</h1>` followed by `<h2>Introduction</h2>` (not the species-profile structure from `ANIMALS_SYSTEM`).

- [ ] **Step 6: Commit**

```bash
git add app/api/ai/write/route.js
git commit -m "feat(ai): IUCN_REDLIST_SYSTEM prompt for Animals + IUCN Redlist label"
```

---

## Wrap-up

After all 13 tasks are committed:

- [ ] **Final lint**

```bash
npm run lint
```
Expected: zero new errors.

- [ ] **Smoke test the full feature**

1. Create an Animals/Mammals post titled `Cheetah (Acinonyx jubatus)`.
2. Click "Generate Full Article" in the AI Writing Toolkit.
3. Wait for the stream to complete. Confirm the article has 18 H2 sections including `IUCN Red List Analysis` (with 6 H3 sub-sections) and `Frequently Asked Questions` at the end.
4. Confirm the IUCN panel filled with `VU` (Vulnerable), scientific name `Acinonyx jubatus`, decreasing population trend.
5. (If `IUCN_API_TOKEN` is set) click "Verify against IUCN" — confirm the verified badge appears.
6. Save the post. Visit `/`. The post appears in the homepage `IUCNSection` under VU.
7. Visit `/redlist`. The post appears under the Vulnerable section.
8. Manually create a post `category=Animals, label="IUCN Redlist"` (no scientific name in title) — confirm it falls through to `WILDLIFE_SYSTEM` (general wildlife prompt) when generating, and appears on `/redlist` under NE.
9. Click "Detect from species" on the topical post — confirm the panel returns `NE` with low confidence and a reasoning line explaining it's a topical article.
10. Toggle off `autoDetectIUCNOnTitleBlur` in settings. Confirm title-blur no longer fires.
11. Create a second post: `category=Animals, label=IUCN Redlist`, title `Black Rhinoceros (Diceros bicornis)`. Click Generate. Confirm the article uses the conservation-engineering 14-section structure (Population Dynamics → Conservation Policy → IUCN Red List Analysis → Conclusion → FAQ), NOT the 18-section species-profile structure used by Mammals/Reptiles/Amphibians/Fish. Confirm it appears under CR on `/redlist`.

- [ ] **Final commit (if any cleanup needed)**

```bash
git status
git add <any leftover> && git commit -m "chore: post-implementation cleanup"
```

---

## Out of Scope (future plans)

- `BIRDS_SYSTEM` and `INSECTS_SYSTEM` — user will provide guides separately.
- Topical/curated multi-species list prompts (e.g. "Top 10 Endangered Mammals"). The current `IUCN_REDLIST_SYSTEM` is for single-species conservation deep-dives, not lists.
- Scheduled re-verification of stale `iucn_verified_at` rows.
- Multi-language IUCN status labels.

# IUCN Red List Feature — Design Spec

**Date:** 2026-05-06
**Status:** Approved (pending user review)
**Owner:** matt

## Summary

Add a three-part IUCN Red List feature to the Wildlife.Universe CMS:

1. **Admin sidebar autofill panel** — sets `iucn_status` on posts in the `animals`, `birds`, and `insects` categories. Driven by AI detection from the species name in the title, optionally verified against the official IUCN Red List API when a token is configured.
2. **`ANIMALS_SYSTEM` prompt + FAQ + IUCN Red List Analysis sections** — extends the existing AI write route with a category-specific 18-section prompt for `category="animals"` posts.
3. **Frontend `/redlist` page + nav link** — a dedicated browsing surface for IUCN Red List posts, complementing the existing homepage `IUCNSection`.

## Goals

- Make conservation status a first-class, low-friction field on species posts.
- Surface IUCN-flagged species automatically across the site (homepage section + dedicated `/redlist` page).
- Keep authority signals strong: prefer official IUCN data when available, fall back to AI knowledge silently.
- Reuse the existing prompt-routing pattern in `app/api/ai/write/route.js` rather than introducing parallel architecture.

## Non-Goals

- Dedicated `BIRDS_SYSTEM` / `INSECTS_SYSTEM` prompt guides. These will be added later when the user provides the corresponding guides; the IUCN sidebar works for those categories regardless.
- Multi-language IUCN status. English category names only.
- Automatic re-verification on a schedule. Manual re-verification only.

## Architecture Overview

```
┌───────────────────────── Admin Editor ─────────────────────────┐
│  PostEditor.jsx                                                │
│   ├── (right rail)                                             │
│   │    ├── AISEOAssistant                                      │
│   │    ├── IUCNPanel  ← NEW (renders if category in scope)     │
│   │    │    ├── manual button "Detect from species"            │
│   │    │    ├── manual button "Verify against IUCN"            │
│   │    │    └── (auto) consumed by AIWritingToolkit on         │
│   │    │              full_article generation completion       │
│   │    └── Schedule / Publish                                  │
│   └── title <input> onBlur → optional iucn_detect              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────── Server Routes ─────────────────────────┐
│  POST /api/ai/write                                            │
│    task: "iucn_detect"  ← NEW                                  │
│      → generateObject (IUCN_SCHEMA) → JSON                     │
│    task: "full_article"                                        │
│      → ANIMALS_SYSTEM (NEW) when category=animals              │
│      → ARTICLES/HOW/WHY/TOURISM/CONSERVATION (existing)        │
│                                                                │
│  POST /api/iucn/verify  ← NEW                                  │
│      → IUCN Red List API v4 (when IUCN_API_TOKEN set)          │
│      → silent fallback when token missing                      │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────── Storage ────────────────────────────────┐
│  posts (Supabase)                                              │
│    iucn_status         TEXT      (existing)                    │
│    scientific_name     TEXT      ← NEW                         │
│    iucn_verified       BOOLEAN   ← NEW                         │
│    iucn_verified_at    TIMESTAMPTZ ← NEW                       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────── Frontend ───────────────────────────────┐
│  /                IUCNSection (existing — no changes)          │
│  /redlist        ← NEW page                                    │
│                  Hero + status filter + IUCNCard grid          │
│                  Source: posts.iucn_status IS NOT NULL         │
│                       OR posts.label = 'IUCN Redlist'          │
│  Nav             ← link added to MobileMenu + desktop nav      │
└────────────────────────────────────────────────────────────────┘
```

## Decisions Locked During Brainstorming

| # | Decision | Choice |
|---|----------|--------|
| 1 | IUCN data source | **Hybrid** — AI-first, official IUCN API verifies when token configured |
| 2 | "IUCN Redlist" label semantics | **Virtual filter (B) + curated label (A)** — `iucn_status IS NOT NULL` auto-surfaces; explicit `label="IUCN Redlist"` for topical/curated posts |
| 3 | Autofill triggers | **All three** — manual button, generation bundle, opt-in title-blur |

## Data Model

### Migration `010_iucn_redlist.sql`

```sql
ALTER TABLE posts
  ADD COLUMN scientific_name   TEXT,
  ADD COLUMN iucn_verified     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN iucn_verified_at  TIMESTAMPTZ;

CREATE INDEX posts_iucn_status_idx
  ON posts (iucn_status)
  WHERE iucn_status IS NOT NULL;
```

### `lib/storage/db.js` updates

- Add `'scientific_name', 'iucn_verified', 'iucn_verified_at'` to the column projection list (currently includes `'iucn_status'` at line ~69).
- Extend `toRow` (camelCase → snake_case) and `fromRow` (snake_case → camelCase) with the three new fields.
- Add new query method:

```js
async listAllForRedlist() {
  const { data } = await getDb()
    .from('posts')
    .select('*')
    .or('iucn_status.not.is.null,label.ilike.iucn redlist')
    .order('created_at', { ascending: false });
  return (data || []).map(fromRow);
}
```

### `components/iucn/iucnConfig.js` updates

Add `NE` (Not Evaluated) — the AI may legitimately return this for unassessed species:

```js
NE: {
  code: 'NE',
  label: 'Not Evaluated',
  shortDesc: 'Not yet assessed against the IUCN criteria',
  longDesc: 'Not Evaluated species have not yet been assessed against the IUCN Red List criteria. Their conservation status is unknown — they may be common and secure, or they may be at risk. Assessment is a prerequisite for conservation prioritization.',
  color: '#6b7280',
  textColor: '#9ca3af',
  badgeBg: 'rgba(20,20,28,0.92)',
  glow: 'rgba(107,114,128,0.22)',
  rowAccent: '#4b5563',
},
```

`IUCN_ORDER` becomes `['EX','EW','CR','EN','VU','NT','LC','DD','NE']`.

## Server: AI Route Extensions

### New task `iucn_detect` in `app/api/ai/write/route.js`

Uses `generateObject` from the `ai` package (already imported alongside `streamText`) with a Zod schema:

```js
import { generateObject } from 'ai';
import { z } from 'zod';

const IUCN_SCHEMA = z.object({
  iucnStatus: z.enum(['EX','EW','CR','EN','VU','NT','LC','DD','NE']),
  scientificName: z.string().nullable(),
  commonName: z.string().nullable(),
  populationTrend: z.enum(['increasing','stable','decreasing','unknown']),
  confidence: z.enum(['high','medium','low']),
  reasoning: z.string(),
});

const IUCN_DETECT_SYSTEM = `You are a conservation biologist with full knowledge of the IUCN Red List of Threatened Species.

Given a wildlife article title and (optionally) the article body, identify the species and return its current IUCN Red List category.

Rules:
- Return ONLY one of: EX, EW, CR, EN, VU, NT, LC, DD, NE.
- Never invent a status. If you are not confident, return DD with confidence: low.
- If the input describes a topical article (e.g. "Top 10 Critically Endangered Mammals") rather than a single species, return NE with confidence: low and explain in reasoning.
- scientificName must be the binomial Latin name (e.g. "Panthera tigris"). null if not derivable.
- commonName is the everyday English name. null if not derivable.
- populationTrend reflects the latest IUCN assessment.
- confidence: high = textbook/iconic species, medium = lesser-known, low = obscure or genus-only.
- reasoning: 1-2 sentences citing why you chose this status.`;
```

The handler short-circuits before the existing `streamText` block:

```js
if (task === 'iucn_detect') {
  const { object } = await generateObject({
    model,
    system: IUCN_DETECT_SYSTEM,
    schema: IUCN_SCHEMA,
    prompt: `Title: ${context.title}\n\nFirst 500 chars of body:\n${(context.body || '').replace(/<[^>]*>/g, ' ').slice(0, 500)}`,
    temperature: 0.2,
  });
  return Response.json(object);
}
```

### New `ANIMALS_SYSTEM` prompt

Slots into `route.js` alongside `WILDLIFE_SYSTEM` / `HOW_QUESTIONS_SYSTEM` / `WHY_QUESTIONS_SYSTEM` / `CONSERVATION_SYSTEM` / `TOURISM_SYSTEM` / `ARTICLES_SYSTEM`. Combines the user's three guides:

- **16-section animal guide** (Introduction → Conclusion)
- **IUCN Red List Analysis** dedicated section (6 sub-headings)
- **FAQ** appended at the end

Final 18-section structure:

```
1.  Introduction
2.  Scientific Classification
3.  Physical Characteristics
4.  Habitat & Geographic Distribution
5.  Behavior & Social Structure
6.  Daily Life & Activity Cycle
7.  Diet & Survival Strategies
8.  Interaction with Other Animals
9.  Interaction with Environment
10. Reproduction & Parenting
11. Evolutionary Adaptations
12. Ecological Importance
13. Threats & Conservation
14. IUCN Red List Analysis    ← inserted (6 sub-headings)
15. Human Relationship
16. Unique & Rare Facts
17. Conclusion
18. Frequently Asked Questions ← appended (6-12 Q&As)
```

### New helpers

```js
function isAnimalsPost(category, label) {
  const cat = (category || '').trim().toLowerCase();
  const lbl = (label || '').trim().toLowerCase();
  // ANIMALS_SYSTEM is for single-species articles only.
  // The "IUCN Redlist" label is for curated/topical posts (e.g. "Top 10
  // Endangered Mammals") and falls through to the default WILDLIFE_SYSTEM,
  // which handles general wildlife topics. Adding a dedicated
  // ANIMALS_REDLIST_TOPICAL_SYSTEM is deferred to a future spec.
  return cat === 'animals' && [
    'mammals', 'reptiles', 'amphibians', 'fish',
  ].includes(lbl);
}

function buildAnimalsPrompt(title, context) {
  const t = title?.trim();
  const iucnHint = context?.iucnStatus
    ? `\n\nThe species' IUCN Red List category is **${context.iucnStatus}**. Use this exact status in section 14 — do not invent a different status. ${context?.scientificName ? `Scientific name: ${context.scientificName}.` : ''}`
    : '\n\nIf the species has an official IUCN Red List status, identify it from your knowledge and use it in section 14. If not, mark as NE (Not Evaluated).';

  return `Write a complete 6500+ word authority-level wildlife species article${t ? ` titled "${t}"` : ''}.

TITLE RULE (HARD): The H1 must be exactly the format "Common Name (Scientific name)" — for example "African Elephant (Loxodonta africana)". No SEO clickbait, no "Amazing", "Discover", "Secret World", emotional headlines, or extra phrases. Encyclopedia/documentary style only.

Follow the mandatory 18-section structure exactly:
1.  <h2>Introduction</h2>
2.  <h2>Scientific Classification</h2>
3.  <h2>Physical Characteristics</h2>
4.  <h2>Habitat & Geographic Distribution</h2>
5.  <h2>Behavior & Social Structure</h2>
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
18. <h2>Frequently Asked Questions</h2> (6-12 questions, each as <h3>, short 1-3 paragraph answers, FAQ schema-friendly)
${iucnHint}

Output clean HTML only. Begin immediately with the <h1> title — no preamble.`;
}
```

### POST handler dispatch

Insert into the `if/else if` chain in the POST handler:

```js
const useAnimalsTemplate = task === 'full_article' && isAnimalsPost(context.category, effectiveLabel);

// existing branches: useHowTemplate, useWhyTemplate, useConservationTemplate,
// useTourismTemplate, useArticlesTemplate
} else if (useAnimalsTemplate) {
  systemPrompt = ANIMALS_SYSTEM;
  userPrompt = buildAnimalsPrompt(context.title, context);
  maxTokens = 14000; // 6500 words ≈ 8500 tokens + headroom
}
```

`ANIMALS_SYSTEM` is the verbatim user-supplied guide (16-section + FAQ + IUCN Red List Analysis instructions, merged into one cohesive system message).

### New route `/api/iucn/verify`

```
POST /api/iucn/verify
body: { scientificName: "Panthera tigris", postId: "uuid" }

Behavior:
  if !process.env.IUCN_API_TOKEN:
    return { verified: false, reason: "no-token" }
  fetch IUCN Red List API v4 with the scientific name (Bearer auth)
  on 200:
    update posts row → iucn_verified=true, iucn_verified_at=now()
    return { verified: true, officialStatus, populationTrend, lastAssessmentYear, assessmentId }
  on 404: { verified: false, reason: "not-found" }
  on error: { verified: false, reason: "api-error" }
```

The exact IUCN v4 endpoint will be confirmed against current IUCN docs at implementation time (the v4 API requires registration at iucnredlist.org/resources/api).

## Admin UI: `IUCNPanel`

### File: `components/admin/editor/IUCNPanel.jsx`

```
Props:
  category, label, title, body                 ← from PostEditor
  iucnStatus, scientificName, iucnVerified,    ← from post draft
  iucnVerifiedAt
  onChange({ iucnStatus?, scientificName?,
             iucnVerified?, iucnVerifiedAt? }) ← lifts state to PostEditor

Render (only when category in {animals, birds, insects}):
  - FlatCard wrapper (existing pattern from PostEditor)
  - Status badge (color from IUCN_CONFIG[iucnStatus])
  - Common name + scientific name (italic)
  - Population trend ↑/→/↓ icon
  - Confidence pill (high/medium/low)
  - "✓ Verified by IUCN" sub-badge if iucnVerified
  - "Last verified: <date>" muted
  - Buttons:
    - [✨ Detect from species]    (always)
    - [✓ Verify against IUCN]    (only when iucnVerified=false AND scientificName set AND IUCN_API_TOKEN configured — checked via /api/iucn/verify with reason="no-token" returning false)
    - [⌫ Clear]                  (resets all four fields)

Empty state:
  Muted "No status detected yet. Click Detect from species to autofill." prompt.
```

### `lib/stores/aiStore.js` additions

```js
autoDetectIUCNOnTitleBlur: false,
setAutoDetectIUCN(v) { set({ autoDetectIUCNOnTitleBlur: !!v }); },
```

A toggle for this setting is added to the existing `AIProviderSettings` panel.

### Three triggers wired

1. **Manual button** — `IUCNPanel` button calls `runDetect()` which posts to `/api/ai/write` with `task: 'iucn_detect'`, then conditionally chains `/api/iucn/verify`.

2. **Generation bundle** — In `AIWritingToolkit.jsx`, after `runGeneration` completes for `task === 'full_article'` and `isAnimalsBirdsInsects(category)`, fire-and-forget an `iucn_detect` call and update the post draft via the same `onChange` interface used by the panel.

3. **Title blur (opt-in)** — In `PostEditor.jsx`, attach an `onBlur` handler to the title `<input>`:

```js
function onTitleBlur(e) {
  if (!aiStore.autoDetectIUCNOnTitleBlur) return;
  if (!['animals','birds','insects'].includes(category?.toLowerCase())) return;
  if (!/\(.+\)/.test(e.target.value)) return; // require scientific name parens
  runDetect({ silent: true });
}
```

### Sidebar placement

`IUCNPanel` sits between `AISEOAssistant` and the Schedule/Publish card in the right rail of `PostEditor.jsx`. The panel returns `null` when category isn't in scope — clean conditional hide.

## Frontend: `/redlist` Page

### File: `app/redlist/page.jsx`

```jsx
// Server component
import { db } from '@/lib/storage/db';
import { IUCNCard } from '@/components/iucn/IUCNCard';
import { IUCN_CONFIG, IUCN_ORDER } from '@/components/iucn/iucnConfig';

export const metadata = {
  title: 'IUCN Red List Species — Wildlife Universe',
  description: 'Browse all wildlife species classified by the IUCN Red List of Threatened Species, from Extinct to Least Concern.',
};

export default async function RedListPage() {
  const posts = await db.posts.listAllForRedlist();
  // Group by status, render hero + filter row + grid
}
```

Layout reuses the existing `IUCNSection` visual language (dark backdrop, status filter buttons, fade transitions). The difference: `/redlist` is a dedicated browsing surface with a filterable grid (not the homepage-section's expandable row).

### Nav links

- `components/nav/MobileMenu.jsx` — add `{ label: 'IUCN Red List', href: '/redlist' }` to the menu items array.
- Desktop nav — add the same link. The desktop nav component is not yet identified in this spec; the implementer should `Grep` for the existing top-nav array (likely under `components/nav/`) and add `{ label: 'IUCN Red List', href: '/redlist' }` to it.

### Existing homepage `IUCNSection`

No changes. Keeps using `db.posts.listAllWithIUCN()`, which only requires `iucn_status IS NOT NULL`. The new `/redlist` page additionally pulls `label='IUCN Redlist'` curated posts via `listAllForRedlist()`.

## Edge Cases

| Case | Behavior |
|------|----------|
| Title without scientific name | AI returns `confidence: 'low'`, `scientificName: null`. Verify route is skipped. |
| Species not found in IUCN API | `verified: false, reason: 'not-found'`. AI value retained, no verified badge. |
| `IUCN_API_TOKEN` missing | `/api/iucn/verify` returns `{ verified: false, reason: 'no-token' }`. UI shows "AI-detected" without the verified badge. |
| Curated `label="IUCN Redlist"` post (not a single species) | AI returns `NE` + low confidence + reasoning explaining it's a topical post. Sidebar shows a hint: "This appears to be a topical article — set status manually if needed." |
| User edits title after detection | `iucn_verified` is left intact. User can re-detect manually. No silent invalidation. |
| Birds/Insects categories | No `BIRDS_SYSTEM`/`INSECTS_SYSTEM` yet — full_article generation falls through to the default `WILDLIFE_SYSTEM` (none of the existing templates match `category=birds`/`category=insects`). The IUCN sidebar still works. |
| `label="IUCN Redlist"` curated topical post under Animals | Does NOT trigger `ANIMALS_SYSTEM` (which assumes a single species). Falls through to `WILDLIFE_SYSTEM`. The post still appears on `/redlist` via the label. A dedicated topical-list prompt can be added later. |
| Same scientific name with multiple subspecies | AI picks the most-cited assessment. User can override manually. |
| API rate limit hit | `verify` returns `reason: 'api-error'`. Silent fallback. Retry on next manual click. |

## Files Touched

**New files:**
- `supabase/migrations/010_iucn_redlist.sql`
- `app/api/iucn/verify/route.js`
- `app/redlist/page.jsx`
- `components/admin/editor/IUCNPanel.jsx`
- `__tests__/iucn-detect.test.js` (Zod schema enforcement, edge cases)

**Modified files:**
- `app/api/ai/write/route.js` — add `iucn_detect` task, `ANIMALS_SYSTEM`, `buildAnimalsPrompt`, `isAnimalsPost`, dispatch branch
- `lib/storage/db.js` — column projection, `toRow`/`fromRow`, `listAllForRedlist()`
- `lib/stores/aiStore.js` — `autoDetectIUCNOnTitleBlur` flag + setter
- `components/iucn/iucnConfig.js` — add `NE` entry, update `IUCN_ORDER`
- `components/admin/PostEditor.jsx` — render `<IUCNPanel>` in right rail, title `onBlur` handler
- `components/admin/editor/AIWritingToolkit.jsx` — fire-and-forget `iucn_detect` after `full_article` completion
- `components/admin/settings/AIProviderSettings.jsx` — toggle for autoDetectIUCNOnTitleBlur
- `components/nav/MobileMenu.jsx` — add `/redlist` link
- (desktop nav file, located at implementation time)

## Open Items / Out of Scope

- IUCN Red List API v4 token application (user action — apply at iucnredlist.org/resources/api).
- `INSECTS_SYSTEM` prompt guide (deferred until user provides it).
- Multi-language IUCN status labels.
- Scheduled re-verification of stale `iucn_verified_at` rows.

## Update — 2026-05-06: IUCN_REDLIST_SYSTEM scope addition

The user provided a dedicated prompt guide for `category=Animals AND label="IUCN Redlist"` mid-implementation. This adds a new prompt template (`IUCN_REDLIST_SYSTEM`) alongside `ANIMALS_SYSTEM`, distinguished by frame:

- **`ANIMALS_SYSTEM`** (label ∈ {Mammals, Reptiles, Amphibians, Fish}) — natural-history species profile: taxonomy, physical characteristics, behaviour, reproduction, etc. 18 sections.
- **`IUCN_REDLIST_SYSTEM`** (label = "IUCN Redlist") — conservation engineering deep-dive: population dynamics, habitat stability, keystone analysis, human-wildlife conflict, climate vulnerability, genetic diversity, conservation engineering, ecosystem interdependence, extinction-risk modelling, conservation policy. 14 sections.

Both share the title rule (`Common Name (Scientific name)`), 6500+ word target, dedicated `IUCN Red List Analysis` section, and trailing FAQ. They diverge in section list and emphasis.

`isIucnRedlistAnimalPost(category, label)` returns true when `cat === 'animals' && lbl === 'iucn redlist'`. The dispatch branch sits alongside `useAnimalsTemplate` in `app/api/ai/write/route.js`.

Implementation is tracked as Task 13 in the plan.

## Update — 2026-05-06: BIRDS_SYSTEM scope addition

The user provided a dedicated prompt guide for `category=Birds`. This adds `BIRDS_SYSTEM` — a 19-section ornithological deep-dive emphasising flight mechanics, migration, and vocalization, with label-specific focus rules per Birds label.

- **`BIRDS_SYSTEM`** (category = "Birds", any label) — ornithology profile: scientific classification → physical characteristics → flight mechanics → migration → vocalization → behavior → diet → ecological role → reproduction → adaptations → ecological importance → threats/IUCN → human relationship → unique facts → FAQ → conclusion. 19 sections, 5500–7000 words.

Label-specific focus rules (applied inside the system prompt based on the label string):
- `Basal` / `Basal / Primitive` — ancient evolution, dinosaur ancestry
- `Waterfowl` — aquatic adaptation, wetlands, migration
- `Coastal` — shoreline ecosystems, tidal feeding, salt adaptation
- `Raptors` — predatory dominance, hunting, eyesight
- `Land` / `Land Birds` — ground adaptation, nesting, camouflage
- `Song` / `Song Birds` — vocal learning, mating songs

`isBirdsPost(category, label)` returns true when `cat === 'birds'` and the label is one of the six DB-stored short forms. The dispatch branch sits in `app/api/ai/write/route.js`. The IUCN sidebar autodetect feature already covers `birds` (per Task 9), so the bird prompt receives `iucnStatus` from context when set.

Note: `lib/mock/categories.js` stores Birds labels as short forms (`Basal`, `Land`, `Song`). The user's guide names them in long form (`Basal / Primitive`, `Land Birds`, `Song Birds`). The prompt's IF rules accept both forms; no migration is required. If long-form labels are desired in admin/UI, that becomes a separate `categories.js` rename + slug-migration task.

Implementation is tracked as Task 14 in the plan.

## Acceptance Criteria

1. Creating an Animals/Birds/Insects post shows the IUCN panel in the right rail.
2. Clicking "Detect from species" on a post titled `Lion (Panthera leo)` returns `VU` (Vulnerable) and fills the panel.
3. With `IUCN_API_TOKEN` set, a verified detection shows the "✓ Verified by IUCN" badge.
4. Generating a full article via `Generate 6500+ Word Article` for an Animals/Mammals post produces an 18-section article including a `## IUCN Red List Analysis` section and a `## Frequently Asked Questions` section, with the title in `Common Name (Scientific name)` form.
5. The post auto-appears in the homepage `IUCNSection` and on `/redlist`.
6. A post with `label="IUCN Redlist"` (no `iucn_status`) appears on `/redlist` but not in the homepage section.
7. Without `IUCN_API_TOKEN`, the entire feature works — only the verified badge is hidden.

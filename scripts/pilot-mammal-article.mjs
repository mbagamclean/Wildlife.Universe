/**
 * Phase 2 pilot — generate ONE Animals/Mammals article end-to-end and
 * insert it as a published post.
 *
 * Run:
 *   node --env-file=.env.local scripts/pilot-mammal-article.mjs "Sunda Pangolin"
 *
 * Required env vars in .env.local:
 *   ANTHROPIC_API_KEY            — Claude text generation
 *   OPENAI_API_KEY               — DALL·E 3 image generation
 *   NEXT_PUBLIC_SUPABASE_URL     — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY    — service role key (bypasses RLS for
 *                                  storage upload + post insert)
 *
 * The ANIMALS_SYSTEM + RICH_FORMATTING_TOOLKIT prompts are extracted at
 * runtime from app/api/ai/write/route.js so this script always uses the
 * same prompts the live admin generator does — no drift.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import sharp from 'sharp';

// ─── Prompt extraction (no duplication with route.js) ──────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTE_PATH = join(__dirname, '..', 'app', 'api', 'ai', 'write', 'route.js');
const routeText = readFileSync(ROUTE_PATH, 'utf8');

function extractTemplateLiteral(name) {
  const startMarker = `const ${name} = \``;
  const start = routeText.indexOf(startMarker);
  if (start === -1) throw new Error(`Could not find const ${name} in ${ROUTE_PATH}`);
  const contentStart = start + startMarker.length;
  const end = routeText.indexOf('`;', contentStart);
  if (end === -1) throw new Error(`Could not find closing backtick of ${name}`);
  return routeText.slice(contentStart, end);
}

const ANIMALS_SYSTEM = extractTemplateLiteral('ANIMALS_SYSTEM');
const RICH_FORMATTING_TOOLKIT = extractTemplateLiteral('RICH_FORMATTING_TOOLKIT');

// ─── Helpers ──────────────────────────────────────────────────────────

function countWords(html) {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function makePostId() {
  return 'p' + randomUUID().replace(/-/g, '').slice(0, 12);
}

// ─── Pipeline steps ───────────────────────────────────────────────────

async function generateBody(species) {
  console.log(`[1/5] generating article body for "${species}"...`);
  const model = anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');
  const userPrompt = `Write a complete 6500+ word authority-level wildlife species article about "${species}".

TITLE RULE (HARD): The H1 must be exactly the format "Common Name (Scientific name)" — for example "African Elephant (Loxodonta africana)". No SEO clickbait, no "Amazing", "Discover", "Secret World", "Inside the World", "Why … Are Important", emotional headlines, or extra phrases.

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
18. <h2>Frequently Asked Questions</h2> (6-12 questions, each as <h3>, short 1-3 paragraph answers, FAQ schema-friendly)

If the species has an official IUCN Red List status, identify it from your knowledge and use it accurately in section 14. If the species has not been assessed, mark as NE (Not Evaluated).

Output clean HTML only. Begin immediately with the <h1> title — no preamble.`;

  const { text, usage } = await generateText({
    model,
    system: ANIMALS_SYSTEM + '\n' + RICH_FORMATTING_TOOLKIT,
    prompt: userPrompt,
    temperature: 0.7,
    maxOutputTokens: 14000,
  });
  const words = countWords(text);
  console.log(`[1/5] body: ${text.length} chars, ~${words} words, usage=${JSON.stringify(usage)}`);
  if (words < 4000) {
    console.warn(`[1/5] WARNING: body is short (${words} words, target 6500+)`);
  }
  return text;
}

const StructuredSchema = z.object({
  title: z
    .string()
    .describe('Canonical "Common Name (Scientific name)" form taken from the article H1'),
  slug: z
    .string()
    .describe('URL slug derived from common name only, lowercase, hyphenated, no scientific name'),
  excerpt: z
    .string()
    .min(120)
    .max(220)
    .describe('Compelling 1-2 sentence summary used for OG description and RSS'),
  metaTitle: z.string().max(70).describe('SEO <title>, ≤70 chars, ends with " — Wildlife Universe"'),
  metaDescription: z.string().min(140).max(180).describe('SEO meta description, 140-180 chars'),
  metaKeywords: z.string().describe('Comma-separated SEO keywords, primary keyword first'),
  scientificName: z.string().describe('Full binomial scientific name from the article'),
  iucnStatus: z
    .enum(['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE'])
    .describe('IUCN Red List code: LC, NT, VU, EN, CR, EW, EX, DD, or NE'),
  tags: z.array(z.string()).min(4).max(10).describe('Topical tags for the post'),
  faq: z
    .array(
      z.object({
        question: z.string().min(8),
        answer: z.string().min(40),
      }),
    )
    .min(6)
    .max(12)
    .describe('FAQ extracted from the article\'s "Frequently Asked Questions" section'),
  readingTimeMinutes: z.number().int().positive().max(60),
});

async function extractStructured(body) {
  console.log('[2/5] extracting structured metadata...');
  const model = anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');
  const { object } = await generateObject({
    model,
    schema: StructuredSchema,
    system:
      'You are extracting structured metadata from a published wildlife article. Read the full HTML article body and return a JSON object matching the provided schema. Be faithful to the article — never invent information that is not present. Reading time should be word_count / 200 rounded up.',
    prompt: `Extract structured metadata from this article. Use the EXACT title from the H1, derive the slug from the common name only (e.g. "Sunda Pangolin (Manis javanica)" → "sunda-pangolin"), and extract every Q&A pair from the article's "Frequently Asked Questions" section into the faq array.

Article HTML:
${body}`,
    temperature: 0.2,
  });
  console.log(
    `[2/5] structured: title="${object.title}" slug="${object.slug}" iucn=${object.iucnStatus} faq=${object.faq.length} tags=${object.tags.length}`,
  );
  return object;
}

async function generateCoverImage(commonName, sciName) {
  console.log('[3/5] generating cover image with gpt-image-1...');
  const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Photorealistic wildlife photograph of a ${commonName} (${sciName}) in its true natural habitat. Eye-level perspective, environmental context giving sense of place, golden-hour lighting from the side, real catchlight in the eye, razor-sharp focus on the eye, creamy bokeh falloff in the background. Authentic field photograph, National Geographic / BBC Earth caliber, captured with Canon EOS R5 and RF 100-500mm telephoto at f/5.6, ISO 400, 1/1000s. Visible micro-detail in fur, scales, or feathers. Subtle film grain, neutral color science. ABSOLUTELY DO NOT PRODUCE: cartoon, illustration, 3D render, painting, anime, fantasy, plastic skin, oversaturated colors, halos around the subject, watermarks, signatures, text, frames, multiple subjects, anatomical errors.`;
  const res = await oai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1536x1024',
    quality: 'high',
    n: 1,
  });
  const buf = Buffer.from(res.data[0].b64_json, 'base64');
  console.log(`[3/5] image: ${buf.length} bytes`);
  return buf;
}

async function uploadCover(buffer, slug) {
  console.log('[4/5] uploading cover (avif + webp) to Supabase media bucket...');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const name = `pilot-${slug}-${Date.now()}`;
  const [avifBuf, webpBuf] = await Promise.all([
    sharp(buffer).avif({ quality: 78, effort: 4 }).toBuffer(),
    sharp(buffer).webp({ quality: 82, effort: 4 }).toBuffer(),
  ]);
  const [a, w] = await Promise.all([
    supabase.storage
      .from('media')
      .upload(`pilot/${name}.avif`, avifBuf, { contentType: 'image/avif', upsert: true }),
    supabase.storage
      .from('media')
      .upload(`pilot/${name}.webp`, webpBuf, { contentType: 'image/webp', upsert: true }),
  ]);
  if (a.error) throw new Error(`avif upload: ${a.error.message}`);
  if (w.error) throw new Error(`webp upload: ${w.error.message}`);
  // posts.cover is a TEXT column, so it must be a URL string (not an
  // upload-result object — that shape only persists for heroes.src on
  // the JSONB column). Use the WebP URL since every browser supports it.
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media`;
  const coverUrl = `${base}/pilot/${name}.webp`;
  console.log(`[4/5] cover URL: ${coverUrl}`);
  return coverUrl;
}

async function insertPost({ body, structured, cover }) {
  console.log('[5/5] inserting post into Supabase...');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const id = makePostId();
  const now = new Date().toISOString();
  const post = {
    id,
    slug: structured.slug,
    title: structured.title,
    body,
    category: 'animals',
    label: 'Mammals',
    description: structured.excerpt,
    excerpt: structured.excerpt,
    cover,
    featured: false,
    status: 'published',
    iucn_status: structured.iucnStatus,
    tags: structured.tags,
    meta_title: structured.metaTitle,
    meta_description: structured.metaDescription,
    meta_keywords: structured.metaKeywords,
    scientific_name: structured.scientificName,
    iucn_verified: false,
    faq: structured.faq,
    reading_time_minutes: structured.readingTimeMinutes,
    related_post_ids: [],
    publish_date: now,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase.from('posts').insert(post).select().single();
  if (error) throw new Error(`insert: ${error.message} (code=${error.code}, details=${error.details})`);
  console.log(`[5/5] post id=${data.id}`);
  return data;
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const species = process.argv[2] || 'Sunda Pangolin';
  console.log('\n=== Wildlife.Universe pilot article generator ===');
  console.log(`Species: ${species}\n`);

  for (const k of [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]) {
    if (!process.env[k]) {
      console.error(`Missing required env var: ${k}`);
      console.error('Run with: node --env-file=.env.local scripts/pilot-mammal-article.mjs "Species Name"');
      process.exit(2);
    }
  }

  const t0 = Date.now();
  const body = await generateBody(species);
  const structured = await extractStructured(body);
  const imgBuf = await generateCoverImage(species, structured.scientificName);
  const cover = await uploadCover(imgBuf, structured.slug);
  const post = await insertPost({ body, structured, cover });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\nDone in ${elapsed}s`);
  console.log(`Live URL: https://www.wildlifeuniverse.org/posts/${post.slug}`);
  console.log(`Slug:     ${post.slug}`);
  console.log(`ID:       ${post.id}`);
  console.log(`Words:    ~${countWords(post.body)}`);
  console.log(`FAQ:      ${structured.faq.length} questions`);
  console.log(`IUCN:     ${structured.iucnStatus}`);
  console.log('');
}

main().catch((err) => {
  console.error('\n[pilot] FAILED:', err);
  process.exit(1);
});

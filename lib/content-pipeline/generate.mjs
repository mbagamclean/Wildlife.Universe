/**
 * Shared article-generation pipeline.
 *
 * Used by both /api/admin/cron/generate-batch (Vercel cron) and any
 * one-off scripts. Steps mirror what the pilot produced:
 *
 *   1. Generate the body via Claude using the same ANIMALS_SYSTEM
 *      prompt the admin "AI write" button uses (no drift).
 *   2. Extract structured fields (slug, faq, scientific_name, etc.)
 *      via a follow-up generateObject call.
 *   3. Generate the cover image via DALL·E 3 HD.
 *   4. Convert to AVIF + WebP via sharp, upload to Supabase storage.
 *   5. Insert the post with status='published' (auto-publish path).
 *
 * Other category/label combinations (Birds, Insects, Plants, Posts)
 * will plug in their own prompt + builder pair as Phase 3 expands;
 * for now the shape only routes through ANIMALS_SYSTEM.
 */

import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import {
  ANIMALS_SYSTEM,
  RICH_FORMATTING_TOOLKIT,
  buildAnimalsPrompt,
  isAnimalsPost,
} from '../../app/api/ai/write/route.js';

// ─── Config ──────────────────────────────────────────────────────────

const STORAGE_BUCKET = 'media';
const STORAGE_PREFIX = 'cron'; // upload key prefix; pilot uses 'pilot'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

export function countWords(html) {
  return String(html).replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

function makePostId() {
  return 'p' + randomUUID().replace(/-/g, '').slice(0, 12);
}

// ─── Step 1: body ────────────────────────────────────────────────────

export async function generateArticleBody({ category, label, topic }) {
  const model = anthropic(ANTHROPIC_MODEL);
  // Pick the system prompt + user-prompt builder for the (category, label).
  // Currently animals-only; extend the switch as more categories ship.
  let system;
  let userPrompt;
  if (isAnimalsPost(category, label)) {
    system = ANIMALS_SYSTEM + '\n' + RICH_FORMATTING_TOOLKIT;
    userPrompt = buildAnimalsPrompt(topic, {});
  } else {
    throw new Error(
      `No content-pipeline prompt configured yet for category="${category}" label="${label}". ` +
        `Animals/Mammals/Reptiles/Amphibians/Fish are supported.`,
    );
  }
  const { text, usage } = await generateText({
    model,
    system,
    prompt: userPrompt,
    maxOutputTokens: 14000,
  });
  return { body: text, usage };
}

// ─── Step 2: structured field extraction ─────────────────────────────

// Normalize IUCN status from any common form (full name, mixed case,
// extra whitespace) to the 2-3 letter Red List code. Anything we can't
// recognise falls through to NE (Not Evaluated) so generation never
// fails on this field alone.
const IUCN_NORMALIZE = {
  'least concern': 'LC',
  'near threatened': 'NT',
  'vulnerable': 'VU',
  'endangered': 'EN',
  'critically endangered': 'CR',
  'extinct in the wild': 'EW',
  'extinct': 'EX',
  'data deficient': 'DD',
  'not evaluated': 'NE',
  'lc': 'LC', 'nt': 'NT', 'vu': 'VU', 'en': 'EN', 'cr': 'CR',
  'ew': 'EW', 'ex': 'EX', 'dd': 'DD', 'ne': 'NE',
};

export const StructuredSchema = z.object({
  title: z.string().describe('Canonical "Common Name (Scientific name)" form taken from the article H1'),
  slug: z.string().describe('URL slug derived from common name only, lowercase, hyphenated'),
  // Length bounds are loose enough that valid SEO-grade copy from any
  // model reliably passes; truncated to canonical sizes by the editor
  // if a future tighter render demands it.
  excerpt: z.string().min(60).max(320),
  metaTitle: z.string().max(80),
  metaDescription: z.string().min(80).max(220),
  metaKeywords: z.string(),
  scientificName: z.string(),
  iucnStatus: z.preprocess(
    (v) => IUCN_NORMALIZE[String(v ?? '').toLowerCase().trim()] ?? 'NE',
    z.enum(['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE']),
  ),
  tags: z.array(z.string()).min(3).max(15),
  faq: z
    .array(
      z.object({
        question: z.string().min(5),
        answer: z.string().min(20),
      }),
    )
    .min(5)
    .max(15),
  readingTimeMinutes: z.number().int().positive().max(120),
});

export async function extractStructuredFields(body) {
  const model = anthropic(ANTHROPIC_MODEL);
  const { object } = await generateObject({
    model,
    schema: StructuredSchema,
    system:
      'You are extracting structured metadata from a published wildlife article. Read the full HTML article body and return a JSON object matching the provided schema. Be faithful to the article — never invent information that is not present. Reading time should be word_count / 200 rounded up.',
    prompt: `Extract structured metadata from this article. Use the EXACT title from the H1, derive the slug from the common name only (e.g. "Sunda Pangolin (Manis javanica)" → "sunda-pangolin"), and extract every Q&A pair from the article's "Frequently Asked Questions" section into the faq array.

Article HTML:
${body}`,
  });
  return object;
}

// ─── Step 3: cover image ─────────────────────────────────────────────

export async function generateCoverImage({ commonName, sciName }) {
  const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Photorealistic wildlife photograph of a ${commonName} (${sciName}) in its true natural habitat. Eye-level perspective, environmental context giving sense of place, golden-hour lighting from the side, real catchlight in the eye, razor-sharp focus on the eye, creamy bokeh falloff in the background. Authentic field photograph, National Geographic / BBC Earth caliber, captured with Canon EOS R5 and RF 100-500mm telephoto at f/5.6, ISO 400, 1/1000s. Visible micro-detail in fur, scales, or feathers. Subtle film grain, neutral color science. ABSOLUTELY DO NOT PRODUCE: cartoon, illustration, 3D render, painting, anime, fantasy, plastic skin, oversaturated colors, halos around the subject, watermarks, signatures, text, frames, multiple subjects, anatomical errors.`;
  const res = await oai.images.generate({
    model: 'dall-e-3',
    prompt,
    size: '1792x1024',
    quality: 'hd',
    style: 'natural',
    n: 1,
  });
  const url = res.data[0].url;
  return Buffer.from(await (await fetch(url)).arrayBuffer());
}

// ─── Step 4: upload cover ────────────────────────────────────────────

export async function uploadCoverImage(buffer, slug) {
  const sb = adminSupabase();
  const name = `${slug}-${Date.now()}`;
  const [avifBuf, webpBuf] = await Promise.all([
    sharp(buffer).avif({ quality: 78, effort: 4 }).toBuffer(),
    sharp(buffer).webp({ quality: 82, effort: 4 }).toBuffer(),
  ]);
  const [a, w] = await Promise.all([
    sb.storage
      .from(STORAGE_BUCKET)
      .upload(`${STORAGE_PREFIX}/${name}.avif`, avifBuf, { contentType: 'image/avif', upsert: true }),
    sb.storage
      .from(STORAGE_BUCKET)
      .upload(`${STORAGE_PREFIX}/${name}.webp`, webpBuf, { contentType: 'image/webp', upsert: true }),
  ]);
  if (a.error) throw new Error(`avif upload: ${a.error.message}`);
  if (w.error) throw new Error(`webp upload: ${w.error.message}`);
  // posts.cover is a TEXT column → store the WebP URL as a plain string.
  // Every modern browser supports WebP; the AVIF is uploaded for use by
  // ResponsiveImage if a future migration moves cover to JSONB.
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${STORAGE_PREFIX}/${name}.webp`;
}

// ─── Step 5: insert post ─────────────────────────────────────────────

export async function insertGeneratedPost({ body, structured, coverUrl, category, label, status = 'published' }) {
  const sb = adminSupabase();
  const id = makePostId();
  const now = new Date().toISOString();
  const post = {
    id,
    slug: structured.slug,
    title: structured.title,
    body,
    category,
    label,
    description: structured.excerpt,
    excerpt: structured.excerpt,
    cover: coverUrl,
    featured: false,
    status,
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
  const { data, error } = await sb.from('posts').insert(post).select().single();
  if (error) {
    throw new Error(`db insert: ${error.message}${error.code ? ` (${error.code})` : ''}`);
  }
  return data;
}

// ─── Top-level pipeline ──────────────────────────────────────────────

/**
 * End-to-end: body → structured → image → upload → insert.
 * Throws on any step's failure. The caller (cron worker, script) decides
 * whether to retry, mark queue row failed, or surface the error.
 *
 * Returns: { post, usage, costEstimateUsd }
 */
export async function generateAndInsertPost({ category, label, topic, status = 'published' }) {
  const t0 = Date.now();

  const { body, usage } = await generateArticleBody({ category, label, topic });
  const structured = await extractStructuredFields(body);

  // Sanity-check: extracted scientific name should match what's in the H1.
  // If the model lost it on extraction, fall back to the topic-supplied one.
  const sciNameMatch = topic.match(/\(([^)]+)\)/);
  const fallbackSci = sciNameMatch ? sciNameMatch[1].trim() : '';
  const sciName = structured.scientificName || fallbackSci;
  const commonName = topic.replace(/\s*\([^)]+\)\s*$/, '').trim();

  const imgBuf = await generateCoverImage({ commonName, sciName });
  const coverUrl = await uploadCoverImage(imgBuf, structured.slug);
  const post = await insertGeneratedPost({ body, structured, coverUrl, category, label, status });

  // Rough cost estimate: Opus 4.7 in/out + DALL·E 3 HD. Tune as needed.
  const inputTok = usage?.inputTokens ?? 0;
  const outputTok = usage?.outputTokens ?? 0;
  const opusCost = inputTok * 0.000015 + outputTok * 0.000075;
  const dalleCost = 0.08;
  const costEstimateUsd = +(opusCost + dalleCost + 0.01).toFixed(4); // +0.01 for structured-extract

  return {
    post,
    usage,
    costEstimateUsd,
    elapsedMs: Date.now() - t0,
  };
}

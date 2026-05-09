/**
 * /api/admin/categories/ai-generate — one-shot category content generator.
 *
 * Body: { name, slug, labels?: string[], existing?: object }
 * Returns: a structured object with all editor-visible fields populated
 * by Claude. The admin editor merges the result into local state so the
 * user can review + tweak before saving — nothing is written to the DB
 * from this route.
 *
 * Auth: same staff-role gate as /api/admin/posts.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

const Schema = z.object({
  shortDescription: z
    .string()
    .min(40)
    .max(180)
    .describe('A single tagline — vivid, documentary-tone, 100–170 characters preferred.'),
  description: z
    .string()
    .min(220)
    .describe(
      'Full editorial introduction for the category landing page. Two to four short paragraphs (HTML <p> tags allowed but not required), 200–400 words, documentary tone, no clickbait, no AI-tells (avoid words like delve, navigate, in today\'s world). Mentions the kinds of species + ecosystems readers will find.',
    ),
  seoTitle: z.string().min(30).max(70).describe('Final <title>. Keep ≤ 65 chars including site suffix.'),
  seoDescription: z
    .string()
    .min(120)
    .max(180)
    .describe('Meta description. 140–160 chars sweet spot. Active voice, primary keyword early, no truncation.'),
  seoKeywords: z
    .string()
    .describe('8–12 comma-separated SEO keywords. Mix head terms (the category itself) with long-tail variants and 2–3 species names.'),
  ogTitle: z.string().min(20).max(80).describe('Open Graph title. Can be slightly punchier than seoTitle.'),
  ogDescription: z
    .string()
    .min(80)
    .max(220)
    .describe('Open Graph description for shared cards. Slightly more conversational than seoDescription.'),
  twitterTitle: z.string().min(20).max(80),
  twitterDescription: z.string().min(80).max(200),
  imageAlt: z
    .string()
    .min(20)
    .max(160)
    .describe('Concise, descriptive alt text for the hero image. No "image of" or "picture of".'),
  imageCaption: z
    .string()
    .min(15)
    .max(140)
    .describe('Short editorial caption shown under the hero on the category page.'),
});

export async function POST(req) {
  // Auth — match the rest of /api/admin/*
  const ssr = await createClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await ssr.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: 'name-required' }, { status: 400 });

  const { name, slug, labels = [], existing = {} } = body;

  // Opus for the structured-extract reliability we already rely on
  // elsewhere in the pipeline; Sonnet's tool-call output is unreliable
  // for strict Zod schemas (see Bengal Tiger debugging notes in the
  // batch worker history).
  const model = anthropic('claude-opus-4-7');

  try {
    const { object } = await generateObject({
      model,
      schema: Schema,
      system: [
        'You are the senior editorial + SEO lead for Wildlife Universe (wildlifeuniverse.org), a premium nature publication.',
        'Tone: documentary, scientifically literate, accessible. Think National Geographic + BBC Earth.',
        'Avoid AI-sounding clichés: never use "delve", "in today\'s world", "navigate", "in the realm of", "as we explore", "harness".',
        'Wildlife Universe organises content into categories (Animals, Birds, Insects, Plants, Posts) and per-category labels (e.g. Mammals, Reptiles, Amphibians, Fish under Animals).',
        'When writing for a category, focus on what kinds of species + ecosystems readers will find here. Don\'t repeat the category name as filler.',
        'SEO: lead with the primary keyword (the category name), include 2–3 species or label names that link the category to long-tail searches.',
      ].join('\n'),
      prompt: [
        `Category name: ${name}`,
        slug ? `Slug: ${slug}` : null,
        labels.length ? `Labels under this category: ${labels.join(', ')}` : null,
        existing.shortDescription
          ? `Existing short description (improve, don\'t blindly rewrite if it\'s good): ${existing.shortDescription}`
          : null,
        existing.description
          ? `Existing description (improve, don\'t blindly rewrite if it\'s good): ${existing.description.slice(0, 600)}`
          : null,
        '',
        'Generate every field in the schema. Each field should stand on its own — do not assume readers will see the others.',
      ]
        .filter(Boolean)
        .join('\n'),
    });

    return NextResponse.json({ ok: true, data: object });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'generation-failed', detail: String(err?.message || err).slice(0, 400) },
      { status: 500 },
    );
  }
}

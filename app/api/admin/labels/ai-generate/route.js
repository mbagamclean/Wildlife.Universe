/**
 * /api/admin/labels/ai-generate — one-shot label content generator.
 * Companion to /api/admin/categories/ai-generate but with the prompt
 * tuned for narrower, label-level scopes (e.g. "Mammals under Animals"
 * vs "Animals" itself). Same Opus + generateObject pattern.
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
  shortDescription: z.string().min(40).max(180),
  description: z.string().min(220),
  seoTitle: z.string().min(30).max(70),
  seoDescription: z.string().min(120).max(180),
  seoKeywords: z.string(),
  ogTitle: z.string().min(20).max(80),
  ogDescription: z.string().min(80).max(220),
  twitterTitle: z.string().min(20).max(80),
  twitterDescription: z.string().min(80).max(200),
  imageAlt: z.string().min(20).max(160),
  imageCaption: z.string().min(15).max(140),
});

export async function POST(req) {
  const ssr = await createClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await ssr.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.categoryName) {
    return NextResponse.json({ error: 'name-and-category-required' }, { status: 400 });
  }

  const { name, categoryName, slug, categorySlug, existing = {} } = body;

  const model = anthropic('claude-opus-4-7');

  try {
    const { object } = await generateObject({
      model,
      schema: Schema,
      system: [
        'You are the senior editorial + SEO lead for Wildlife Universe (wildlifeuniverse.org).',
        'Tone: documentary, scientifically literate, accessible. National Geographic + BBC Earth.',
        'Avoid AI-sounding clichés: never use "delve", "in today\'s world", "navigate", "in the realm of", "as we explore", "harness".',
        'Wildlife Universe groups content into categories (Animals, Birds, Insects, Plants, Posts) and labels under each (e.g. Mammals, Reptiles, Amphibians, Fish under Animals).',
        'You are writing for a SPECIFIC LABEL, not the whole category — narrow the focus to species + ecosystems that fit only this label.',
        'SEO: lead with the label name, mention 2–3 representative species, link the topical scope to long-tail searches.',
      ].join('\n'),
      prompt: [
        `Label: ${name}`,
        `Belongs to category: ${categoryName}${categorySlug ? ` (/${categorySlug})` : ''}`,
        slug ? `Slug: ${slug}` : null,
        existing.shortDescription ? `Existing short description: ${existing.shortDescription}` : null,
        existing.description ? `Existing description: ${existing.description.slice(0, 600)}` : null,
        '',
        `Generate every field. Each must focus narrowly on ${name} (within the wider ${categoryName} group) — not on the parent category as a whole.`,
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

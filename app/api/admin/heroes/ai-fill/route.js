/**
 * /api/admin/heroes/ai-fill — AI hero copy generator.
 *
 * Picks a source post (filtered by optional category + label, defaults
 * to the latest published post overall) and writes hero-section copy
 * that links to it. Supports per-field generation (one ✨ button at a
 * time) and a single all-fields call.
 *
 * Body:
 *   {
 *     field: 'all' | 'title' | 'description' | 'ctaLabel' | 'ctaHref',
 *     category?: string,        // 'animals' | 'birds' | 'insects' | 'plants' | 'posts' | null
 *     label?: string,           // optional label name (e.g. 'Mammals')
 *     currentValues?: {         // shown to the model as context only
 *       title?, description?, ctaLabel?, ctaHref?
 *     }
 *   }
 *
 * Response on success:
 *   {
 *     ok: true,
 *     data: { title?, description?, ctaLabel?, ctaHref? },
 *     sourcePost: { title, slug, category, label }
 *   }
 *
 * Auth: staff role only. Same gate as the rest of /api/admin/*.
 */

import { NextResponse } from 'next/server';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 30;

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function pickSourcePost({ category, label }) {
  const sb = adminClient();
  let q = sb
    .from('posts')
    .select('slug, title, description, excerpt, category, label, scientific_name')
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1);
  if (category) q = q.eq('category', category);
  if (label) q = q.eq('label', label);
  const { data, error } = await q;
  if (error) return null;
  return (data && data[0]) || null;
}

const FieldSchemaAll = z.object({
  title: z
    .string()
    .min(8)
    .max(80)
    .describe('4–8 words, no end punctuation. Curious reader hook, no clickbait, no clichés.'),
  description: z
    .string()
    .min(40)
    .max(220)
    .describe('1–2 short sentences, ~20–35 words. Ends with a question or forward-looking phrase that opens a curiosity loop.'),
  ctaLabel: z
    .string()
    .min(2)
    .max(20)
    .describe('1–3 words. Action verb. Energetic. Examples: "See why", "Find out", "Meet them", "Read on", "Watch it".'),
});

const FieldSchemaTitle = FieldSchemaAll.pick({ title: true });
const FieldSchemaDescription = FieldSchemaAll.pick({ description: true });
const FieldSchemaCtaLabel = FieldSchemaAll.pick({ ctaLabel: true });

const SYSTEM_PROMPT = [
  'You are a wildlife professor with a marketing degree, writing hero-section copy for the homepage of Wildlife.Universe (a premium nature publication, similar tone to BBC Earth and National Geographic).',
  '',
  'Your job: turn one source post into a tight, click-worthy hero. The reader must feel a question forming in their head — and feel they can answer it by clicking through.',
  '',
  'Rules — non-negotiable:',
  '1. Be scientifically honest. Never invent facts not present in the source post.',
  '2. Use simple words a smart 12-year-old would understand.',
  '3. Active voice, present tense where possible.',
  '4. Confident, declarative. Never hedged ("might be one of", "could be considered").',
  '5. Open a curiosity loop. The headline + description together should leave a specific question unanswered.',
  '',
  'Banned phrases (instant clichés — never use):',
  '- "Discover the secrets of …"',
  '- "amazing", "incredible", "unbelievable", "majestic", "stunning", "breathtaking"',
  '- "you won\'t believe", "scientists hate this", "this one trick"',
  '- "delve", "in today\'s world", "in the realm of", "navigate", "harness"',
  '- "Welcome to" (start)',
  '- Any sentence that starts with the species name as the subject ("The lion is …")',
  '',
  'Tone target: a senior nature writer who knows their stuff, talking to a curious friend.',
].join('\n');

function buildUserPrompt({ field, post, currentValues }) {
  const lines = [
    'SOURCE POST:',
    `- Title: ${post.title}`,
    post.description ? `- Excerpt: ${post.description}` : null,
    `- Category / Label: ${post.category || '—'} → ${post.label || '—'}`,
    post.scientific_name ? `- Scientific name: ${post.scientific_name}` : null,
    '',
    `This hero will link to /posts/${post.slug}`,
    '',
  ].filter(Boolean);

  if (currentValues && (currentValues.title || currentValues.description || currentValues.ctaLabel)) {
    lines.push('CURRENT HERO COPY (for context — refine, don\'t parrot):');
    if (currentValues.title) lines.push(`- title: ${currentValues.title}`);
    if (currentValues.description) lines.push(`- description: ${currentValues.description}`);
    if (currentValues.ctaLabel) lines.push(`- ctaLabel: ${currentValues.ctaLabel}`);
    lines.push('');
  }

  if (field === 'all') {
    lines.push(
      'Generate ALL three fields: title, description, ctaLabel.',
      'Each must work standalone but feel like a coherent set.',
    );
  } else if (field === 'title') {
    lines.push('Generate only the TITLE field. 4–8 words, no end punctuation, hooks curiosity without lying.');
  } else if (field === 'description') {
    lines.push('Generate only the DESCRIPTION field. 1–2 short sentences, ~20–35 words, end with a question or forward-looking phrase that opens a curiosity loop.');
  } else if (field === 'ctaLabel') {
    lines.push('Generate only the CTA LABEL field. 1–3 words, action verb, energetic ("See why", "Find out", "Meet them").');
  }

  return lines.join('\n');
}

async function callClaude({ field, post, currentValues }) {
  const model = anthropic('claude-sonnet-4-6');
  const schema =
    field === 'all'
      ? FieldSchemaAll
      : field === 'title'
        ? FieldSchemaTitle
        : field === 'description'
          ? FieldSchemaDescription
          : FieldSchemaCtaLabel;

  const { object } = await generateObject({
    model,
    schema,
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt({ field, post, currentValues }),
  });
  return object;
}

export async function POST(req) {
  // Auth — same staff-role gate as the other admin AI endpoints.
  const ssr = await createSSRClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await ssr.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.field) {
    return NextResponse.json({ ok: false, error: 'field-required' }, { status: 400 });
  }
  const field = body.field;
  if (!['all', 'title', 'description', 'ctaLabel', 'ctaHref'].includes(field)) {
    return NextResponse.json({ ok: false, error: 'invalid-field' }, { status: 400 });
  }

  const category = typeof body.category === 'string' && body.category ? body.category : null;
  const label = typeof body.label === 'string' && body.label ? body.label : null;
  const currentValues = body.currentValues || {};

  const post = await pickSourcePost({ category, label });
  if (!post) {
    return NextResponse.json(
      { ok: false, error: 'no-source-post', detail: category || label ? `No published posts under ${category}${label ? ' / ' + label : ''}.` : 'No published posts found.' },
      { status: 404 },
    );
  }

  const sourcePost = {
    title: post.title,
    slug: post.slug,
    category: post.category,
    label: post.label,
  };

  // ctaHref alone never needs Claude — it's the source post's URL.
  if (field === 'ctaHref') {
    return NextResponse.json({
      ok: true,
      data: { ctaHref: `/posts/${post.slug}` },
      sourcePost,
    });
  }

  try {
    const generated = await callClaude({ field, post, currentValues });
    const data = { ...generated };
    // 'all' implicitly fills the CTA href too — saves an extra click.
    if (field === 'all') data.ctaHref = `/posts/${post.slug}`;
    return NextResponse.json({ ok: true, data, sourcePost });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: 'generation-failed',
        detail: String(err?.message || err).slice(0, 400),
      },
      { status: 500 },
    );
  }
}

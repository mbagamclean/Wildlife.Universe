/**
 * /api/admin/queue/seed — admin-triggered topic seeder.
 *
 * POST { category, label, count } → asks Claude for N high-quality topic
 * titles in canonical "Common Name (Scientific name)" form for the
 * given category/label pair, filters out anything already in
 * content_queue or already published, and queues the rest for the
 * cron worker.
 *
 * Auth: same staff-role gate as other /api/admin/* routes.
 */

import { NextResponse } from 'next/server';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { categories } from '@/lib/mock/categories';

export const runtime = 'nodejs';
export const maxDuration = 60;

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);
const MAX_COUNT_PER_REQUEST = 30;

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const TopicListSchema = z.object({
  topics: z
    .array(
      z.object({
        commonName: z.string().min(2),
        scientificName: z.string().min(2),
      }),
    )
    .min(1)
    .max(MAX_COUNT_PER_REQUEST),
});

function buildSeederPrompt(category, label, count) {
  return `Generate ${count} high-quality wildlife article topics for a website covering ${category} → ${label}.

REQUIREMENTS
- Each topic is a single SPECIES (not a group, family, or general theme).
- Topics must be appropriate for the category="${category}" and label="${label}" combination. For example, label "Mammals" → only mammals; label "Raptors" → only birds of prey; label "Trees" → only tree species; label "Arthropoda" → arthropod species.
- Prioritise species that are: (a) ecologically interesting, (b) charismatic or under-publicised, (c) of conservation concern, (d) globally distributed across continents — avoid having every species be from the same country.
- Use the most widely recognised English COMMON NAME and the FULL binomial scientific name.
- No duplicates. No subspecies unless the subspecies is the recognised conservation unit.
- No hybrids, no domestic-only species (unless the category is specifically about that).

OUTPUT
Return exactly ${count} {commonName, scientificName} pairs, ordered by SEO value (most-searched first).`;
}

function makeQueueId() {
  return 'q' + randomUUID().replace(/-/g, '').slice(0, 12);
}

export async function POST(req) {
  // Auth — same pattern as /api/admin/posts
  const ssr = await createSSRClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await ssr.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  const { category, label, count } = body;

  // Validate category + label against known taxonomy
  const cat = categories.find((c) => c.slug === category);
  if (!cat) return NextResponse.json({ error: 'unknown-category', valid: categories.map((c) => c.slug) }, { status: 400 });
  if (!cat.labels.includes(label)) {
    return NextResponse.json({ error: 'unknown-label', valid: cat.labels }, { status: 400 });
  }
  const requestedCount = Math.max(1, Math.min(MAX_COUNT_PER_REQUEST, Number.parseInt(count, 10) || 0));
  if (requestedCount === 0) return NextResponse.json({ error: 'count-must-be-positive' }, { status: 400 });

  // Ask Claude for N topics
  const model = anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');
  let topics;
  try {
    const { object } = await generateObject({
      model,
      schema: TopicListSchema,
      prompt: buildSeederPrompt(cat.slug, label, requestedCount),
    });
    topics = object.topics;
  } catch (err) {
    return NextResponse.json({ error: 'topic-generation-failed', detail: err.message }, { status: 500 });
  }

  // Build canonical titles
  const candidates = topics.map((t) => ({
    title: `${t.commonName.trim()} (${t.scientificName.trim()})`,
    commonName: t.commonName.trim(),
  }));

  // Dedup against existing queue + already-published posts
  const sb = adminSupabase();
  const titleList = candidates.map((c) => c.title);
  const [existingQueue, existingPosts] = await Promise.all([
    sb.from('content_queue').select('topic').in('topic', titleList),
    sb.from('posts').select('title').in('title', titleList).neq('status', 'draft'),
  ]);
  const taken = new Set([
    ...(existingQueue.data || []).map((r) => r.topic),
    ...(existingPosts.data || []).map((r) => r.title),
  ]);
  const fresh = candidates.filter((c) => !taken.has(c.title));

  if (fresh.length === 0) {
    return NextResponse.json({
      ok: true,
      requested: requestedCount,
      proposed: candidates.length,
      duplicates: candidates.length,
      queued: 0,
      topics: candidates.map((c) => ({ ...c, queued: false })),
    });
  }

  // Insert into content_queue
  const rows = fresh.map((c) => ({
    id: makeQueueId(),
    category: cat.slug,
    label,
    topic: c.title,
    status: 'pending',
    priority: 0,
  }));
  const { error: insertErr } = await sb.from('content_queue').insert(rows);
  if (insertErr) {
    return NextResponse.json({ error: 'queue-insert-failed', detail: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    requested: requestedCount,
    proposed: candidates.length,
    duplicates: candidates.length - fresh.length,
    queued: fresh.length,
    topics: candidates.map((c) => ({ ...c, queued: !taken.has(c.title) })),
  });
}

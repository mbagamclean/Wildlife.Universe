/**
 * /api/admin/cron/generate-batch — Vercel cron-triggered batch worker.
 *
 * Picks up to ?n=N pending content_queue rows, runs each through the
 * shared content-pipeline (body → structured → image → upload → insert),
 * runs quality + dedup gates, and updates the queue row's status.
 *
 * Auth: requires Authorization: Bearer <CRON_SECRET>. Vercel cron sends
 * this header automatically when CRON_SECRET is set in project env.
 *
 * Daily cost cap: refuses to generate more than MAX_DAILY_ARTICLES
 * articles in any rolling 24-hour window. Default 8.
 */

import { createClient } from '@supabase/supabase-js';
import { generateAndInsertPost } from '@/lib/content-pipeline/generate';
import { validateGeneratedPost } from '@/lib/content-pipeline/quality';
import { isDuplicateOfExisting } from '@/lib/content-pipeline/dedup';

export const runtime = 'nodejs';
export const maxDuration = 300; // up to 5 minutes per invocation

const MAX_ATTEMPTS = 3;
const MAX_DAILY_ARTICLES = Number.parseInt(process.env.MAX_DAILY_ARTICLES, 10) || 8;
const MAX_BATCH_SIZE = 4; // hard ceiling so a runaway ?n= can't blow the budget

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function unauthorized(reason) {
  return new Response(JSON.stringify({ ok: false, reason }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function checkAuth(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Don't run unprotected. If CRON_SECRET isn't configured, refuse.
    return { ok: false, reason: 'cron-secret-not-configured' };
  }
  const got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (got !== expected) return { ok: false, reason: 'invalid-token' };
  return { ok: true };
}

async function countLast24h(sb) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb
    .from('content_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'generated')
    .gte('generated_at', since);
  return count ?? 0;
}

async function claimRow(sb, row) {
  // Optimistic claim — if status changed since we read it, the worker
  // skips it. Avoids two concurrent crons grabbing the same row.
  const { data, error } = await sb
    .from('content_queue')
    .update({ status: 'generating', attempts: row.attempts + 1 })
    .eq('id', row.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

async function markFailed(sb, rowId, reason) {
  await sb
    .from('content_queue')
    .update({ status: 'failed', last_error: String(reason).slice(0, 1000) })
    .eq('id', rowId);
}

async function markPending(sb, rowId, reason) {
  // Soft-fail: keep retryable, just back-off the queue.
  await sb
    .from('content_queue')
    .update({ status: 'pending', last_error: String(reason).slice(0, 1000) })
    .eq('id', rowId);
}

async function markGenerated(sb, rowId, postId) {
  await sb
    .from('content_queue')
    .update({
      status: 'generated',
      generated_post_id: postId,
      generated_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', rowId);
}

async function processOne(sb, row) {
  // 1. Generate the article via the shared pipeline
  let result;
  try {
    result = await generateAndInsertPost({
      category: row.category,
      label: row.label,
      topic: row.topic,
      status: 'draft', // hold as draft until quality + dedup pass
    });
  } catch (err) {
    if (row.attempts >= MAX_ATTEMPTS) {
      await markFailed(sb, row.id, `generation-failed-final: ${err.message}`);
    } else {
      await markPending(sb, row.id, `generation-failed-retry-${row.attempts}: ${err.message}`);
    }
    return { ok: false, queueId: row.id, error: err.message };
  }

  // 2. Quality gate — runs against the just-inserted post (already in DB
  //    as draft). On fail we leave it as draft and mark the queue row failed.
  const quality = validateGeneratedPost({
    body: result.post.body,
    structured: {
      scientificName: result.post.scientific_name,
      slug: result.post.slug,
      iucnStatus: result.post.iucn_status,
      faq: result.post.faq,
    },
    coverUrl: typeof result.post.cover === 'string' ? result.post.cover : null,
  });
  if (!quality.ok) {
    await markFailed(sb, row.id, `quality-gate: ${quality.reasons.join('; ')}`);
    return { ok: false, queueId: row.id, postId: result.post.id, error: quality.reasons };
  }

  // 3. Dedup
  const dup = await isDuplicateOfExisting({
    structured: {
      title: result.post.title,
      slug: result.post.slug,
      scientificName: result.post.scientific_name,
    },
    body: result.post.body,
    category: row.category,
  });
  if (dup.isDuplicate) {
    await markFailed(sb, row.id, `dedup: ${dup.reason} (matched ${dup.matchedPostId})`);
    return { ok: false, queueId: row.id, postId: result.post.id, error: dup.reason };
  }

  // 4. Promote draft → published
  await sb.from('posts').update({ status: 'published' }).eq('id', result.post.id);
  await markGenerated(sb, row.id, result.post.id);

  return {
    ok: true,
    queueId: row.id,
    postId: result.post.id,
    slug: result.post.slug,
    costEstimateUsd: result.costEstimateUsd,
    elapsedMs: result.elapsedMs,
  };
}

export async function POST(req) {
  const auth = checkAuth(req);
  if (!auth.ok) return unauthorized(auth.reason);

  const url = new URL(req.url);
  const requested = Math.max(1, Math.min(MAX_BATCH_SIZE, Number.parseInt(url.searchParams.get('n'), 10) || 1));
  const sb = admin();

  // Daily cost cap
  const last24h = await countLast24h(sb);
  if (last24h >= MAX_DAILY_ARTICLES) {
    return Response.json({
      ok: true,
      processed: 0,
      results: [],
      reason: 'daily-cap-reached',
      last24h,
      cap: MAX_DAILY_ARTICLES,
    });
  }
  const remaining = MAX_DAILY_ARTICLES - last24h;
  const n = Math.min(requested, remaining);

  // Pick pending rows
  const { data: rows, error } = await sb
    .from('content_queue')
    .select('id, category, label, topic, attempts, priority')
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(n);
  if (error) {
    return Response.json({ ok: false, reason: 'queue-read-failed', detail: error.message }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return Response.json({ ok: true, processed: 0, results: [], reason: 'queue-empty' });
  }

  // Process sequentially (each generation hits Anthropic + OpenAI; running
  // in parallel would just rate-limit ourselves and confuse cost tracking).
  const results = [];
  for (const row of rows) {
    const claimed = await claimRow(sb, row);
    if (!claimed) {
      results.push({ ok: false, queueId: row.id, error: 'lost-claim-race' });
      continue;
    }
    try {
      results.push(await processOne(sb, row));
    } catch (err) {
      // Last-resort safety: any unexpected throw → mark failed so the
      // queue row doesn't sit stuck in 'generating' forever.
      await markFailed(sb, row.id, `unexpected: ${err.message}`);
      results.push({ ok: false, queueId: row.id, error: err.message });
    }
  }

  return Response.json({
    ok: true,
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    last24hBefore: last24h,
    results,
  });
}

// Allow GET for Vercel cron: Vercel cron pings GET, not POST. Both work.
export const GET = POST;

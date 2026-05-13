/**
 * GitHub Actions cron worker — picks N pending content_queue rows and
 * runs them through the shared content pipeline.
 *
 * Run locally:
 *   node --env-file=.env.local scripts/cron-batch.mjs [n]
 *
 * On GH Actions:
 *   ANTHROPIC_API_KEY, OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
 *   SUPABASE_SERVICE_ROLE_KEY are injected from repo secrets. The
 *   workflow file passes `n` as the first argv.
 *
 * Mirrors /api/admin/cron/generate-batch — same retry, daily-cap, and
 * draft-then-promote semantics. Lives outside Vercel's 60s function
 * limit so each generation gets the full 60-90s it needs.
 */

import { createClient } from '@supabase/supabase-js';
import { generateAndInsertPost } from '../lib/content-pipeline/generate.mjs';
import { validateGeneratedPost } from '../lib/content-pipeline/quality.mjs';
import { isDuplicateOfExisting } from '../lib/content-pipeline/dedup.mjs';

const MAX_ATTEMPTS = 3;
const MAX_BATCH_SIZE = 4;
const MAX_DAILY_ARTICLES = Number.parseInt(process.env.MAX_DAILY_ARTICLES, 10) || 8;
// A run that takes more than this is dead — the workflow's
// timeout-minutes is 30, so anything past 20 has been killed by the
// runner. The janitor reclaims those rows back to pending.
const STALE_GENERATING_MS = 20 * 60 * 1000;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wildlifeuniverse.org').replace(/\/$/, '');
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';

// Fire-and-forget — IndexNow tells Bing / Yandex / Naver / Seznam about
// freshly published URLs. Google retired its public ping endpoint in
// 2023; for Google we still rely on Search Console + sitemap crawl.
async function pingIndexNow(slug) {
  if (!INDEXNOW_KEY || !slug) return;
  const host = SITE_URL.replace(/^https?:\/\//, '');
  const url = `${SITE_URL}/posts/${slug}`;
  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: [url],
      }),
    });
    console.log(`[batch] indexnow ${url} → HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[batch] indexnow ping failed for ${url}: ${err.message}`);
  }
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
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
  const { data } = await sb
    .from('content_queue')
    .update({ status: 'generating', attempts: row.attempts + 1 })
    .eq('id', row.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  return Boolean(data);
}

async function markFailed(sb, rowId, reason) {
  await sb
    .from('content_queue')
    .update({ status: 'failed', last_error: String(reason).slice(0, 1000) })
    .eq('id', rowId);
}

async function markPending(sb, rowId, reason) {
  await sb
    .from('content_queue')
    .update({ status: 'pending', last_error: String(reason).slice(0, 1000) })
    .eq('id', rowId);
}

/**
 * Self-healing janitor. Runs at the start of every cron invocation so a
 * crashed worker or a future "silently retire a row" bug can't quietly
 * shrink the queue past the point where it stops producing. Two passes:
 *
 *   1. Rows stuck in `generating` for >STALE_GENERATING_MS were claimed by
 *      a worker that died (GH Actions OOM, network drop, runner timeout).
 *      Flip back to `pending` so the next claim can retry them.
 *
 *   2. Rows stuck in `pending` with attempts >= MAX_ATTEMPTS are invisible
 *      to the worker's `.lt('attempts', MAX_ATTEMPTS)` filter and would
 *      sit forever. Mark them `failed` so the queue accounting is honest.
 *      Without this, ONE outage can permanently retire rows.
 */
async function janitor(sb) {
  const staleCutoff = new Date(Date.now() - STALE_GENERATING_MS).toISOString();
  const { data: reclaimed } = await sb
    .from('content_queue')
    .update({ status: 'pending', last_error: 'janitor: reclaimed-stale-generating' })
    .eq('status', 'generating')
    .lt('updated_at', staleCutoff)
    .select('id');
  if (reclaimed?.length) {
    console.log(`[janitor] reclaimed ${reclaimed.length} stale-generating row(s)`);
  }

  const { data: zombies } = await sb
    .from('content_queue')
    .update({ status: 'failed', last_error: 'janitor: max-attempts-exhausted' })
    .eq('status', 'pending')
    .gte('attempts', MAX_ATTEMPTS)
    .select('id');
  if (zombies?.length) {
    console.log(`[janitor] marked ${zombies.length} attempts-exhausted row(s) as failed`);
  }
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
  console.log(`\n[batch] processing ${row.id}: ${row.category}/${row.label} → ${row.topic}`);
  let result;
  try {
    result = await generateAndInsertPost({
      category: row.category,
      label: row.label,
      topic: row.topic,
      status: 'draft',
    });
    console.log(`[batch] generated draft post ${result.post.id} in ${(result.elapsedMs / 1000).toFixed(1)}s, ~$${result.costEstimateUsd}`);
  } catch (err) {
    // `claimRow` already incremented attempts in the DB to row.attempts+1.
    // The retry decision must use that post-claim value, otherwise the
    // very last attempt always lands in markPending and the row sticks at
    // attempts=MAX_ATTEMPTS in `pending` — invisible to the next run's
    // `.lt('attempts', MAX_ATTEMPTS)` filter forever.
    const dbAttempts = row.attempts + 1;
    const phase = err.phase || 'unknown';
    const tagged = `[${phase}] ${err.message}`;
    if (dbAttempts >= MAX_ATTEMPTS) {
      await markFailed(sb, row.id, `generation-failed-final: ${tagged}`);
      console.error(`[batch] FAILED after ${dbAttempts} attempt(s): ${tagged}`);
    } else {
      await markPending(sb, row.id, `generation-failed-retry-${dbAttempts}: ${tagged}`);
      console.warn(`[batch] generation failed (attempt ${dbAttempts}, will retry): ${tagged}`);
    }
    return { ok: false, queueId: row.id, error: tagged };
  }

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
    await markFailed(sb, row.id, `[quality] ${quality.reasons.join('; ')}`);
    console.warn(`[batch] quality gate REJECTED: ${quality.reasons.join('; ')} (post stays draft)`);
    return { ok: false, queueId: row.id, postId: result.post.id, error: quality.reasons };
  }

  const dup = await isDuplicateOfExisting({
    structured: {
      title: result.post.title,
      slug: result.post.slug,
      scientificName: result.post.scientific_name,
    },
    body: result.post.body,
    category: row.category,
    excludePostId: result.post.id,
  });
  if (dup.isDuplicate) {
    await markFailed(sb, row.id, `[dedup] ${dup.reason} (matched ${dup.matchedPostId})`);
    console.warn(`[batch] dedup REJECTED: ${dup.reason} (matched ${dup.matchedPostId})`);
    return { ok: false, queueId: row.id, postId: result.post.id, error: dup.reason };
  }

  await sb.from('posts').update({ status: 'published' }).eq('id', result.post.id);
  await markGenerated(sb, row.id, result.post.id);
  console.log(`[batch] PUBLISHED https://www.wildlifeuniverse.org/posts/${result.post.slug}`);
  await pingIndexNow(result.post.slug);

  return { ok: true, queueId: row.id, postId: result.post.id, slug: result.post.slug };
}

async function main() {
  const requested = Math.max(1, Math.min(MAX_BATCH_SIZE, Number.parseInt(process.argv[2], 10) || 1));
  console.log(`=== Wildlife.Universe batch worker ===`);
  console.log(`requested=${requested} max_daily=${MAX_DAILY_ARTICLES}`);

  for (const k of [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]) {
    if (!process.env[k]) {
      console.error(`FATAL: missing required env var ${k}`);
      process.exit(2);
    }
  }

  const sb = admin();

  // Self-heal first — anything left stranded by a previous run is back
  // in the pool before we read it.
  await janitor(sb);

  const last24h = await countLast24h(sb);
  if (last24h >= MAX_DAILY_ARTICLES) {
    // GH Actions workflow command surfaces this as a yellow run summary
    // banner instead of a silent green ✓ that looks identical to "1 article
    // shipped". Exit 0 still so the schedule keeps firing.
    console.log(`::warning title=Daily cap reached::${last24h}/${MAX_DAILY_ARTICLES} articles in last 24h — nothing generated this run`);
    console.log(`daily cap reached (${last24h} >= ${MAX_DAILY_ARTICLES}), exiting cleanly`);
    process.exit(0);
  }
  const remaining = MAX_DAILY_ARTICLES - last24h;
  const n = Math.min(requested, remaining);
  console.log(`generated last 24h: ${last24h}, will process up to ${n} this run`);

  const { data: rows, error } = await sb
    .from('content_queue')
    .select('id, category, label, topic, attempts, priority')
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(n);
  if (error) {
    console.error('queue read failed:', error);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log('::warning title=Queue empty::no pending content_queue rows — seed via /admin/queue');
    console.log('queue empty — nothing to do');
    process.exit(0);
  }

  let succeeded = 0;
  let failed = 0;
  for (const row of rows) {
    const claimed = await claimRow(sb, row);
    if (!claimed) {
      console.warn(`[batch] lost claim race on ${row.id}, skipping`);
      continue;
    }
    try {
      const r = await processOne(sb, row);
      if (r.ok) succeeded += 1;
      else failed += 1;
    } catch (err) {
      // Belt-and-braces: any throw that escapes processOne marks the row
      // failed (not pending) — otherwise the next run claims it again at
      // attempts=MAX_ATTEMPTS, hits the off-by-one, and zombifies it.
      await markFailed(sb, row.id, `[unexpected] ${err.message}`);
      console.error(`[batch] UNEXPECTED throw on ${row.id}:`, err);
      failed += 1;
    }
  }

  console.log(`\n=== done: succeeded=${succeeded} failed=${failed} ===`);
  process.exit(failed > 0 && succeeded === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

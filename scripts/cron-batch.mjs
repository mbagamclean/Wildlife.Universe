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
import { isDuplicateOfExisting, isPreGenerationDuplicate } from '../lib/content-pipeline/dedup.mjs';
import { pingRevalidate } from './_lib/revalidate.mjs';

const MAX_ATTEMPTS = 3;
const MAX_BATCH_SIZE = 4;
const MAX_DAILY_ARTICLES = Number.parseInt(process.env.MAX_DAILY_ARTICLES, 10) || 8;
// A run that takes more than this is dead — the janitor reclaims those
// rows back to pending. Bumped 2026-05-23: local runs that fall back to
// the Claude Code CLI (Max subscription) take ~16 min for body+extract,
// so 20 min was too tight. 30 min still safely under GH Actions' 30-min
// job timeout, since CI runs use the funded API path (~90s/article) and
// wouldn't hit this anyway.
const STALE_GENERATING_MS = 30 * 60 * 1000;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wildlifeuniverse.org').replace(/\/$/, '');
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';

// Fire-and-forget — IndexNow tells Bing / Yandex / Naver / Seznam about
// freshly published URLs. Google retired its public ping endpoint in
// 2023; for Google we now also hit the internal /api/seo/ping route,
// which invokes the Google Indexing API when an admin has connected
// OAuth (see /api/auth/google-indexing/start). The internal ping is
// best-effort — if the Next.js server isn't reachable from wherever
// this script runs, IndexNow on its own still covers Bing/Yandex/etc.
async function pingIndexNow(slug) {
  if (!slug) return;
  const url = `${SITE_URL}/posts/${slug}`;
  const tasks = [];

  if (INDEXNOW_KEY) {
    const host = SITE_URL.replace(/^https?:\/\//, '');
    tasks.push(
      fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host,
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          // Submit both the new post and the homepage — homepage's
          // freshness signal tells engines to come back for the sitemap.
          urlList: [url, `${SITE_URL}/`],
        }),
      })
        .then((res) => console.log(`[batch] indexnow ${url} → HTTP ${res.status}`))
        .catch((err) => console.warn(`[batch] indexnow ping failed for ${url}: ${err.message}`)),
    );
  }

  const internalSecret = process.env.SEO_INTERNAL_PING_SECRET || '';
  if (internalSecret) {
    tasks.push(
      fetch(`${SITE_URL}/api/seo/ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-ping-secret': internalSecret,
        },
        body: JSON.stringify({ urls: [url, `${SITE_URL}/`], slug, eventType: 'publish_ping' }),
      })
        .then(async (res) => {
          if (res.ok) console.log(`[batch] seo/ping ${url} → HTTP ${res.status}`);
          else console.warn(`[batch] seo/ping ${url} → HTTP ${res.status}`);
        })
        .catch((err) => console.warn(`[batch] seo/ping failed for ${url}: ${err.message}`)),
    );
  }

  await Promise.allSettled(tasks);
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

  // PRE-GENERATION dedup — fingerprint topic against published posts
  // BEFORE burning ~16 min of CLI body+extract + an image-gen call. The
  // post-generation dedup gate still runs as a safety net for semantic
  // duplicates that this cheap match can't detect.
  const preDup = await isPreGenerationDuplicate({
    topic: row.topic,
    category: row.category,
    label: row.label,
  });
  if (preDup.isDuplicate) {
    await sb
      .from('content_queue')
      .update({
        status: 'failed',
        generated_post_id: preDup.matchedPostId,
        last_error: `[pre-dedup] ${preDup.reason} → matched ${preDup.matchedSlug || preDup.matchedPostId}`,
      })
      .eq('id', row.id);
    console.warn(`[batch] SKIPPED ${row.id} — duplicate of /posts/${preDup.matchedSlug || preDup.matchedPostId} (${preDup.reason})`);
    return { ok: false, queueId: row.id, skipped: true, reason: preDup.reason };
  }

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
    const phase = err.phase || 'unknown';
    const tagged = `[${phase}] ${err.message}`;
    // SESSION-LIMIT: Max subscription quota ceiling hit. This is a system-
    // wide pause, NOT this row's fault — burning an attempt would permanently
    // retire the row after ~3 unlucky window-boundaries. Roll attempts back
    // to the pre-claim value and throw a sentinel so the outer loop can
    // abort the rest of the batch (the pacer will sleep until reset).
    if (/session limit/i.test(err.message)) {
      await sb
        .from('content_queue')
        .update({
          status: 'pending',
          attempts: row.attempts, // claimRow set this to row.attempts+1 — restore
          last_error: `session-limit-skip: ${tagged}`,
        })
        .eq('id', row.id);
      console.warn(`[batch] SESSION LIMIT on ${row.id} — attempts rolled back, aborting batch`);
      const abortErr = new Error('session-limit-abort');
      abortErr.sessionLimit = true;
      throw abortErr;
    }
    // `claimRow` already incremented attempts in the DB to row.attempts+1.
    // The retry decision must use that post-claim value, otherwise the
    // very last attempt always lands in markPending and the row sticks at
    // attempts=MAX_ATTEMPTS in `pending` — invisible to the next run's
    // `.lt('attempts', MAX_ATTEMPTS)` filter forever.
    const dbAttempts = row.attempts + 1;
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
    category: row.category,
  });
  if (!quality.ok) {
    // Record generated_post_id even on failure so the orphan draft can be
    // traced back to the queue row that produced it (recovery scripts and
    // manual review both benefit).
    await sb
      .from('content_queue')
      .update({
        status: 'failed',
        generated_post_id: result.post.id,
        last_error: `[quality] ${quality.reasons.join('; ')}`,
      })
      .eq('id', row.id);
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
  // Purge Next.js ISR + Vercel edge cache so the new post appears on
  // homepage / category / label listings on the very next page load.
  // Without this, the "needs several refreshes to see new posts" bug
  // returns immediately because of the s-maxage + stale-while-revalidate
  // window on listing routes. Fire-and-forget — failure is non-fatal.
  await pingRevalidate();

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
  let aborted = false;
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
      if (err.sessionLimit) {
        // Pacer signal: stop processing the rest of this batch. processOne
        // has already rolled the offending row's attempts back. Exit code 3
        // tells the pacer "session-limit, sleep until reset".
        console.warn(`[batch] aborting batch — session limit. Remaining rows skipped (will be picked up next run).`);
        aborted = true;
        break;
      }
      // Belt-and-braces: any throw that escapes processOne marks the row
      // failed (not pending) — otherwise the next run claims it again at
      // attempts=MAX_ATTEMPTS, hits the off-by-one, and zombifies it.
      await markFailed(sb, row.id, `[unexpected] ${err.message}`);
      console.error(`[batch] UNEXPECTED throw on ${row.id}:`, err);
      failed += 1;
    }
  }

  console.log(`\n=== done: succeeded=${succeeded} failed=${failed}${aborted ? ' (aborted — session limit)' : ''} ===`);
  if (aborted) process.exit(3);
  process.exit(failed > 0 && succeeded === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

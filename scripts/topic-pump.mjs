/**
 * Topic-pump daemon.
 *
 * Watches every (category, label) pending-queue depth and triggers
 * scripts/generate-topics.mjs --label "<cat>/<Label>" whenever a
 * tuple drops below TOPIC_THRESHOLD. Keeps the 5 per-category pacers
 * fed forever — the user's north-star is 10M+ species, so we never
 * stop seeding new topics.
 *
 * Run (foreground):
 *   node --env-file=.env.local scripts/topic-pump.mjs
 *
 * Run (detached, alongside the 5 pacers):
 *   scripts/launch-all-pacers.mjs also spawns this — see that file.
 *
 * Behaviour:
 *   - Every TICK_MIN minutes, query content_queue counts grouped by
 *     (category, label).
 *   - For each tuple in LABELS_BY_CATEGORY whose pending count is
 *     below TOPIC_THRESHOLD, schedule a refill via
 *     generate-topics.mjs.
 *   - At most MAX_CONCURRENT refills run at a time (CLI rate-friendly).
 *   - Existing dedup inside generate-topics already drops topics that
 *     match posts.title / posts.slug / queue.topic, so the pump can
 *     never insert duplicates.
 */

import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { LABELS_BY_CATEGORY } from './_lib/rotation-state.mjs';

// ─── Tunables ─────────────────────────────────────────────────────
const TICK_MIN = Number.parseInt(process.env.TOPIC_PUMP_TICK_MIN, 10) || 20;
const TOPIC_THRESHOLD = Number.parseInt(process.env.TOPIC_PUMP_THRESHOLD, 10) || 50;
// At most this many generate-topics children at once. Each call costs
// ~10-30s on Haiku CLI; running 2 in parallel keeps the topic engine
// healthy without saturating the CLI we share with the pacers.
const MAX_CONCURRENT = Number.parseInt(process.env.TOPIC_PUMP_CONCURRENCY, 10) || 2;

// ─── Logging ──────────────────────────────────────────────────────
let logFile = null;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--log-file=')) logFile = arg.slice('--log-file='.length);
}
function log(msg) {
  const line = `[topic-pump ${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  if (logFile) try { appendFileSync(logFile, line); } catch { /* best effort */ }
}

// ─── Supabase ─────────────────────────────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// ─── Helpers ──────────────────────────────────────────────────────
function flatTuples() {
  const out = [];
  for (const [cat, labels] of Object.entries(LABELS_BY_CATEGORY)) {
    for (const lbl of labels) out.push({ category: cat, label: lbl });
  }
  return out;
}

async function countsByTuple() {
  // Pull pending rows; group in memory (avoids many round trips).
  const { data, error } = await sb
    .from('content_queue')
    .select('category, label')
    .eq('status', 'pending');
  if (error) { log(`queue count failed: ${error.message}`); return new Map(); }
  const m = new Map();
  for (const r of data || []) {
    const k = `${(r.category || 'posts').toLowerCase()}|${r.label || ''}`;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function generateForLabel(category, label) {
  return new Promise((resolve) => {
    log(`refilling ${category}/${label} via generate-topics`);
    const args = [
      '--env-file=.env.local',
      'scripts/generate-topics.mjs',
      '--label',
      `${category}/${label}`,
    ];
    const child = spawn('node', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      shell: false,
    });
    let stderrTail = '';
    child.stdout.on('data', () => {});
    child.stderr.on('data', (d) => {
      stderrTail += d.toString();
      if (stderrTail.length > 4000) stderrTail = stderrTail.slice(-4000);
    });
    child.on('exit', (code) => {
      if (code === 0) log(`  ✓ ${category}/${label} refill done`);
      else log(`  ✗ ${category}/${label} refill exited ${code}${stderrTail ? ' — ' + stderrTail.trim().split('\n').pop() : ''}`);
      resolve();
    });
    child.on('error', (err) => {
      log(`  ✗ ${category}/${label} refill spawn error: ${err.message}`);
      resolve();
    });
  });
}

async function runWithLimit(tasks, limit) {
  // Simple pool — start `limit` workers, each consumes from the queue.
  const queue = tasks.slice();
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const job = queue.shift();
      try { await job(); } catch { /* swallow */ }
    }
  });
  await Promise.all(workers);
}

// ─── Main loop ────────────────────────────────────────────────────
async function main() {
  for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[k]) {
      log(`FATAL: missing ${k}`);
      process.exit(2);
    }
  }
  log(`starting — tick=${TICK_MIN}min, threshold=${TOPIC_THRESHOLD}, concurrency=${MAX_CONCURRENT}`);
  log(`watching ${Object.keys(LABELS_BY_CATEGORY).length} categories, ${flatTuples().length} (category, label) tuples`);

  while (true) {
    try {
      const counts = await countsByTuple();
      const thin = [];
      for (const t of flatTuples()) {
        const k = `${t.category}|${t.label}`;
        const n = counts.get(k) || 0;
        if (n < TOPIC_THRESHOLD) thin.push({ ...t, current: n });
      }

      if (thin.length === 0) {
        log(`all ${flatTuples().length} tuples ≥ ${TOPIC_THRESHOLD} pending — nothing to do this tick`);
      } else {
        log(`${thin.length} tuple(s) below threshold:`);
        for (const t of thin) log(`  ${t.category}/${t.label} → ${t.current} pending`);

        // Build job functions, run with concurrency cap.
        const jobs = thin.map((t) => () => generateForLabel(t.category, t.label));
        await runWithLimit(jobs, MAX_CONCURRENT);
        log(`refill round complete`);
      }
    } catch (err) {
      log(`tick error: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, TICK_MIN * 60_000));
  }
}

main().catch((err) => { log(`FATAL: ${err.stack || err.message}`); process.exit(1); });

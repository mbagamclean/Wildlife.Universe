/**
 * One-shot catch-up for content_queue rows that previously failed.
 * Resets them to 'pending' with a priority bump so the cron worker
 * picks them ahead of the regular backlog, then loops cron-batch.mjs
 * (with the daily cap disabled) until none of the originally-failed
 * IDs are still pending/generating.
 *
 * Run:
 *   node --env-file=.env.local scripts/catchup-failed.mjs
 *
 * Designed for the post-fallback-shim catchup: the regular cron schedule
 * is paused, the API key is empty, and we want the Max-subscription path
 * to drain just the failed set without burning quota on the 35 normal
 * pending rows.
 */

import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const MAX_ITERATIONS = 20; // safety cap — 20 * 4 = 80 row-attempts
const BATCH_SIZE = 4;
const PAUSE_BETWEEN_RUNS_MS = 5000;
const PRIORITY_BUMP = 999; // huge value — leapfrogs anything in the queue

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function runCronBatch(n) {
  return new Promise((resolve, reject) => {
    console.log(`[catchup] launching cron-batch n=${n}…`);
    const child = spawn(
      'node',
      ['--env-file=.env.local', 'scripts/cron-batch.mjs', String(n)],
      {
        stdio: 'inherit',
        // MAX_DAILY_ARTICLES bypass — catchup is explicitly bulk, not the
        // anti-burn-protection scheduled mode.
        env: { ...process.env, MAX_DAILY_ARTICLES: '1000' },
        shell: process.platform === 'win32',
      },
    );
    child.on('error', reject);
    child.on('exit', (code) => resolve(code));
  });
}

async function main() {
  for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY']) {
    if (!process.env[k]) {
      console.error(`FATAL: missing required env var ${k}`);
      process.exit(2);
    }
  }
  const sb = admin();

  // Snapshot the failed set BEFORE resetting so we can track exactly
  // these rows through the loop (no co-mingling with the existing 35
  // normal-pending rows).
  const { data: failedRows, error: readErr } = await sb
    .from('content_queue')
    .select('id, topic, last_error')
    .eq('status', 'failed');
  if (readErr) { console.error('read failed:', readErr); process.exit(1); }
  if (!failedRows?.length) {
    console.log('No failed rows — nothing to catch up.');
    return;
  }

  const targetIds = failedRows.map((r) => r.id);
  console.log(`=== Catch-up target: ${targetIds.length} previously-failed row(s) ===`);
  for (const r of failedRows) {
    console.log(`  - ${r.topic}`);
  }
  console.log();

  // Reset to pending with bumped priority + zeroed attempts.
  const { error: updErr } = await sb
    .from('content_queue')
    .update({
      status: 'pending',
      attempts: 0,
      priority: PRIORITY_BUMP,
      last_error: 'reset-for-catchup',
    })
    .in('id', targetIds);
  if (updErr) { console.error('reset failed:', updErr); process.exit(1); }
  console.log(`Reset ${targetIds.length} row(s) → pending, priority=${PRIORITY_BUMP}, attempts=0\n`);

  let iteration = 0;
  let lastRemaining = targetIds.length;
  let stagnantIterations = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration += 1;

    const { data: remainingRows } = await sb
      .from('content_queue')
      .select('id, status')
      .in('id', targetIds)
      .in('status', ['pending', 'generating']);
    const remaining = remainingRows?.length ?? 0;

    if (remaining === 0) {
      console.log(`\n=== All catch-up rows processed in ${iteration - 1} iteration(s) ===`);
      break;
    }

    // Bail out if 3 consecutive iterations made no progress — means we're
    // burning quota on a row that consistently errors at quality/dedup
    // or hits a non-recoverable failure mode.
    if (remaining >= lastRemaining) {
      stagnantIterations += 1;
      if (stagnantIterations >= 3) {
        console.warn(`\n=== Stalled: no progress in 3 iterations, aborting (${remaining} still queued) ===`);
        break;
      }
    } else {
      stagnantIterations = 0;
    }
    lastRemaining = remaining;

    console.log(`\n--- iteration ${iteration}/${MAX_ITERATIONS}: ${remaining} target row(s) still queued ---`);

    const code = await runCronBatch(BATCH_SIZE);
    if (code !== 0 && code !== null) {
      console.warn(`[catchup] cron-batch exited code=${code} (continuing — may be partial success)`);
    }
    await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_RUNS_MS));
  }

  if (iteration >= MAX_ITERATIONS) {
    console.warn(`\n=== Hit max-iterations cap (${MAX_ITERATIONS}); some rows may still be unprocessed ===`);
  }

  // Final report — what landed where.
  const { data: finalRows } = await sb
    .from('content_queue')
    .select('id, topic, status, last_error, generated_post_id')
    .in('id', targetIds);

  const generated = finalRows.filter((r) => r.status === 'generated');
  const failed = finalRows.filter((r) => r.status === 'failed');
  const stuck = finalRows.filter((r) => r.status !== 'generated' && r.status !== 'failed');

  console.log('\n========== FINAL RESULTS ==========');
  console.log(`Generated: ${generated.length}`);
  for (const r of generated) console.log(`  ✓ ${r.topic} → post ${r.generated_post_id}`);
  console.log(`Failed: ${failed.length}`);
  for (const r of failed) console.log(`  ✗ ${r.topic} :: ${(r.last_error || '').slice(0, 150)}`);
  if (stuck.length) {
    console.log(`Stuck (other status — unexpected): ${stuck.length}`);
    for (const r of stuck) console.log(`  ? ${r.topic} :: status=${r.status}`);
  }
  console.log('===================================');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

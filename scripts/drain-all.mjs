/**
 * Two-phase queue drain over the Claude Code CLI fallback path.
 *
 *   Phase 1 — re-attempt every status='failed' row using OPUS 4.7 for the
 *             body (Sonnet 4.6 was producing depth-short articles that
 *             tripped the quality gate). Priority-bumped so they're
 *             picked before the regular backlog.
 *   Phase 2 — drain every remaining pending row using the default model
 *             (Sonnet 4.6) — that's what the user picked for normal
 *             throughput because Opus is slower.
 *
 * Run:
 *   node --env-file=.env.local scripts/drain-all.mjs
 *
 * Long-running. Expect ~12-18h wall-clock for 36 rows incl. Max
 * subscription rate-limit pauses. Computer must stay on.
 */

import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const MAX_ITERATIONS = 80; // safety cap — 80*4 = 320 row-attempts headroom
const BATCH_SIZE = 4;
const PAUSE_BETWEEN_RUNS_MS = 5000;
const PRIORITY_BUMP = 999;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function runCronBatch(n, extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      ['--env-file=.env.local', 'scripts/cron-batch.mjs', String(n)],
      {
        stdio: 'inherit',
        env: { ...process.env, MAX_DAILY_ARTICLES: '1000', ...extraEnv },
        shell: process.platform === 'win32',
      },
    );
    child.on('error', reject);
    child.on('exit', (code) => resolve(code));
  });
}

async function runPhase({ name, env, doneCheck }) {
  console.log(`\n${'='.repeat(60)}\n${name}\n${'='.repeat(60)}`);
  let iteration = 0;
  let lastRemaining = Infinity;
  let stagnant = 0;
  while (iteration < MAX_ITERATIONS) {
    iteration += 1;
    const remaining = await doneCheck();
    if (remaining === 0) {
      console.log(`\n${name}: ✓ complete in ${iteration - 1} iteration(s)`);
      return { complete: true, iterations: iteration - 1 };
    }
    if (remaining >= lastRemaining) {
      stagnant += 1;
      if (stagnant >= 3) {
        console.warn(`\n${name}: ⚠ stalled — ${remaining} still queued after 3 stagnant iterations`);
        return { complete: false, iterations: iteration, remaining };
      }
    } else {
      stagnant = 0;
    }
    lastRemaining = remaining;
    console.log(`\n--- ${name} iter ${iteration}/${MAX_ITERATIONS}: ${remaining} target(s) remaining ---`);
    const code = await runCronBatch(BATCH_SIZE, env);
    if (code !== 0 && code !== null) {
      console.warn(`[drain] cron-batch exit ${code} (continuing — partial-success is normal)`);
    }
    await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_RUNS_MS));
  }
  console.warn(`\n${name}: ⚠ hit max-iterations cap (${MAX_ITERATIONS})`);
  return { complete: false, iterations: MAX_ITERATIONS };
}

async function main() {
  for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY']) {
    if (!process.env[k]) {
      console.error(`FATAL: missing required env var ${k}`);
      process.exit(2);
    }
  }
  const sb = admin();
  const startedAt = Date.now();

  // ── PHASE 1: failed rows, retry with Opus 4.7 body ────────────────────
  const { data: failed } = await sb
    .from('content_queue')
    .select('id, topic, last_error')
    .eq('status', 'failed');

  if (failed?.length) {
    console.log(`\nPHASE 1 targets: ${failed.length} previously-failed row(s)`);
    for (const r of failed) console.log(`  - ${r.topic}`);

    const phase1Ids = failed.map((r) => r.id);
    await sb
      .from('content_queue')
      .update({
        status: 'pending',
        attempts: 0,
        priority: PRIORITY_BUMP,
        last_error: 'reset-for-drain-phase1-opus',
      })
      .in('id', phase1Ids);
    console.log(`Reset ${phase1Ids.length} → pending, priority=${PRIORITY_BUMP}, attempts=0`);

    await runPhase({
      name: 'PHASE 1 (CLI body = Opus 4.7, extract = Opus 4.7)',
      env: { CLI_FALLBACK_BODY_MODEL: 'claude-opus-4-7' },
      doneCheck: async () => {
        const { data } = await sb
          .from('content_queue')
          .select('id')
          .in('id', phase1Ids)
          .in('status', ['pending', 'generating']);
        return data?.length ?? 0;
      },
    });
  } else {
    console.log('\nPHASE 1 skipped — no failed rows.');
  }

  // ── PHASE 2: remaining pending rows, default Sonnet body ──────────────
  await runPhase({
    name: 'PHASE 2 (CLI body = Sonnet 4.6 default, extract = Opus 4.7)',
    env: {},
    doneCheck: async () => {
      const { count } = await sb
        .from('content_queue')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'generating']);
      return count ?? 0;
    },
  });

  // ── Final report ──────────────────────────────────────────────────────
  const totalElapsed = ((Date.now() - startedAt) / 1000 / 60).toFixed(1);
  const { data: queue } = await sb.from('content_queue').select('status');
  const counts = {};
  for (const r of queue) counts[r.status] = (counts[r.status] || 0) + 1;

  console.log('\n' + '='.repeat(60));
  console.log(`DRAIN COMPLETE — wall-clock ${totalElapsed} min`);
  console.log('='.repeat(60));
  console.log('Final queue:', counts);

  if (counts.failed) {
    const { data: stillFailed } = await sb
      .from('content_queue')
      .select('topic, last_error')
      .eq('status', 'failed');
    console.log('\nStill failed:');
    for (const r of stillFailed) {
      console.log(`  ✗ ${r.topic} :: ${(r.last_error || '').slice(0, 150)}`);
    }
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

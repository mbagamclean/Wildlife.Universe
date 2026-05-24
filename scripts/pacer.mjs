/**
 * Continuous, session-aware queue pacer.
 *
 * Drains content_queue at maximum sustainable throughput against the Max
 * subscription:
 *   - Loops cron-batch n=4 with no artificial pauses (~8.5 min/article
 *     average → ~25-28 articles per 5-hour session window).
 *   - When cron-batch returns exit code 3 (session-limit aborted) OR its
 *     output contains "session limit", parses the reset time from the
 *     model's error message and sleeps until then + 60s buffer, then resumes.
 *   - Bails if 5 consecutive iterations make no progress (non-quota stall —
 *     e.g. every remaining row keeps failing quality gate).
 *
 * Run:
 *   node --env-file=.env.local scripts/pacer.mjs
 *
 * Long-running. ~125 articles/day sustained on Max; ~22 days to drain 2,773.
 * Kill the node process to stop. In-flight row is reclaimed by the cron
 * worker's janitor after 30 min, so killing mid-iteration is safe.
 */

import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const BATCH_SIZE = 4;
const PAUSE_BETWEEN_RUNS_MS = 5_000;
const POST_RESET_BUFFER_MS = 60_000;        // Max windows can be sticky; add a minute
const FALLBACK_SESSION_SLEEP_MS = 5 * 3600_000; // worst-case if we can't parse reset
const STAGNANT_THRESHOLD = 5;
const MAX_TOTAL_HOURS = 30 * 24;            // 30-day safety hard-stop

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function countByStatus(sb, statuses) {
  const { count } = await sb
    .from('content_queue')
    .select('id', { count: 'exact', head: true })
    .in('status', statuses);
  return count ?? 0;
}

/**
 * Parse the reset time the Max subscription quotes in its session-limit
 * error: "You've hit your session limit · resets 5pm (Africa/Dar_es_Salaam)".
 * Also handles "5:30pm" variants and noon/midnight edge cases.
 *
 * Returns a Date in local time, the next future occurrence of the parsed
 * wall-clock time.
 */
function parseResetTime(text, now = new Date()) {
  const m = String(text).match(/resets\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const isPm = m[3].toLowerCase() === 'pm';
  if (hour === 12) hour = isPm ? 12 : 0;
  else if (isPm) hour += 12;
  if (hour < 0 || hour > 23 || min < 0 || min > 59) return null;
  const reset = new Date(now);
  reset.setHours(hour, min, 0, 0);
  if (reset <= now) reset.setDate(reset.getDate() + 1);
  return reset;
}

function runCronBatch(n) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      ['--env-file=.env.local', 'scripts/cron-batch.mjs', String(n)],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        // MAX_DAILY_ARTICLES=10000 bypass — we explicitly want continuous
        // throughput, not the 8-article anti-burn safety the cron uses
        // during normal scheduled mode.
        env: { ...process.env, MAX_DAILY_ARTICLES: '10000' },
        shell: process.platform === 'win32',
      },
    );
    let captured = '';
    child.stdout.on('data', (d) => {
      const s = d.toString();
      captured += s;
      process.stdout.write(s);
    });
    child.stderr.on('data', (d) => {
      const s = d.toString();
      captured += s;
      process.stderr.write(s);
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code, captured }));
  });
}

async function sleepUntil(targetDate, label) {
  const ms = targetDate.getTime() - Date.now();
  if (ms <= 0) return;
  console.log(`\n[pacer] ${label}: sleeping ${(ms / 60000).toFixed(1)} min until ${targetDate.toLocaleString()}`);
  await new Promise((r) => setTimeout(r, ms));
  console.log(`[pacer] awake — resuming`);
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
  const startedGenerated = await countByStatus(sb, ['generated']);
  let iteration = 0;
  let stagnant = 0;
  let totalSessionLimitHits = 0;

  console.log(`[pacer] starting. queue snapshot:`);
  console.log(`  generated: ${startedGenerated}`);
  console.log(`  pending+generating: ${await countByStatus(sb, ['pending', 'generating'])}`);
  console.log(`  failed: ${await countByStatus(sb, ['failed'])}`);
  console.log(`[pacer] expected throughput: ~26 articles per 5h, ~125/day.`);

  while (true) {
    iteration += 1;
    const elapsedH = (Date.now() - startedAt) / 3_600_000;
    if (elapsedH > MAX_TOTAL_HOURS) {
      console.log(`\n[pacer] ${MAX_TOTAL_HOURS}h safety cap reached — stopping`);
      break;
    }

    const before = await countByStatus(sb, ['pending', 'generating']);
    if (before === 0) {
      console.log(`\n[pacer] queue empty — DONE after ${iteration - 1} iterations, ${elapsedH.toFixed(2)}h`);
      break;
    }

    const publishedSoFar = (await countByStatus(sb, ['generated'])) - startedGenerated;
    const rate = elapsedH > 0 ? (publishedSoFar / elapsedH).toFixed(1) : '–';
    console.log(`\n========== [pacer] iter ${iteration} — ${before} pending, +${publishedSoFar} this run, ${rate}/h, ${elapsedH.toFixed(2)}h elapsed ==========`);

    const { code, captured } = await runCronBatch(BATCH_SIZE);

    const sessionLimit = code === 3 || /session limit/i.test(captured);
    const after = await countByStatus(sb, ['pending', 'generating']);
    const moved = before - after;

    if (sessionLimit) {
      totalSessionLimitHits += 1;
      const reset = parseResetTime(captured);
      if (reset) {
        await sleepUntil(new Date(reset.getTime() + POST_RESET_BUFFER_MS), `session limit hit #${totalSessionLimitHits} — waiting for reset`);
      } else {
        await sleepUntil(new Date(Date.now() + FALLBACK_SESSION_SLEEP_MS + POST_RESET_BUFFER_MS), `session limit hit #${totalSessionLimitHits} — reset time unparsable, sleeping 5h`);
      }
      stagnant = 0;
      continue;
    }

    if (moved <= 0) {
      stagnant += 1;
      console.warn(`[pacer] no progress this iter (stagnant ${stagnant}/${STAGNANT_THRESHOLD})`);
      if (stagnant >= STAGNANT_THRESHOLD) {
        console.warn(`\n[pacer] ${STAGNANT_THRESHOLD} consecutive stagnant iterations — bailing (${after} still pending)`);
        break;
      }
    } else {
      stagnant = 0;
    }

    await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_RUNS_MS));
  }

  const finalGenerated = await countByStatus(sb, ['generated']);
  const finalPending = await countByStatus(sb, ['pending', 'generating']);
  const finalFailed = await countByStatus(sb, ['failed']);
  const runHours = ((Date.now() - startedAt) / 3_600_000).toFixed(2);
  const publishedThisRun = finalGenerated - startedGenerated;
  const rate = publishedThisRun > 0 && Number(runHours) > 0 ? (publishedThisRun / Number(runHours)).toFixed(1) : '–';

  console.log(`\n${'='.repeat(60)}\nPACER FINISHED\n${'='.repeat(60)}`);
  console.log(`Wall-clock: ${runHours} h`);
  console.log(`Published this run: ${publishedThisRun}  (${rate}/h average)`);
  console.log(`Session-limit hits handled: ${totalSessionLimitHits}`);
  console.log(`Final queue: pending=${finalPending}, generated=${finalGenerated}, failed=${finalFailed}`);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });

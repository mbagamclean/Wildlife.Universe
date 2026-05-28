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

// When --log-file=<path> is passed, hijack console.log / console.warn
// / console.error so every message is fs.appendFileSync'd to that
// path immediately (and also still mirrored to stdout). Bypassing the
// shell-redirection block-buffering quirks on Windows means
// `tail -f logs/pacer-<cat>.log` is responsive in real time.
import { appendFileSync } from 'node:fs';
{
  let logFile = null;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--log-file=')) logFile = arg.slice('--log-file='.length);
  }
  if (logFile) {
    const wrap = (orig) => (...args) => {
      const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n';
      try { appendFileSync(logFile, line); } catch { /* ignore — best effort */ }
      orig.apply(console, args);
    };
    console.log = wrap(console.log);
    console.warn = wrap(console.warn);
    console.error = wrap(console.error);
  }
}

const BATCH_SIZE = 4;
const PAUSE_BETWEEN_RUNS_MS = 5_000;
const POST_RESET_BUFFER_MS = 60_000;        // Max windows can be sticky; add a minute
const FALLBACK_SESSION_SLEEP_MS = 5 * 3600_000; // worst-case if we can't parse reset
// Infinite-mode (May 28 2026): the pacer no longer bails on stagnation.
// When the scoped category's queue is temporarily empty (e.g. topic-pump
// hasn't refilled yet) we just idle-poll for new pending items. 30s is
// tight enough that pacers pick up freshly-pumped topics nearly
// immediately, without hammering Supabase.
const IDLE_POLL_MS = 30_000;
const MAX_TOTAL_HOURS = 365 * 24;           // 1-year safety hard-stop

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function countByStatus(sb, statuses, category) {
  let q = sb
    .from('content_queue')
    .select('id', { count: 'exact', head: true })
    .in('status', statuses);
  if (category) q = q.eq('category', category);
  const { count } = await q;
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

function runCronBatch(n, category) {
  return new Promise((resolve, reject) => {
    const args = ['--env-file=.env.local', 'scripts/cron-batch.mjs', String(n)];
    if (category) args.push(`--category=${category}`);
    const child = spawn(
      'node',
      args,
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

function parseArgs(argv) {
  let category = null;
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--category=')) category = arg.slice('--category='.length).toLowerCase();
  }
  return { category };
}

async function main() {
  const { category } = parseArgs(process.argv);
  const tag = category ? `pacer:${category}` : 'pacer';
  for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY']) {
    if (!process.env[k]) {
      console.error(`FATAL: missing required env var ${k}`);
      process.exit(2);
    }
  }
  const sb = admin();

  const startedAt = Date.now();
  const startedGenerated = await countByStatus(sb, ['generated'], category);
  let iteration = 0;
  let totalSessionLimitHits = 0;

  console.log(`[${tag}] starting. queue snapshot:`);
  console.log(`  generated${category ? ` (${category})` : ''}: ${startedGenerated}`);
  console.log(`  pending+generating: ${await countByStatus(sb, ['pending', 'generating'], category)}`);
  console.log(`  failed: ${await countByStatus(sb, ['failed'], category)}`);
  console.log(`[${tag}] expected throughput: ~26 articles per 5h, ~125/day per pacer.`);
  console.log(`[${tag}] infinite mode — never bails on empty queue, polls every ${IDLE_POLL_MS / 1000}s when idle.`);

  while (true) {
    iteration += 1;
    const elapsedH = (Date.now() - startedAt) / 3_600_000;
    if (elapsedH > MAX_TOTAL_HOURS) {
      console.log(`\n[${tag}] ${MAX_TOTAL_HOURS}h safety cap reached — stopping`);
      break;
    }

    const before = await countByStatus(sb, ['pending', 'generating'], category);
    if (before === 0) {
      // Infinite mode: queue is temporarily empty (topic pump hasn't
      // refilled this category yet). Sleep and re-check instead of
      // bailing — the 10M-species north-star requires us to come
      // back the moment topics arrive.
      console.log(`\n[${tag}] queue empty — idle-polling every ${IDLE_POLL_MS / 1000}s until topics arrive`);
      await new Promise((r) => setTimeout(r, IDLE_POLL_MS));
      continue;
    }

    const publishedSoFar = (await countByStatus(sb, ['generated'], category)) - startedGenerated;
    const rate = elapsedH > 0 ? (publishedSoFar / elapsedH).toFixed(1) : '–';
    console.log(`\n========== [${tag}] iter ${iteration} — ${before} pending, +${publishedSoFar} this run, ${rate}/h, ${elapsedH.toFixed(2)}h elapsed ==========`);

    const { code, captured } = await runCronBatch(BATCH_SIZE, category);

    const sessionLimit = code === 3 || /session limit/i.test(captured);

    if (sessionLimit) {
      totalSessionLimitHits += 1;
      const reset = parseResetTime(captured);
      if (reset) {
        await sleepUntil(new Date(reset.getTime() + POST_RESET_BUFFER_MS), `[${tag}] session limit hit #${totalSessionLimitHits} — waiting for reset`);
      } else {
        await sleepUntil(new Date(Date.now() + FALLBACK_SESSION_SLEEP_MS + POST_RESET_BUFFER_MS), `[${tag}] session limit hit #${totalSessionLimitHits} — reset unparsable, sleeping 5h`);
      }
      continue;
    }

    await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_RUNS_MS));
  }

  const finalGenerated = await countByStatus(sb, ['generated'], category);
  const finalPending = await countByStatus(sb, ['pending', 'generating'], category);
  const finalFailed = await countByStatus(sb, ['failed'], category);
  const runHours = ((Date.now() - startedAt) / 3_600_000).toFixed(2);
  const publishedThisRun = finalGenerated - startedGenerated;
  const rate = publishedThisRun > 0 && Number(runHours) > 0 ? (publishedThisRun / Number(runHours)).toFixed(1) : '–';

  console.log(`\n${'='.repeat(60)}\n${tag.toUpperCase()} FINISHED\n${'='.repeat(60)}`);
  console.log(`Wall-clock: ${runHours} h`);
  console.log(`Published this run: ${publishedThisRun}  (${rate}/h average)`);
  console.log(`Session-limit hits handled: ${totalSessionLimitHits}`);
  console.log(`Final queue: pending=${finalPending}, generated=${finalGenerated}, failed=${finalFailed}`);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });

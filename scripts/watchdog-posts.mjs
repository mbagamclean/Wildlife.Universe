/**
 * Posts pacer watchdog.
 *
 * "Insure that posts pacer produces and it will never [stop] until it
 * produces." — runs forever (or until a fresh posts publish is observed
 * with --until-publish), with these guarantees:
 *
 *   1. Polls content_queue every POLL_MS for category=posts.
 *   2. Logs delta of `generated` rows since baseline + current pending.
 *   3. Detects pacer-process death (no node-pacer running with --category=posts)
 *      and respawns it from launch-all-pacers' detached recipe.
 *   4. If pacer is alive but no progress in STALL_MIN minutes AND no
 *      "session-limit" last_error in the most-recent posts row, kills
 *      and respawns posts pacer (assumes hung CLI / wedged child).
 *   5. If most-recent failure IS session-limit, just waits — that's
 *      legitimate Max quota, not a stall.
 *
 * Run:
 *   node --env-file=.env.local scripts/watchdog-posts.mjs
 *   node --env-file=.env.local scripts/watchdog-posts.mjs --until-publish
 */

import { spawn } from 'node:child_process';
import { existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LOG_DIR = resolve(ROOT, 'logs');
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
const WATCHDOG_LOG = resolve(LOG_DIR, 'watchdog-posts.log');
const PACER_LOG = resolve(LOG_DIR, 'pacer-posts.log');

const POLL_MS = 60_000;          // 1-min cadence
const STALL_MIN = 25;            // restart pacer after 25 min of zero progress (non-session-limit)
const SESSION_LIMIT_GRACE_MIN = 360; // Max windows are <= 5h, give 6h before forcing restart
const UNTIL_PUBLISH = process.argv.includes('--until-publish');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { appendFileSync(WATCHDOG_LOG, line + '\n'); } catch {}
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function countByStatus(sb, statuses, category) {
  let q = sb.from('content_queue').select('id', { count: 'exact', head: true }).in('status', statuses);
  if (category) q = q.eq('category', category);
  const { count } = await q;
  return count ?? 0;
}

async function lastErrorState(sb) {
  // Most-recent posts row with last_error set — used to differentiate
  // "session-limit pause (wait)" from "hung pacer (restart)".
  const { data } = await sb
    .from('content_queue')
    .select('id, topic, last_error, updated_at, status')
    .eq('category', 'posts')
    .not('last_error', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

function isPostsPacerAlive() {
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        'wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv',
        { encoding: 'utf8', timeout: 15_000 },
      );
      return /pacer\.mjs[^\n]*--category=posts/i.test(out);
    } else {
      const out = execSync('ps -ef', { encoding: 'utf8', timeout: 15_000 });
      return /pacer\.mjs[^\n]*--category=posts/i.test(out);
    }
  } catch {
    return false;
  }
}

function killPostsPacer() {
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        'wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv',
        { encoding: 'utf8', timeout: 15_000 },
      );
      const pids = [];
      for (const line of out.split('\n')) {
        if (/pacer\.mjs[^\n]*--category=posts/i.test(line)) {
          const parts = line.trim().split(',');
          const pid = parts[parts.length - 1];
          if (/^\d+$/.test(pid)) pids.push(pid);
        }
      }
      for (const pid of pids) {
        try { execSync(`taskkill /F /PID ${pid}`, { timeout: 10_000 }); log(`killed posts pacer pid=${pid}`); }
        catch (e) { log(`taskkill failed for ${pid}: ${e.message}`); }
      }
    } else {
      execSync('pkill -f "pacer.mjs.*--category=posts"', { timeout: 10_000 });
      log('killed posts pacer via pkill');
    }
  } catch (e) {
    log(`kill error (may be already dead): ${e.message}`);
  }
}

function spawnPostsPacer() {
  // Mirror launch-all-pacers' detached-spawn shape exactly so the pacer
  // process is fully decoupled from the watchdog (watchdog can exit
  // without taking the pacer with it).
  const args = [
    '--env-file=.env.local',
    'scripts/pacer.mjs',
    '--category=posts',
    `--log-file=${PACER_LOG}`,
  ];
  const child = spawn('node', args, {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, MAX_DAILY_ARTICLES: '10000' },
    shell: process.platform === 'win32',
  });
  child.unref();
  log(`spawned posts pacer (detached) pid=${child.pid} log=${PACER_LOG}`);
}

async function main() {
  for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[k]) { console.error(`FATAL: missing ${k}`); process.exit(2); }
  }
  const sb = admin();

  const baseline = await countByStatus(sb, ['generated'], 'posts');
  const startedAt = Date.now();
  let lastProgressAt = Date.now();
  let lastSeenGenerated = baseline;
  let iter = 0;

  log(`watchdog start — baseline posts generated=${baseline}. mode=${UNTIL_PUBLISH ? 'until-publish' : 'forever'}`);
  log(`policy: poll=${POLL_MS / 1000}s stall=${STALL_MIN}min session-grace=${SESSION_LIMIT_GRACE_MIN}min`);

  while (true) {
    iter += 1;
    const generated = await countByStatus(sb, ['generated'], 'posts');
    const pending = await countByStatus(sb, ['pending', 'generating'], 'posts');
    const failed = await countByStatus(sb, ['failed'], 'posts');
    const delta = generated - baseline;

    if (generated > lastSeenGenerated) {
      const fresh = generated - lastSeenGenerated;
      lastProgressAt = Date.now();
      log(`✓ PROGRESS iter=${iter} +${fresh} new (total +${delta}); pending=${pending} generated=${generated} failed=${failed}`);
      lastSeenGenerated = generated;
      if (UNTIL_PUBLISH) {
        log(`--until-publish: target met; exiting`);
        process.exit(0);
      }
    } else {
      const stallMin = (Date.now() - lastProgressAt) / 60_000;
      log(`… iter=${iter} no new publishes (stall=${stallMin.toFixed(1)}min); pending=${pending} generated=${generated} failed=${failed}`);
    }

    const alive = isPostsPacerAlive();
    if (!alive) {
      log(`! posts pacer NOT RUNNING — respawning`);
      spawnPostsPacer();
      lastProgressAt = Date.now(); // give the fresh pacer a clean stall window
    } else {
      const stallMin = (Date.now() - lastProgressAt) / 60_000;
      const lastErr = await lastErrorState(sb);
      const isSession = lastErr?.last_error && /hit your session limit|session limit · resets/i.test(lastErr.last_error);
      const threshold = isSession ? SESSION_LIMIT_GRACE_MIN : STALL_MIN;
      if (stallMin > threshold) {
        log(`! stall=${stallMin.toFixed(1)}min > threshold=${threshold}min (sessionLimit=${!!isSession}) — restarting pacer`);
        killPostsPacer();
        await new Promise((r) => setTimeout(r, 4_000));
        spawnPostsPacer();
        lastProgressAt = Date.now();
      }
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((err) => { log(`FATAL: ${err.stack || err.message}`); process.exit(1); });

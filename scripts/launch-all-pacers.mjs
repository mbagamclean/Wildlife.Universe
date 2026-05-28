/**
 * Spawn one pacer per category. Each runs in its own process, writes
 * to its own log file, and owns its own rotation state — they share
 * nothing besides the Supabase backend.
 *
 * Run once:
 *   node --env-file=.env.local scripts/launch-all-pacers.mjs
 *
 * Stop all:
 *   node scripts/kill-all-pacers.mjs
 *
 * Why one per category:
 *   - True parallelism: 5x sustained throughput potential.
 *   - Isolation: a quota event on one category doesn't starve others.
 *   - Each pacer's rotation through its labels is independent —
 *     animals can be mid-Reptiles while plants is mid-Trees.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, writeSync, closeSync } from 'node:fs';
import path from 'node:path';
import { LABELS_BY_CATEGORY } from './_lib/rotation-state.mjs';

const CATEGORIES = Object.keys(LABELS_BY_CATEGORY);
const LOGS_DIR = 'logs';

if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });

const pids = [];
for (const cat of CATEGORIES) {
  const logPath = path.join(LOGS_DIR, `pacer-${cat}.log`);

  // Append a banner so we can see when each detached run started.
  const banner = openSync(logPath, 'a');
  writeSync(banner, `\n${'='.repeat(60)}\n[orchestrator] spawning pacer:${cat} at ${new Date().toISOString()}\n${'='.repeat(60)}\n`);
  closeSync(banner);

  // We pass --log-file directly to pacer.mjs so it writes each line
  // via fs.appendFileSync — bypasses Node's stdout block-buffering
  // when the orchestrator's redirected pipe isn't a TTY. Stdio stays
  // 'ignore' so the detached child has no parent dependency at all.
  const args = [
    '--env-file=.env.local',
    'scripts/pacer.mjs',
    `--category=${cat}`,
    `--log-file=${logPath}`,
  ];

  const child = spawn('node', args, {
    stdio: 'ignore',
    env: process.env,
    detached: true,
    shell: false,
    windowsHide: true,
  });
  child.unref();

  pids.push({ category: cat, pid: child.pid, log: logPath });
  console.log(`  → pacer:${cat.padEnd(8)} pid=${child.pid} log=${logPath}`);
}

// Topic-pump daemon: keeps every (category, label) queue refilled so
// the 3 categories currently sitting idle (animals/birds/posts) start
// producing as soon as topics land. Same fd-bypass logging trick.
const pumpLog = path.join(LOGS_DIR, 'topic-pump.log');
const pumpBanner = openSync(pumpLog, 'a');
writeSync(pumpBanner, `\n${'='.repeat(60)}\n[orchestrator] spawning topic-pump at ${new Date().toISOString()}\n${'='.repeat(60)}\n`);
closeSync(pumpBanner);
const pumpChild = spawn(
  'node',
  [
    '--env-file=.env.local',
    'scripts/topic-pump.mjs',
    `--log-file=${pumpLog}`,
  ],
  {
    stdio: 'ignore',
    env: process.env,
    detached: true,
    shell: false,
    windowsHide: true,
  },
);
pumpChild.unref();
console.log(`  → topic-pump      pid=${pumpChild.pid} log=${pumpLog}`);

console.log(`\nLaunched ${pids.length} pacers + 1 topic-pump in detached mode.`);
console.log(`Tail any:  tail -f ${pids.map((p) => p.log).join(' ')} ${pumpLog}`);
console.log(`Stop all:  node scripts/kill-all-pacers.mjs`);

// Exit the orchestrator — detached pacers keep running.
process.exit(0);

/**
 * Stop every pacer.mjs and cron-batch.mjs node process the orchestrator
 * (or anyone else) launched. Looks them up by command line pattern via
 * Windows WMIC / Unix ps, then sends SIGKILL on Unix / `taskkill /F`
 * on Windows.
 */

import { execSync } from 'node:child_process';

function listPacerPids() {
  if (process.platform === 'win32') {
    try {
      const out = execSync(
        'wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv',
        { encoding: 'utf8' },
      );
      return out
        .split('\n')
        .filter((l) => l.includes('pacer.mjs') || l.includes('cron-batch.mjs') || l.includes('topic-pump.mjs') || l.includes('generate-topics.mjs'))
        .map((l) => {
          const parts = l.trim().split(',');
          const pid = Number.parseInt(parts[parts.length - 1], 10);
          return Number.isFinite(pid) ? pid : null;
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  } else {
    try {
      const out = execSync('ps -eo pid,command', { encoding: 'utf8' });
      return out
        .split('\n')
        .filter((l) => l.includes('pacer.mjs') || l.includes('cron-batch.mjs') || l.includes('topic-pump.mjs') || l.includes('generate-topics.mjs'))
        .map((l) => Number.parseInt(l.trim().split(/\s+/)[0], 10))
        .filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }
}

const pids = listPacerPids();
if (pids.length === 0) {
  console.log('No running pacer / cron-batch processes found.');
  process.exit(0);
}

console.log(`Stopping ${pids.length} process(es): ${pids.join(', ')}`);
for (const pid of pids) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
    console.log(`  killed pid ${pid}`);
  } catch (err) {
    console.warn(`  failed to kill pid ${pid}: ${err.message}`);
  }
}

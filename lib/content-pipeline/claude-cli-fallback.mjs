/**
 * Claude Code CLI fallback for the Anthropic API path.
 *
 * Spawns `claude -p` using the user's logged-in Max subscription instead
 * of an API key. Activates only when the API call fails for billing/auth
 * reasons — transient overload still retries against the API since the
 * subscription has its own rate limits and we don't want to burn them on
 * problems that would self-resolve.
 *
 * Requires `claude` on PATH and prior `claude login`. Does NOT work on
 * GitHub Actions runners (no interactive OAuth) — this is a local-only
 * safety net, which is why the GH Actions schedule is paused while the
 * API key is empty.
 */

import { spawn } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Full 14k-token articles via Sonnet 4.6 on the Max subscription run
// slower than the metered API (anecdotally 3-8 min for body, 30-60s for
// extract). Bumped to 25 min on 2026-05-23 because under heavy Max load
// occasional articles were exceeding 15 min. The cron worker's janitor
// reclaims rows after 30 min (STALE_GENERATING_MS), so this stays safely
// under that ceiling.
const CLI_TIMEOUT_MS = 25 * 60 * 1000;
// On Windows, Node (post-CVE-2024-27980) refuses to spawn .cmd shims
// without shell:true. shell:true triggers a Node deprecation warning
// about unescaped concatenation — we accept it because (a) the LONG /
// untrusted strings (system prompt + user prompt) are passed via file
// and stdin, and (b) the remaining argv is short literal flags plus one
// random-UUID temp-file path with no shell metacharacters.
const USE_SHELL = process.platform === 'win32';

/**
 * True if the error looks like "the Anthropic account itself is unusable"
 * (no credit, bad key, blocked). False for transient overload / network /
 * rate-limit, where retrying the API is the right move.
 *
 * Vercel AI SDK wraps provider errors as AI_APICallError with `statusCode`
 * and the original provider message inlined. We look at both.
 */
export function isBillingOrAuthError(err) {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  const status =
    err.statusCode ??
    err.status ??
    err?.response?.status ??
    err?.data?.error?.status;
  if (status === 401 || status === 402 || status === 403) return true;
  return (
    msg.includes('credit balance') ||
    msg.includes('credit_balance') ||
    msg.includes('insufficient_quota') ||
    msg.includes('invalid_api_key') ||
    msg.includes('authentication_error') ||
    msg.includes('quota exceeded') ||
    msg.includes('billing') ||
    msg.includes('payment required')
  );
}

/**
 * Run Claude Code CLI in non-interactive mode. Both the system prompt and
 * the user prompt are passed via temp files / stdin so nothing long or
 * untrusted ever lands on the command line:
 *
 *   - system prompt → temp file → --system-prompt-file
 *   - user prompt   → stdin (cleanup-free, no Windows argv limit)
 *
 *   --tools ""                       disable built-in tools (pure text gen)
 *   --output-format text             just the model's response on stdout
 *   --dangerously-skip-permissions   needed under -p with --tools "" so
 *                                    no permission UI blocks us
 *
 * Returns trimmed stdout. Throws if exit code != 0.
 */
export async function runClaudeCli({ system, prompt, model }) {
  const sysFile = join(tmpdir(), `wu-cli-sys-${randomUUID()}.txt`);
  await writeFile(sysFile, system, 'utf8');

  try {
    return await new Promise((resolve, reject) => {
      const args = [
        '-p',
        '--model', model,
        '--system-prompt-file', sysFile,
        '--tools', '',
        '--output-format', 'text',
        '--dangerously-skip-permissions',
        // Skip user-level settings (~/.claude/...). Otherwise third-party
        // plugins installed there (e.g. claude-mem) register Bash-based
        // SessionEnd hooks that fail on Windows and force exit code 1
        // even though the model response itself was fine.
        '--setting-sources', 'project,local',
      ];

      // Strip Anthropic auth env vars so the CLI falls through to the
      // user's OAuth/keychain credentials (Max subscription). This whole
      // fallback only fires when the API key is unusable, so reusing it
      // here would just reproduce the same failure.
      const childEnv = { ...process.env };
      delete childEnv.ANTHROPIC_API_KEY;
      delete childEnv.ANTHROPIC_AUTH_TOKEN;
      delete childEnv.CLAUDE_CODE_USE_BEDROCK;
      delete childEnv.CLAUDE_CODE_USE_VERTEX;

      const child = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: USE_SHELL,
        windowsHide: true,
        env: childEnv,
      });

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch {}
        reject(new Error(`claude-cli timeout after ${CLI_TIMEOUT_MS}ms`));
      }, CLI_TIMEOUT_MS);

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`claude-cli spawn failed: ${err.message}`));
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          const tail = (stderr || stdout).slice(-800);
          reject(new Error(`claude-cli exit ${code}: ${tail}`));
          return;
        }
        resolve(stdout.trim());
      });

      child.stdin.on('error', () => { /* ignore EPIPE if child died early */ });
      child.stdin.write(prompt);
      child.stdin.end();
    });
  } finally {
    unlink(sysFile).catch(() => { /* best-effort cleanup */ });
  }
}

/**
 * Strip ```json fences and stray prose around a JSON blob. Used for the
 * extract step where we instruct the CLI to "return only JSON" but models
 * occasionally wrap it anyway.
 */
export function extractJsonFromText(text) {
  let s = String(text).trim();
  const fence = s.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fence) s = fence[1].trim();
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(s);
}

/**
 * Same idea as extractJsonFromText but for a JSON ARRAY. Used by the topic
 * generator (asks the CLI for `["topic 1", "topic 2", ...]`).
 */
export function extractJsonArrayFromText(text) {
  let s = String(text).trim();
  const fence = s.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fence) s = fence[1].trim();
  const firstBracket = s.indexOf('[');
  const lastBracket = s.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    s = s.slice(firstBracket, lastBracket + 1);
  }
  const parsed = JSON.parse(s);
  if (!Array.isArray(parsed)) throw new Error('parsed value is not an array');
  return parsed;
}

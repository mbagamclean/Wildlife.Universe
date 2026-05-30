/**
 * One-off: backfill posts.meta_title / meta_description / meta_keywords / excerpt
 * for every post that is missing one of those fields OR has an off-spec length
 * (meta_title > 60 chars, meta_description > 160 chars).
 *
 * Reuses the EXACT same SEO prompt as the posts editor at
 * app/api/ai/seo/route.js (task='generate'), but routes through the
 * Claude Code CLI fallback (Max subscription, no API key needed). Same
 * model the cron pipeline uses for body generation: claude-sonnet-4-6.
 *
 * Resume-safe: re-queries on every run, only picks rows that still fail
 * the spec. Logs per-row progress to logs/seo-backfill.log so you can
 * tail it while the script runs detached.
 *
 * Run (foreground):
 *   node --env-file=.env.local scripts/_one-off/backfill-seo.mjs
 *
 * Tail:
 *   Get-Content logs/seo-backfill.log -Wait -Tail 30
 */

import { createClient } from '@supabase/supabase-js';
import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { runClaudeCli, extractJsonFromText } from '../../lib/content-pipeline/claude-cli-fallback.mjs';

const MODEL = process.env.SEO_BACKFILL_MODEL || 'claude-sonnet-4-6';
const LOG_PATH = 'logs/seo-backfill.log';
const MAX_TITLE = 60;
const MAX_DESC = 160;
const SLEEP_BETWEEN_MS = 1500;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

if (!existsSync('logs')) mkdirSync('logs', { recursive: true });

function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}\n`;
  process.stdout.write(stamped);
  try { appendFileSync(LOG_PATH, stamped); } catch {}
}

const SEO_SYSTEM =
  'You are a senior SEO strategist specializing in wildlife, nature, and conservation content. ' +
  'You write SEO metadata that ranks on Google while feeling human-written. You are deeply familiar ' +
  'with AdSense-safe content requirements, EEAT signals, and modern search intent analysis. ' +
  'Always respond with valid JSON. Return ONLY the JSON object, no markdown fences, no prose, no explanation.';

function buildSEOPrompt(title, bodyText) {
  return `Generate complete SEO metadata for a wildlife article.

Title: "${title}"
Article content (excerpt): ${bodyText.slice(0, 3000)}

Return a JSON object with exactly these fields:
{
  "seoTitle": "50-60 char title with primary keyword near the start",
  "metaDescription": "150-160 char compelling description with keyword and CTA",
  "keywords": "comma-separated list of 5-15 keywords: 1 primary, 3-5 secondary, 5-9 long-tail",
  "excerpt": "2-3 natural human-written sentences summarizing the article value"
}

Rules (HARD CONSTRAINTS — failing these means the output is wrong):
- seoTitle: MUST be 50-60 characters total. Include primary keyword. No clickbait.
- metaDescription: MUST be 150-160 characters total. Click-optimized. End with implicit or explicit CTA.
- keywords: primary keyword first, then secondary, then long-tail phrases 3-5 words each
- excerpt: warm, informative tone. No "In this article" or similar openers.

Return ONLY the JSON object. Start with { and end with }.`;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function needsWork(row) {
  return (
    !row.meta_title ||
    !row.meta_description ||
    !row.meta_keywords ||
    !row.excerpt ||
    (row.meta_title || '').length > MAX_TITLE ||
    (row.meta_description || '').length > MAX_DESC
  );
}

async function fetchTargets() {
  const PAGE = 500;
  let from = 0;
  const targets = [];
  while (true) {
    const { data, error } = await sb
      .from('posts')
      .select('id, slug, title, body, meta_title, meta_description, meta_keywords, excerpt')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch posts: ${error.message}`);
    if (!data.length) break;
    for (const r of data) if (needsWork(r)) targets.push(r);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return targets;
}

// Mirror of pacer.mjs parseResetTime/sleepUntil. The Max CLI prints
// "You've hit your session limit · resets 6:30pm (Africa/...)" — parse
// the wall-clock and sleep until then, instead of burning every queue
// row on the same dead session window.
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

function isSessionLimit(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    /hit\s+your\s+session\s+limit/.test(msg) ||
    /session\s+limit\s*[·•:]\s*reset/.test(msg) ||
    /max-?subscription\s+session\s+limit/.test(msg)
  );
}

async function sleepUntil(targetDate, label) {
  const ms = targetDate.getTime() - Date.now();
  if (ms <= 0) return;
  log(`${label}: sleeping ${(ms / 60000).toFixed(1)} min until ${targetDate.toLocaleString()}`);
  await new Promise((r) => setTimeout(r, ms + 60_000)); // +1min buffer for Max stickiness
  log('awake — resuming backfill');
}

async function backfillOne(row, idx, total) {
  const titleText = row.title || row.slug || '(untitled)';
  const bodyText = stripHtml(row.body);
  if (!bodyText) {
    log(`[${idx + 1}/${total}] SKIP ${row.slug} — empty body`);
    return { ok: false, reason: 'empty-body' };
  }

  const prompt = buildSEOPrompt(titleText, bodyText);
  let raw;
  try {
    raw = await runClaudeCli({ system: SEO_SYSTEM, prompt, model: MODEL });
  } catch (err) {
    // If this was a session-limit hit, sleep until the quoted reset time
    // and retry once. After one retry-after-sleep, give up on this row
    // (the next run will pick it up).
    if (isSessionLimit(err)) {
      const reset = parseResetTime(err.message);
      if (reset) {
        await sleepUntil(reset, `[${idx + 1}/${total}] ${row.slug} — session limit`);
      } else {
        log(`[${idx + 1}/${total}] session limit but no parseable reset — sleeping 10 min`);
        await new Promise((r) => setTimeout(r, 10 * 60_000));
      }
      try {
        raw = await runClaudeCli({ system: SEO_SYSTEM, prompt, model: MODEL });
      } catch (err2) {
        log(`[${idx + 1}/${total}] FAIL ${row.slug} (after sleep) — CLI: ${String(err2.message).slice(0, 300)}`);
        return { ok: false, reason: 'cli-error-after-sleep' };
      }
    } else {
      log(`[${idx + 1}/${total}] FAIL ${row.slug} — CLI: ${String(err.message).slice(0, 300)}`);
      return { ok: false, reason: 'cli-error' };
    }
  }

  let json;
  try {
    json = extractJsonFromText(raw);
  } catch (err) {
    log(`[${idx + 1}/${total}] FAIL ${row.slug} — JSON parse: ${err.message}. Raw start: ${raw.slice(0, 200)}`);
    return { ok: false, reason: 'parse' };
  }

  const seoTitle = String(json.seoTitle || '').trim();
  const metaDescription = String(json.metaDescription || '').trim();
  const keywords = String(json.keywords || '').trim();
  const excerpt = String(json.excerpt || '').trim();

  if (!seoTitle || !metaDescription || !keywords || !excerpt) {
    log(`[${idx + 1}/${total}] FAIL ${row.slug} — incomplete JSON ` +
        `(t=${seoTitle.length} d=${metaDescription.length} k=${keywords.length} e=${excerpt.length})`);
    return { ok: false, reason: 'incomplete' };
  }

  const { error: upErr } = await sb
    .from('posts')
    .update({
      meta_title: seoTitle,
      meta_description: metaDescription,
      meta_keywords: keywords,
      excerpt,
    })
    .eq('id', row.id);

  if (upErr) {
    log(`[${idx + 1}/${total}] FAIL ${row.slug} — DB update: ${upErr.message}`);
    return { ok: false, reason: 'db' };
  }

  log(`[${idx + 1}/${total}] OK   ${row.slug} — t=${seoTitle.length} d=${metaDescription.length} k=${keywords.length}c e=${excerpt.length}c`);
  return { ok: true };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  log(`========== SEO backfill starting (model=${MODEL}) ==========`);
  const targets = await fetchTargets();
  log(`targets: ${targets.length} posts need SEO work`);
  if (targets.length === 0) {
    log('nothing to do — exiting.');
    return;
  }

  let ok = 0, fail = 0;
  const startMs = Date.now();
  for (let i = 0; i < targets.length; i++) {
    const result = await backfillOne(targets[i], i, targets.length);
    if (result.ok) ok++; else fail++;

    if ((i + 1) % 10 === 0) {
      const elapsedMin = (Date.now() - startMs) / 60000;
      const rate = (i + 1) / elapsedMin;
      const remaining = (targets.length - i - 1) / Math.max(rate, 0.01);
      log(`  → progress: ${i + 1}/${targets.length}, ok=${ok} fail=${fail}, ${rate.toFixed(1)}/min, ~${remaining.toFixed(0)}min remaining`);
    }

    await sleep(SLEEP_BETWEEN_MS);
  }

  const totalMin = (Date.now() - startMs) / 60000;
  log(`========== done. ok=${ok} fail=${fail} in ${totalMin.toFixed(1)}min ==========`);
}

main().catch((err) => {
  log(`FATAL: ${err.message}\n${err.stack}`);
  process.exit(1);
});

/**
 * Replace irrelevant AI cover images with real species-accurate photos,
 * written directly into the Wildlife Universe Supabase (service-role key) so
 * BOTH the live site and the Blogger migration get the corrected covers.
 *
 * - Resolves a real photo per post (see lib/image-resolver.mjs).
 * - Backs up every original cover to old-covers-backup.json before overwrite.
 * - Appends a small idempotent credit line to the body to honor attribution.
 * - Resumable via image-fix-state.json; safe to re-run.
 *
 *   node fix-images.mjs --dry-run [--limit N]   # resolve + preview, no writes
 *   node fix-images.mjs [--limit N]             # apply to Supabase
 *   node fix-images.mjs --category insects      # restrict to one category
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from ../../.env.local
 * (the project's own env — never committed).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resolveImage } from './lib/image-resolver.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_LOCAL = path.resolve(__dirname, '..', '..', '.env.local');
const BACKUP = path.join(__dirname, 'old-covers-backup.json');
const STATE = path.join(__dirname, 'image-fix-state.json');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const LIMIT = (() => { const i = argv.indexOf('--limit'); return i >= 0 ? parseInt(argv[i + 1], 10) : Infinity; })();
const CATEGORY = (() => { const i = argv.indexOf('--category'); return i >= 0 ? argv[i + 1] : null; })();
const CREDIT_MARK = 'wu-image-credit';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readEnvLocal() {
  const txt = readFileSync(ENV_LOCAL, 'utf8');
  const get = (k) => (txt.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
  const url = get('SUPABASE_URL') || get('NEXT_PUBLIC_SUPABASE_URL');
  const key = get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
  return { url, key };
}

const loadJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d);

async function fetchAllPosts(sb) {
  const cols = 'slug,title,body,category,scientific_name,cover';
  const all = [];
  const page = 200;
  for (let from = 0; ; from += page) {
    const r = await fetch(`${sb.url}/rest/v1/posts?select=${cols}&status=eq.published&order=created_at.asc`, {
      headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}`, Range: `${from}-${from + page - 1}` },
    });
    if (!r.ok) throw new Error(`Supabase read failed (${r.status}): ${await r.text()}`);
    const rows = await r.json();
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}

async function patchPost(sb, slug, patch) {
  const r = await fetch(`${sb.url}/rest/v1/posts?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: {
      apikey: sb.key,
      Authorization: `Bearer ${sb.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`PATCH ${slug} failed (${r.status}): ${await r.text()}`);
}

function withCredit(body, credit) {
  if (!credit || (body || '').includes(CREDIT_MARK)) return body;
  const safe = credit.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `${body || ''}\n<p class="${CREDIT_MARK}" style="font-size:.8em;color:#8a8a8a;margin-top:1.5em">${safe}</p>`;
}

async function main() {
  const sb = readEnvLocal();
  console.log('Fetching posts...');
  let posts = await fetchAllPosts(sb);
  if (CATEGORY) posts = posts.filter((p) => p.category === CATEGORY);
  console.log(`  ${posts.length} posts${CATEGORY ? ` in ${CATEGORY}` : ''}.`);

  const backup = loadJson(BACKUP, {});
  const state = loadJson(STATE, { done: {}, unresolved: {} });

  const todo = posts.filter((p) => !state.done[p.slug]);
  console.log(`  ${todo.length} to process${DRY ? ' (DRY RUN)' : ''}.\n`);

  let fixed = 0, missed = 0, n = 0;
  for (const p of todo) {
    if (n >= LIMIT) break;
    n++;
    let img = null;
    try { img = await resolveImage(p); } catch (e) { /* treat as miss */ }
    await sleep(350); // be gentle to Wikipedia/iNat

    if (!img) {
      missed++;
      state.unresolved[p.slug] = { title: p.title, sci: p.scientific_name || null };
      if (!DRY) writeFileSync(STATE, JSON.stringify(state, null, 2));
      console.log(`  MISS  [${p.category}] ${p.title}${p.scientific_name ? ` (${p.scientific_name})` : ''}`);
      continue;
    }

    if (DRY) {
      fixed++;
      console.log(`  OK[${img.source}] ${p.title}\n        ${img.url}`);
      continue;
    }

    if (!(p.slug in backup)) { backup[p.slug] = p.cover; writeFileSync(BACKUP, JSON.stringify(backup, null, 2)); }
    await patchPost(sb, p.slug, { cover: img.url, body: withCredit(p.body, img.credit) });
    delete state.unresolved[p.slug];
    state.done[p.slug] = { url: img.url, source: img.source, at: new Date().toISOString() };
    writeFileSync(STATE, JSON.stringify(state, null, 2));
    fixed++;
    if (fixed % 25 === 0) console.log(`  ...${fixed} fixed`);
  }

  console.log(`\n${DRY ? '(DRY) ' : ''}resolved: ${fixed} | unresolved: ${missed}`);
  if (Object.keys(state.unresolved).length)
    console.log(`Unresolved so far: ${Object.keys(state.unresolved).length} (kept original AI cover). See image-fix-state.json.`);
}

main().catch((e) => { console.error('[FATAL]', e.message); process.exit(1); });

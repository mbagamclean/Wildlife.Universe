/**
 * Publish/replace all Blogger static Pages, then reconcile every internal
 * /p/*.html link (in page bodies AND the theme) to the REAL Blogger URLs.
 *
 * Blogger page slugs are frozen at creation and not API-settable, so we
 * publish first, read back each real url, then rewrite links to match.
 *
 *   node --env-file=.env publish-pages.mjs --dry-run   # show plan, no writes
 *   node --env-file=.env publish-pages.mjs             # publish + reconcile
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getAccessToken } from './lib/blogger-auth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'blogger-pages');
const THEME = path.join(ROOT, 'theme', 'wildlifeuniverse-blogger-theme.xml');
const CONFIG = path.join(__dirname, 'pages-config.json');
const OUT_MAP = path.join(__dirname, 'pages-url-map.json');
const API = 'https://www.googleapis.com/blogger/v3';
const BLOG_ID = process.env.BLOGGER_BLOG_ID;
const DRY = process.argv.includes('--dry-run');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Strip a leading HTML comment (the "paste as HTML" note) from page bodies.
function pageBody(file) {
  let s = readFileSync(path.join(PAGES_DIR, file), 'utf8');
  return s.replace(/^\s*<!--[\s\S]*?-->\s*/, '').trim();
}

async function fetchPageIdsByTitle(token) {
  const map = new Map();
  const u = new URL(`${API}/blogs/${BLOG_ID}/pages`);
  u.searchParams.set('fields', 'items(id,title)');
  u.searchParams.set('maxResults', '500');
  u.searchParams.set('view', 'ADMIN');
  const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`pages.list failed (${r.status}): ${await r.text()}`);
  const j = await r.json();
  for (const p of j.items || []) map.set(p.title.trim(), p.id);
  return map;
}

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (/\(429\)/.test(e.message) && attempt < 5) {
        console.warn(`  429 on ${label}; waiting 60s (attempt ${attempt}/5)...`);
        await sleep(60000);
        continue;
      }
      throw e;
    }
  }
}

async function upsertPage(token, { existingId, title, content }) {
  if (existingId) {
    const r = await fetch(`${API}/blogs/${BLOG_ID}/pages/${existingId}?publish=true`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    if (!r.ok) throw new Error(`PATCH ${title} failed (${r.status}): ${await r.text()}`);
    return await r.json();
  }
  const r = await fetch(`${API}/blogs/${BLOG_ID}/pages?isDraft=false`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'blogger#page', title, content }),
  });
  if (!r.ok) throw new Error(`INSERT ${title} failed (${r.status}): ${await r.text()}`);
  return await r.json();
}

async function patchContent(token, id, title, content) {
  const r = await fetch(`${API}/blogs/${BLOG_ID}/pages/${id}?publish=true`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  if (!r.ok) throw new Error(`re-PATCH ${title} failed (${r.status}): ${await r.text()}`);
  return await r.json();
}

function applySubs(text, subs) {
  let out = text;
  for (const [from, to] of subs) out = out.split(from).join(to);
  return out;
}

async function main() {
  const cfg = JSON.parse(readFileSync(CONFIG, 'utf8')).pages;
  const token = DRY ? null : await getAccessToken();

  // Resolve current page ids by title so re-runs never duplicate.
  const liveIds = DRY ? new Map() : await fetchPageIdsByTitle(token);

  // pass 1: ensure every page exists, capture real path
  const map = {};
  const subs = []; // [cleanLink, realPath]
  for (const p of cfg) {
    const content = pageBody(p.file);
    const existingId = p.existingId || liveIds.get(p.title.trim()) || null;
    if (DRY) {
      console.log(`${existingId ? 'PATCH ' : 'CREATE'} "${p.title}"  (${p.file}, ${content.length} chars)  clean=${p.cleanLink}`);
      continue;
    }
    const res = await withRetry(() => upsertPage(token, { existingId, title: p.title, content }), p.title);
    const realPath = new URL(res.url).pathname; // /p/xxx.html
    map[p.intent] = { id: res.id, url: res.url, path: realPath, title: p.title };
    subs.push([p.cleanLink, realPath]);
    console.log(`${existingId ? 'patched' : 'created'}  ${res.url}  "${p.title}"`);
    await sleep(2500);
  }
  if (DRY) return;

  writeFileSync(OUT_MAP, JSON.stringify(map, null, 2));

  // pass 2: rewrite internal /p/ links inside each page body to real paths, re-patch
  console.log('\nReconciling internal links in page bodies...');
  for (const p of cfg) {
    const fixed = applySubs(pageBody(p.file), subs);
    if (fixed !== pageBody(p.file)) {
      await withRetry(() => patchContent(token, map[p.intent].id, p.title, fixed), p.title);
      console.log(`  relinked "${p.title}"`);
      await sleep(2500);
    }
  }

  // pass 3: rewrite the theme's /p/ links to real paths
  console.log('\nRewriting theme page links...');
  let theme = readFileSync(THEME, 'utf8');
  const before = theme;
  theme = applySubs(theme, subs);
  if (theme !== before) {
    writeFileSync(THEME, theme);
    console.log(`  theme updated: ${subs.filter(([c]) => before.includes(c)).length} link types remapped`);
  } else {
    console.log('  (no theme changes)');
  }

  console.log('\nPage URL map written to pages-url-map.json:');
  for (const [k, v] of Object.entries(map)) console.log(`  ${k.padEnd(10)} ${v.path}`);
}

main().catch((e) => { console.error('[FATAL]', e.message); process.exit(1); });

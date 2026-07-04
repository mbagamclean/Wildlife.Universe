/**
 * Wildlife Universe → Blogger migration
 *
 * Publishes all published Supabase posts to the Blogger blog, preserving
 * titles (the theme matches posts by exact title), original publish dates,
 * and taxonomy labels (Category + Label). Prepends the cover image so the
 * theme's hero/cards pick it up as the first body image.
 *
 * Resumable + duplicate-safe: progress is tracked in migration-state.json
 * AND existing Blogger post titles are skipped, so re-running is always safe.
 *
 * Usage:
 *   node --env-file=.env migrate-posts.mjs --dry-run        # preview, no writes
 *   node --env-file=.env migrate-posts.mjs                  # publish (default max 45/run)
 *   node --env-file=.env migrate-posts.mjs --limit 100      # custom per-run cap
 *
 * Blogger enforces an opaque anti-spam daily posting limit. If it trips
 * (403/400 limit error), the script saves state and exits cleanly — just run
 * it again the next day until all posts are migrated.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getAccessToken } from './lib/blogger-auth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, 'migration-state.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BLOG_ID = process.env.BLOGGER_BLOG_ID;
const API_BASE = 'https://www.googleapis.com/blogger/v3';

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const LIMIT = (() => {
  const i = argv.indexOf('--limit');
  return i >= 0 ? Math.max(1, parseInt(argv[i + 1], 10) || 45) : 45;
})();
const DELAY_MS = 4000; // pace inserts gently

// Category slug (Supabase) → display label (Blogger, matches theme nav)
const CATEGORY_LABEL = {
  animals: 'Animals',
  plants: 'Plants',
  birds: 'Birds',
  insects: 'Insects',
  posts: 'Posts',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function loadState() {
  if (!existsSync(STATE_PATH)) return { migrated: {}, failed: {} };
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch { return { migrated: {}, failed: {} }; }
}
function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

async function fetchAllSupabasePosts() {
  const cols = 'slug,title,body,category,label,cover,publish_date,created_at';
  const all = [];
  const page = 100;
  for (let from = 0; ; from += page) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?select=${cols}&status=eq.published&order=created_at.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Range: `${from}-${from + page - 1}`,
        },
      }
    );
    if (!r.ok) throw new Error(`Supabase read failed (HTTP ${r.status}): ${await r.text()}`);
    const rows = await r.json();
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}

/** All existing post titles on the blog (LIVE + DRAFT + SCHEDULED), for dupe-skip. */
async function fetchExistingBloggerTitles(token) {
  const titles = new Set();
  for (const status of ['live', 'draft', 'scheduled']) {
    let pageToken = '';
    do {
      const u = new URL(`${API_BASE}/blogs/${BLOG_ID}/posts`);
      u.searchParams.set('fields', 'nextPageToken,items(title)');
      u.searchParams.set('maxResults', '500');
      u.searchParams.set('status', status.toUpperCase());
      u.searchParams.set('view', 'ADMIN');
      if (pageToken) u.searchParams.set('pageToken', pageToken);
      const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 404) throw new Error(`Blog ${BLOG_ID} not found — check BLOGGER_BLOG_ID.`);
      if (!r.ok) throw new Error(`Blogger list failed (HTTP ${r.status}): ${await r.text()}`);
      const j = await r.json();
      for (const it of j.items || []) titles.add(it.title);
      pageToken = j.nextPageToken || '';
    } while (pageToken);
  }
  return titles;
}

function buildContent(post) {
  let html = '';
  if (post.cover) {
    html += `<img src="${esc(post.cover)}" alt="${esc(post.title)}" style="width:100%;border-radius:12px;" />\n`;
  }
  html += post.body || '';
  return html;
}

function buildLabels(post) {
  const labels = [];
  const cat = CATEGORY_LABEL[(post.category || '').toLowerCase()] || null;
  if (cat) labels.push(cat);
  if (post.label && post.label !== cat) labels.push(post.label);
  return labels;
}

function isDailyLimitError(status, bodyText) {
  if (status !== 403 && status !== 400) return false;
  return /limit|quota|too many|spam/i.test(bodyText);
}

async function insertPost(token, post) {
  const payload = {
    title: post.title,
    content: buildContent(post),
    labels: buildLabels(post),
    published: post.publish_date || post.created_at,
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(`${API_BASE}/blogs/${BLOG_ID}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (r.ok) return { ok: true, json: await r.json() };
    const text = await r.text();
    if (r.status === 401) return { ok: false, reauth: true, error: text };
    if (isDailyLimitError(r.status, text)) return { ok: false, dailyLimit: true, error: text };
    if (r.status === 429 || r.status >= 500) {
      const wait = r.status === 429 ? 60000 : 2 ** attempt * 1000;
      console.warn(`  HTTP ${r.status}, retrying in ${wait / 1000}s (attempt ${attempt}/3)...`);
      await sleep(wait);
      continue;
    }
    return { ok: false, error: `HTTP ${r.status}: ${text}` };
  }
  return { ok: false, error: 'exhausted retries' };
}

async function main() {
  const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'BLOGGER_BLOG_ID'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing in .env: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('Fetching posts from Supabase...');
  const posts = await fetchAllSupabasePosts();
  console.log(`  ${posts.length} published posts in Supabase.`);

  const state = loadState();

  let token = null;
  let existing = new Set();
  if (!DRY_RUN) {
    token = await getAccessToken();
    console.log('OAuth OK. Checking existing Blogger posts...');
    existing = await fetchExistingBloggerTitles(token);
    console.log(`  ${existing.size} posts already on the blog.`);
  }

  const todo = posts.filter((p) => !state.migrated[p.slug] && !existing.has(p.title));
  console.log(`  ${todo.length} posts left to migrate. This run: up to ${LIMIT}.${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  if (DRY_RUN) {
    for (const p of todo.slice(0, 10)) {
      console.log(`- "${p.title}"`);
      console.log(`    labels=[${buildLabels(p).join(', ')}] published=${p.publish_date || p.created_at}`);
      console.log(`    cover=${p.cover ? 'yes' : 'NO'} bodyLen=${(p.body || '').length}`);
    }
    if (todo.length > 10) console.log(`  ... and ${todo.length - 10} more`);
    return;
  }

  let done = 0;
  for (const p of todo.slice(0, LIMIT)) {
    process.stdout.write(`[${done + 1}/${Math.min(LIMIT, todo.length)}] "${p.title}" ... `);
    let res = await insertPost(token, p);
    if (res.reauth) {
      token = await getAccessToken();
      res = await insertPost(token, p);
    }
    if (res.dailyLimit) {
      console.log('BLOCKED');
      console.error(`\nBlogger's daily posting limit tripped: ${res.error}`);
      console.error('State saved. Run the script again tomorrow to continue.');
      saveState(state);
      process.exit(2);
    }
    if (!res.ok) {
      console.log('FAILED');
      console.error(`    ${res.error}`);
      state.failed[p.slug] = { error: String(res.error).slice(0, 300), at: new Date().toISOString() };
      saveState(state);
      continue;
    }
    state.migrated[p.slug] = { postId: res.json.id, url: res.json.url, at: new Date().toISOString() };
    delete state.failed[p.slug];
    saveState(state);
    done++;
    console.log(`OK → ${res.json.url}`);
    await sleep(DELAY_MS);
  }

  const remaining = todo.length - done;
  console.log(`\nDone this run: ${done} published, ${Object.keys(state.failed).length} failed, ${remaining} remaining.`);
  if (remaining > 0) console.log('Run again (tomorrow if the daily limit was near) to continue.');
}

main().catch((e) => {
  console.error('[FATAL]', e.message);
  process.exit(1);
});

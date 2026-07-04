/**
 * Relabel existing Blogger posts from Wildlife Universe Supabase taxonomy.
 *
 * For every post already on the Blogger blog, finds the matching Supabase post
 * (exact title first, then normalized title) and rewrites the Blogger labels
 * to the canonical [Category, Label] pair from Supabase — e.g. a post whose
 * Supabase row is category=birds, label=Song gets labels ["Birds", "Song"].
 *
 * Usage:
 *   node --env-file=.env relabel-posts.mjs --dry-run   # show what would change
 *   node --env-file=.env relabel-posts.mjs             # apply changes
 */

import { getAccessToken } from './lib/blogger-auth.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BLOG_ID = process.env.BLOGGER_BLOG_ID;
const API_BASE = 'https://www.googleapis.com/blogger/v3';

const DRY_RUN = process.argv.includes('--dry-run');

const CATEGORY_LABEL = {
  animals: 'Animals',
  plants: 'Plants',
  birds: 'Birds',
  insects: 'Insects',
  posts: 'Posts',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

function desiredLabels(row) {
  const labels = [];
  const cat = CATEGORY_LABEL[(row.category || '').toLowerCase()] || null;
  if (cat) labels.push(cat);
  if (row.label && row.label !== cat) labels.push(row.label);
  return labels;
}

async function fetchSupabaseTaxonomy() {
  const map = new Map(); // normalized title -> row
  const page = 200;
  for (let from = 0; ; from += page) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?select=slug,title,category,label&order=created_at.asc`,
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
    for (const row of rows) map.set(norm(row.title), row);
    if (rows.length < page) break;
  }
  return map;
}

async function fetchBloggerPosts(token) {
  const posts = [];
  for (const status of ['live', 'draft', 'scheduled']) {
    let pageToken = '';
    do {
      const u = new URL(`${API_BASE}/blogs/${BLOG_ID}/posts`);
      u.searchParams.set('fields', 'nextPageToken,items(id,title,labels)');
      u.searchParams.set('maxResults', '500');
      u.searchParams.set('status', status.toUpperCase());
      u.searchParams.set('view', 'ADMIN');
      if (pageToken) u.searchParams.set('pageToken', pageToken);
      const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 404) throw new Error(`Blog ${BLOG_ID} not found — check BLOGGER_BLOG_ID.`);
      if (!r.ok) throw new Error(`Blogger list failed (HTTP ${r.status}): ${await r.text()}`);
      const j = await r.json();
      posts.push(...(j.items || []));
      pageToken = j.nextPageToken || '';
    } while (pageToken);
  }
  return posts;
}

async function patchLabels(token, postId, labels) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(`${API_BASE}/blogs/${BLOG_ID}/posts/${postId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels }),
    });
    if (r.ok) return { ok: true };
    const text = await r.text();
    if (r.status === 401) return { ok: false, reauth: true, error: text };
    if (r.status === 429 || r.status >= 500) {
      await sleep(r.status === 429 ? 60000 : 2 ** attempt * 1000);
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

  console.log('Loading Supabase taxonomy...');
  const tax = await fetchSupabaseTaxonomy();
  console.log(`  ${tax.size} Supabase posts indexed.`);

  let token = await getAccessToken();
  console.log('Listing Blogger posts...');
  const posts = await fetchBloggerPosts(token);
  console.log(`  ${posts.length} posts on the blog.\n`);

  let changed = 0, same = 0, unmatched = 0, failed = 0;
  const unmatchedTitles = [];

  for (const p of posts) {
    const row = tax.get(norm(p.title));
    if (!row) {
      unmatched++;
      unmatchedTitles.push(p.title);
      continue;
    }
    const want = desiredLabels(row);
    const have = (p.labels || []).slice();
    const sameLabels = want.length === have.length && want.every((l) => have.includes(l));
    if (sameLabels) { same++; continue; }

    console.log(`"${p.title}"`);
    console.log(`    [${have.join(', ') || 'none'}] → [${want.join(', ')}]`);
    if (DRY_RUN) { changed++; continue; }

    let res = await patchLabels(token, p.id, want);
    if (res.reauth) {
      token = await getAccessToken();
      res = await patchLabels(token, p.id, want);
    }
    if (res.ok) changed++;
    else { failed++; console.error(`    FAILED: ${res.error}`); }
    await sleep(1000);
  }

  console.log(`\n${DRY_RUN ? '(DRY RUN) Would change' : 'Changed'}: ${changed} | already correct: ${same} | no Supabase match: ${unmatched} | failed: ${failed}`);
  if (unmatchedTitles.length) {
    console.log('\nNo Supabase match (left untouched):');
    for (const t of unmatchedTitles.slice(0, 20)) console.log(`  - ${t}`);
    if (unmatchedTitles.length > 20) console.log(`  ... and ${unmatchedTitles.length - 20} more`);
  }
}

main().catch((e) => {
  console.error('[FATAL]', e.message);
  process.exit(1);
});

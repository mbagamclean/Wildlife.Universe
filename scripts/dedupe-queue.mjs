/**
 * One-shot pending-queue duplicate sweeper.
 *
 * Scans every status='pending' content_queue row, fingerprints its topic,
 * and marks duplicates as failed (status='failed', reason captures the
 * conflict). Two classes of duplicates are caught:
 *
 *   1. duplicate-of-published — a published post already exists with the
 *      same scientific name (cross-category) OR the same title.
 *   2. duplicate-in-queue-older — two pending rows share the same
 *      fingerprint; the YOUNGER row (by created_at) is marked failed,
 *      the older one is kept so the cron can generate it.
 *
 * Token math: the existing dedup runs AFTER generation. Each duplicate
 * burns ~16 min of CLI body+extract on Max + an image-gen call. Running
 * this script up front saves all of that for every match.
 *
 * Run:
 *   node --env-file=.env.local scripts/dedupe-queue.mjs
 *   node --env-file=.env.local scripts/dedupe-queue.mjs --dry-run
 *
 * Idempotent — safe to re-run; only acts on status='pending'.
 */

import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// Same fingerprint convention used by the topic generator and the
// pre-generation dedup check in dedup.mjs. For species topics the
// scientific name is the canonical identity; for posts/* (concept
// articles with no scientific name) the normalized title is.
function fingerprintTopic(topic) {
  const trimmed = String(topic || '').trim();
  if (!trimmed) return null;
  // Species: "Common Name (Scientific name)" → use scientific name.
  const sci = trimmed.match(/\(([^)]+)\)\s*$/);
  if (sci) {
    return 'sci:' + sci[1].toLowerCase().trim().replace(/\s+/g, ' ');
  }
  // Posts: normalized title only.
  return 'txt:' + trimmed.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
}

function fingerprintPublishedPost(post) {
  // Scientific name takes precedence (matches species fingerprint above).
  if (post.scientific_name) {
    return 'sci:' + post.scientific_name.toLowerCase().trim().replace(/\s+/g, ' ');
  }
  if (post.title) {
    return 'txt:' + post.title.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
  }
  return null;
}

async function fetchAll(sb, table, columns) {
  // Paginate (Supabase default cap is 1000 rows per select).
  const all = [];
  let from = 0;
  const SIZE = 1000;
  while (true) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < SIZE) break;
    from += SIZE;
  }
  return all;
}

async function main() {
  for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[k]) { console.error(`FATAL: missing ${k}`); process.exit(2); }
  }
  const dryRun = process.argv.includes('--dry-run');
  const sb = admin();

  console.log('Loading published posts and pending queue rows…');
  const [publishedPosts, pendingQueue] = await Promise.all([
    fetchAll(sb, 'posts', 'id, slug, title, scientific_name, category, label').then((arr) => arr.filter((p) => p.id)),
    fetchAll(sb, 'content_queue', 'id, topic, category, label, created_at, status').then((arr) => arr.filter((r) => r.status === 'pending')),
  ]);
  console.log(`Published posts: ${publishedPosts.length}`);
  console.log(`Pending queue rows: ${pendingQueue.length}`);

  // Build the fingerprint → post lookup for published content.
  const publishedByFingerprint = new Map();
  for (const p of publishedPosts) {
    const fp = fingerprintPublishedPost(p);
    if (fp && !publishedByFingerprint.has(fp)) publishedByFingerprint.set(fp, p);
  }

  // First pass: which pending rows duplicate a published post?
  const dupOfPublished = [];
  // Second pass tracking: which fingerprints have we already "kept" from
  // the pending set? Process pending in created_at ASC order so the
  // OLDEST per fingerprint wins; subsequent matches are duplicates.
  const keptFromQueue = new Map();
  const dupInQueue = [];

  const pendingSorted = pendingQueue.slice().sort(
    (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
  );

  for (const row of pendingSorted) {
    const fp = fingerprintTopic(row.topic);
    if (!fp) continue;
    const publishedMatch = publishedByFingerprint.get(fp);
    if (publishedMatch) {
      dupOfPublished.push({ row, match: publishedMatch });
      continue;
    }
    const keptRow = keptFromQueue.get(fp);
    if (keptRow) {
      dupInQueue.push({ row, keptRow });
    } else {
      keptFromQueue.set(fp, row);
    }
  }

  console.log(`\nFound ${dupOfPublished.length} pending row(s) duplicating PUBLISHED posts:`);
  for (const { row, match } of dupOfPublished.slice(0, 20)) {
    console.log(`  ✗ [${row.category}/${row.label}] ${row.topic}  →  /posts/${match.slug}`);
  }
  if (dupOfPublished.length > 20) console.log(`    …and ${dupOfPublished.length - 20} more`);

  console.log(`\nFound ${dupInQueue.length} pending row(s) duplicating OLDER pending rows:`);
  for (const { row, keptRow } of dupInQueue.slice(0, 20)) {
    console.log(`  ✗ [${row.category}/${row.label}] ${row.topic}  →  kept ${keptRow.id} (${keptRow.category}/${keptRow.label})`);
  }
  if (dupInQueue.length > 20) console.log(`    …and ${dupInQueue.length - 20} more`);

  const totalToCancel = dupOfPublished.length + dupInQueue.length;
  if (totalToCancel === 0) {
    console.log('\nNo duplicates found in pending queue — nothing to do.');
    return;
  }

  if (dryRun) {
    console.log(`\n[dry-run] ${totalToCancel} row(s) would be marked failed. No DB writes.`);
    return;
  }

  // Apply updates in two batched passes — IN-list updates so each call
  // touches one chunk of rows.
  const CHUNK = 100;
  let cancelled = 0;

  // dup-of-published
  for (let i = 0; i < dupOfPublished.length; i += CHUNK) {
    const chunk = dupOfPublished.slice(i, i + CHUNK);
    // Per-row update because each carries a different reason string
    // (including the matched slug). Use Promise.all for parallelism.
    await Promise.all(chunk.map(({ row, match }) =>
      sb.from('content_queue').update({
        status: 'failed',
        generated_post_id: match.id,
        last_error: `[pre-dedup] duplicate-of-published → /posts/${match.slug}`,
      }).eq('id', row.id)
    ));
    cancelled += chunk.length;
    console.log(`  cancelled dup-of-published: ${cancelled}/${dupOfPublished.length}`);
  }

  let cancelled2 = 0;
  for (let i = 0; i < dupInQueue.length; i += CHUNK) {
    const chunk = dupInQueue.slice(i, i + CHUNK);
    await Promise.all(chunk.map(({ row, keptRow }) =>
      sb.from('content_queue').update({
        status: 'failed',
        last_error: `[pre-dedup] duplicate-in-queue-younger → kept ${keptRow.id}`,
      }).eq('id', row.id)
    ));
    cancelled2 += chunk.length;
    console.log(`  cancelled dup-in-queue: ${cancelled2}/${dupInQueue.length}`);
  }

  // Final state
  const finalPending = (await sb.from('content_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending')).count;
  console.log(`\n========== DEDUPE COMPLETE ==========`);
  console.log(`Cancelled duplicate-of-published: ${dupOfPublished.length}`);
  console.log(`Cancelled duplicate-in-queue:     ${dupInQueue.length}`);
  console.log(`Remaining pending in queue:       ${finalPending}`);
  console.log(`Tokens saved (est ~$0.26/article): $${(totalToCancel * 0.26).toFixed(2)}`);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });

/**
 * One-shot recovery for draft posts orphaned by the animals-only quality
 * gate before it was made category-aware on 2026-05-24.
 *
 * Many high-quality plants/birds/insects/posts articles were inserted as
 * drafts (status='draft') and then rejected because their headings used
 * category-appropriate names ("Growth Systems & Physiology" for plants
 * instead of "Behaviour"). The new quality gate accepts those. This
 * script re-evaluates every existing draft against the new gate and
 * promotes the passing ones to 'published'.
 *
 * Run:
 *   node --env-file=.env.local scripts/recover-orphan-drafts.mjs
 *   node --env-file=.env.local scripts/recover-orphan-drafts.mjs --dry-run
 *
 * Idempotent: drafts that still don't pass remain drafts. Safe to re-run.
 */

import { createClient } from '@supabase/supabase-js';
import { validateGeneratedPost } from '../lib/content-pipeline/quality.mjs';
import { pingRevalidate } from './_lib/revalidate.mjs';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function fetchAllDrafts(sb) {
  // Paginate — Supabase caps select at 1000 rows by default.
  const all = [];
  let from = 0;
  const SIZE = 500;
  while (true) {
    const { data, error } = await sb
      .from('posts')
      .select('id, slug, title, status, body, category, label, scientific_name, iucn_status, faq, cover, created_at')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .range(from, from + SIZE - 1);
    if (error) { console.error('read failed:', error); process.exit(1); }
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

  const drafts = await fetchAllDrafts(sb);
  if (!drafts.length) {
    console.log('No draft posts found — nothing to recover.');
    return;
  }
  console.log(`Found ${drafts.length} draft post(s). Re-evaluating against category-aware quality gate…\n`);

  const toPromote = [];
  const stillFailing = [];

  for (const p of drafts) {
    const result = validateGeneratedPost({
      body: p.body,
      structured: {
        scientificName: p.scientific_name,
        slug: p.slug,
        iucnStatus: p.iucn_status,
        faq: p.faq,
      },
      coverUrl: typeof p.cover === 'string' ? p.cover : null,
      category: p.category,
    });
    const tag = `[${p.category}/${p.label}] ${p.title}`;
    if (result.ok) {
      console.log(`  ✓ ${tag} — PASS (will promote)`);
      toPromote.push(p);
    } else {
      console.log(`  ✗ ${tag} — still failing: ${result.reasons.join('; ')}`);
      stillFailing.push({ post: p, reasons: result.reasons });
    }
  }

  console.log(`\n${toPromote.length} draft(s) will be promoted to 'published'`);
  console.log(`${stillFailing.length} draft(s) still don't pass the new gate (left as draft)`);

  if (dryRun) {
    console.log('\n[dry-run] — no DB writes performed.');
    return;
  }

  if (!toPromote.length) {
    console.log('Nothing to write.');
    return;
  }

  // Promote in chunks. Also restore the corresponding content_queue row to
  // status='generated' if we can find one by topic match.
  const CHUNK = 50;
  let promoted = 0;
  for (let i = 0; i < toPromote.length; i += CHUNK) {
    const ids = toPromote.slice(i, i + CHUNK).map((p) => p.id);
    const { error } = await sb.from('posts').update({ status: 'published' }).in('id', ids);
    if (error) { console.error('promote failed:', error); process.exit(1); }
    promoted += ids.length;
    console.log(`  promoted chunk: ${promoted}/${toPromote.length}`);
  }

  // Best-effort: also fix the orphan content_queue rows so the queue
  // accounting reflects reality. Match by category + topic = title.
  let queueFixed = 0;
  for (const p of toPromote) {
    const { data: qrows } = await sb
      .from('content_queue')
      .select('id')
      .eq('category', p.category)
      .eq('topic', p.title)
      .eq('status', 'failed')
      .limit(1);
    if (qrows?.length) {
      await sb
        .from('content_queue')
        .update({
          status: 'generated',
          generated_post_id: p.id,
          generated_at: p.created_at,
          last_error: 'recovered-after-quality-gate-rewrite',
        })
        .eq('id', qrows[0].id);
      queueFixed += 1;
    }
  }

  // Single full-site cache purge — much cheaper than one ping per
  // promoted post, and revalidatePath('/', 'layout') is already maximal
  // scope (everything that uses the root layout = every public route).
  if (promoted > 0) await pingRevalidate();

  console.log(`\n========== RECOVERY DONE ==========`);
  console.log(`Promoted to published: ${promoted}`);
  console.log(`Queue rows reconciled: ${queueFixed}`);
  console.log(`Still drafts (don't pass new gate): ${stillFailing.length}`);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });

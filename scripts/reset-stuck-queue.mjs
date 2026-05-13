/**
 * One-shot recovery script.
 *
 * The May 12-13 dall-e-3 outage left content_queue rows pinned at
 * status='pending' with attempts=3, which the cron worker's
 * `.lt('attempts', 3)` filter then skips forever. Anything stuck in
 * 'generating' from a killed run hits the same dead end.
 *
 * Run once after deploying the gpt-image-1 fix:
 *   node --env-file=.env.local scripts/reset-stuck-queue.mjs
 *
 * Prints a count of rows by status before + after.
 */

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function countByStatus(label) {
  const { data, error } = await sb
    .from('content_queue')
    .select('status, attempts');
  if (error) throw error;
  const byStatus = data.reduce((acc, r) => {
    const k = `${r.status} (attempts=${r.attempts})`;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  console.log(`\n[${label}] queue snapshot (${data.length} rows):`);
  for (const k of Object.keys(byStatus).sort()) console.log(`  ${k}: ${byStatus[k]}`);
}

async function main() {
  await countByStatus('before');

  // 1. Pending + attempts >= MAX_ATTEMPTS (filtered out of normal runs).
  //    Reset attempts so they're picked up again.
  const { data: stuckPending, error: e1 } = await sb
    .from('content_queue')
    .update({ attempts: 0, last_error: null })
    .eq('status', 'pending')
    .gte('attempts', 3)
    .select('id, category, label, topic');
  if (e1) throw e1;
  console.log(`\nreset ${stuckPending?.length || 0} stuck pending rows:`);
  for (const r of stuckPending || []) console.log(`  ${r.id} ${r.category}/${r.label} → ${r.topic}`);

  // 2. Anything stuck in 'generating' from a killed run — flip back to
  //    pending and reset attempts so it'll be retried.
  const { data: stuckGen, error: e2 } = await sb
    .from('content_queue')
    .update({ status: 'pending', attempts: 0, last_error: 'reset: was stuck in generating' })
    .eq('status', 'generating')
    .select('id, category, label, topic');
  if (e2) throw e2;
  console.log(`\nreset ${stuckGen?.length || 0} stuck-generating rows`);
  for (const r of stuckGen || []) console.log(`  ${r.id} ${r.category}/${r.label} → ${r.topic}`);

  // 3. The dall-e-3 outage marked some rows status='failed' with
  //    `generation-failed-final: ... dall-e-3 does not exist`. Bring
  //    those back to pending — the underlying generator is now fixed.
  const { data: dalleFailed, error: e3 } = await sb
    .from('content_queue')
    .update({ status: 'pending', attempts: 0, last_error: null })
    .eq('status', 'failed')
    .ilike('last_error', '%dall-e-3 does not exist%')
    .select('id, category, label, topic');
  if (e3) throw e3;
  console.log(`\nrevived ${dalleFailed?.length || 0} dall-e-3-failed rows`);
  for (const r of dalleFailed || []) console.log(`  ${r.id} ${r.category}/${r.label} → ${r.topic}`);

  await countByStatus('after');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

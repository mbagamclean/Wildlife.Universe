/**
 * Reset all content_queue rows with status='failed' back to 'pending'
 * with attempts=0. Used after the CLI fallback shim landed — the previous
 * billing failures can now be reattempted via the Max subscription.
 *
 * Run:
 *   node --env-file=.env.local scripts/retry-failed.mjs
 *
 * Idempotent: safe to re-run, but a no-op once everything is pending or
 * generated. Will refuse to reset if there are 0 failed rows so you get
 * a clear confirmation either way.
 */

import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function main() {
  for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[k]) {
      console.error(`FATAL: missing required env var ${k}`);
      process.exit(2);
    }
  }
  const sb = admin();

  const { data: failed, error: readErr } = await sb
    .from('content_queue')
    .select('id, topic, last_error')
    .eq('status', 'failed');

  if (readErr) {
    console.error('read failed:', readErr);
    process.exit(1);
  }

  if (!failed || failed.length === 0) {
    console.log('No failed rows — nothing to reset.');
    return;
  }

  console.log(`Found ${failed.length} failed row(s):`);
  for (const r of failed) {
    console.log(`  - ${r.topic} :: ${(r.last_error || '').slice(0, 120)}`);
  }

  const { error: updErr, count } = await sb
    .from('content_queue')
    .update(
      { status: 'pending', attempts: 0, last_error: 'reset-after-cli-fallback' },
      { count: 'exact' },
    )
    .eq('status', 'failed');

  if (updErr) {
    console.error('update failed:', updErr);
    process.exit(1);
  }

  console.log(`\nReset ${count ?? failed.length} row(s) → pending, attempts=0`);
  console.log(`Run scripts/cron-batch.mjs to start regeneration.`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

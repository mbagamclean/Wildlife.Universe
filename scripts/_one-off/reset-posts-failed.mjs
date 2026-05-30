import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

// Reset every posts-category row that's not currently `generated`
// (anything stuck in pending/failed/generating from the old prompt era)
// back to pending with attempts=0 so the tuned prompts have a clean
// retry budget. Doesn't touch successfully-published rows.
const { data: pre, error: preErr } = await sb
  .from('content_queue')
  .select('id, status, attempts, last_error', { count: 'exact' })
  .eq('category', 'posts')
  .in('status', ['failed', 'pending', 'generating'])
  .order('updated_at', { ascending: false });
if (preErr) { console.error(preErr); process.exit(1); }
console.log(`Found ${pre.length} non-generated posts rows. Resetting attempts → 0 and clearing last_error.`);

const { error: upErr } = await sb
  .from('content_queue')
  .update({ status: 'pending', attempts: 0, last_error: null })
  .eq('category', 'posts')
  .in('status', ['failed', 'pending', 'generating']);
if (upErr) { console.error(upErr); process.exit(1); }
console.log(`Reset complete.`);

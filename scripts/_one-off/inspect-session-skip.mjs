import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
const { data, error } = await sb
  .from('content_queue')
  .select('id, category, label, topic, last_error, attempts, status, updated_at')
  .ilike('last_error', '%session-limit-skip%')
  .order('updated_at', { ascending: false })
  .limit(20);
if (error) { console.error(error); process.exit(1); }
console.log(`Found ${data.length} rows with session-limit-skip last_error:\n`);
for (const r of data) {
  console.log(`---`);
  console.log(`id=${r.id} cat=${r.category} label=${r.label} status=${r.status} attempts=${r.attempts}`);
  console.log(`topic: ${r.topic?.slice(0,100)}`);
  console.log(`updated: ${r.updated_at}`);
  console.log(`last_error: ${r.last_error?.slice(0, 600)}`);
}

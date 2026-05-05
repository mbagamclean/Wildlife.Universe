import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { MEDIA_BUCKET, MEDIA_TABLE } from '@/lib/media/library';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

function noStore(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

async function authStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return { error: 'Forbidden', status: 403 };
  }
  return { supabase, user };
}

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET — list every media row newest-first, with optional ?kind= and ?source= filters
export async function GET(req) {
  const auth = await authStaff();
  if (auth.error) return noStore({ success: false, error: auth.error }, auth.status);

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind');     // image | video | audio
  const source = url.searchParams.get('source'); // upload | ai-generated | ...
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '500', 10), 2000);

  let q = getAdmin()
    .from(MEDIA_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (kind)   q = q.eq('media_kind', kind);
  if (source) q = q.eq('source', source);

  const { data, error } = await q;
  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return noStore({
        success: false,
        error: 'table_missing',
        message: 'Run migration 008_media_library.sql in Supabase.',
      }, 200);
    }
    return noStore({ success: false, error: error.message }, 500);
  }
  return noStore({ success: true, items: data || [] });
}

// DELETE ?id=... — removes the row AND the file from storage if we own it
export async function DELETE(req) {
  const auth = await authStaff();
  if (auth.error) return noStore({ success: false, error: auth.error }, auth.status);

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return noStore({ success: false, error: 'id required' }, 400);

  const adminClient = getAdmin();

  // Look up the row first so we know whether to also delete from storage
  const { data: row, error: findErr } = await adminClient
    .from(MEDIA_TABLE)
    .select('id, storage_path, variants')
    .eq('id', id)
    .maybeSingle();
  if (findErr) return noStore({ success: false, error: findErr.message }, 500);
  if (!row) return noStore({ success: false, error: 'not found' }, 404);

  // Collect every storage path we know about for this row — primary + variants
  const paths = new Set();
  if (row.storage_path) paths.add(row.storage_path);
  const v = row.variants || {};
  // Common variant fields our pipeline produces
  for (const key of ['avifPath', 'webpPath', 'avif1600Path', 'webp1600Path', 'webmPath', 'posterPath']) {
    if (typeof v[key] === 'string') paths.add(v[key]);
  }

  if (paths.size > 0) {
    const { error: rmErr } = await adminClient.storage.from(MEDIA_BUCKET).remove([...paths]);
    if (rmErr) console.warn('[/api/admin/media] storage remove failed:', rmErr.message);
  }

  const { error: delErr } = await adminClient.from(MEDIA_TABLE).delete().eq('id', id);
  if (delErr) return noStore({ success: false, error: delErr.message }, 500);

  return noStore({ success: true });
}

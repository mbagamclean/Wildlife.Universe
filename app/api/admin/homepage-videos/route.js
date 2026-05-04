import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'admin']);
const SECTIONS = new Set(['featured', 'shorts', 'documentaries']);

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

function genId() {
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET() {
  const auth = await authStaff();
  if (auth.error) return noStore({ success: false, error: auth.error }, auth.status);

  const { data, error } = await auth.supabase
    .from('homepage_videos')
    .select('*')
    .order('section')
    .order('position')
    .order('created_at', { ascending: false });

  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return noStore({
        success: false,
        error: 'table_missing',
        message: 'Run migration 006_homepage_videos.sql in Supabase.',
      }, 200);
    }
    return noStore({ success: false, error: error.message }, 500);
  }

  return noStore({ success: true, videos: data || [] });
}

export async function POST(req) {
  const auth = await authStaff();
  if (auth.error) return noStore({ success: false, error: auth.error }, auth.status);

  let body = {};
  try { body = await req.json(); } catch {}
  const {
    sourceUrl,
    sourceType = 'embed',
    provider = null,
    title = null,
    description = null,
    thumbnail = null,
    section = 'featured',
    position = 0,
    durationSec = null,
    active = true,
  } = body || {};

  if (!sourceUrl || !String(sourceUrl).trim()) {
    return noStore({ success: false, error: 'sourceUrl is required' }, 400);
  }
  if (!SECTIONS.has(section)) {
    return noStore({ success: false, error: `invalid section (use: ${[...SECTIONS].join(', ')})` }, 400);
  }

  const row = {
    id: genId(),
    source_url: String(sourceUrl).trim(),
    source_type: sourceType === 'upload' ? 'upload' : 'embed',
    provider,
    title: title?.trim() || null,
    description: description?.trim() || null,
    thumbnail: thumbnail?.trim() || null,
    section,
    position: parseInt(position, 10) || 0,
    duration_sec: durationSec ? parseInt(durationSec, 10) : null,
    active: !!active,
  };

  const { data, error } = await auth.supabase
    .from('homepage_videos')
    .insert(row)
    .select()
    .single();
  if (error) return noStore({ success: false, error: error.message }, 500);

  return noStore({ success: true, video: data });
}

export async function PATCH(req) {
  const auth = await authStaff();
  if (auth.error) return noStore({ success: false, error: auth.error }, auth.status);

  let body = {};
  try { body = await req.json(); } catch {}
  const { id, ...patch } = body || {};
  if (!id) return noStore({ success: false, error: 'id required' }, 400);

  if (patch.section && !SECTIONS.has(patch.section)) {
    return noStore({ success: false, error: 'invalid section' }, 400);
  }

  const dbPatch = {};
  if (patch.sourceUrl   !== undefined) dbPatch.source_url   = String(patch.sourceUrl).trim();
  if (patch.sourceType  !== undefined) dbPatch.source_type  = patch.sourceType === 'upload' ? 'upload' : 'embed';
  if (patch.provider    !== undefined) dbPatch.provider     = patch.provider;
  if (patch.title       !== undefined) dbPatch.title        = patch.title?.trim() || null;
  if (patch.description !== undefined) dbPatch.description  = patch.description?.trim() || null;
  if (patch.thumbnail   !== undefined) dbPatch.thumbnail    = patch.thumbnail?.trim() || null;
  if (patch.section     !== undefined) dbPatch.section      = patch.section;
  if (patch.position    !== undefined) dbPatch.position     = parseInt(patch.position, 10) || 0;
  if (patch.durationSec !== undefined) dbPatch.duration_sec = patch.durationSec ? parseInt(patch.durationSec, 10) : null;
  if (patch.active      !== undefined) dbPatch.active       = !!patch.active;

  const { data, error } = await auth.supabase
    .from('homepage_videos')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .single();
  if (error) return noStore({ success: false, error: error.message }, 500);

  return noStore({ success: true, video: data });
}

export async function DELETE(req) {
  const auth = await authStaff();
  if (auth.error) return noStore({ success: false, error: auth.error }, auth.status);

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return noStore({ success: false, error: 'id required' }, 400);

  const { error } = await auth.supabase
    .from('homepage_videos')
    .delete()
    .eq('id', id);
  if (error) return noStore({ success: false, error: error.message }, 500);

  return noStore({ success: true });
}

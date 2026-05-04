import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);
const BUCKET = 'media';
const MAX_BYTES = 500 * 1024 * 1024; // hard ceiling — Supabase free tier is generous

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * POST /api/upload/sign
 *
 * Returns a one-time signed URL that lets the browser PUT a video
 * directly into Supabase Storage. Bypasses Vercel's 4.5 MB serverless
 * function body limit, which makes server-side video uploads impossible
 * past that threshold (the user sees an HTML "Request Entity Too Large"
 * page that fails JSON.parse).
 *
 * Body: { filename, contentType, size }
 * Returns: { success, signedUrl, token, path, publicUrl, contentType }
 */
export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const { filename = '', contentType = '', size = 0 } = body || {};

  if (!filename || !contentType) {
    return NextResponse.json({ success: false, error: 'filename and contentType are required' }, { status: 400 });
  }
  if (!contentType.startsWith('video/') && !contentType.startsWith('image/')) {
    return NextResponse.json({ success: false, error: 'Only image/* and video/* content types are allowed' }, { status: 400 });
  }
  if (size && size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: `File exceeds ${Math.round(MAX_BYTES / 1024 / 1024)} MB limit` },
      { status: 413 }
    );
  }

  // Pick a safe extension from the filename or content-type
  const fileExt = (filename.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ctExt   = (contentType.split('/')[1] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ext = (fileExt && fileExt.length <= 5 ? fileExt : ctExt) || 'bin';

  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const folder = contentType.startsWith('video/') ? 'videos' : 'images';
  const path = `${folder}/${uid}.${ext}`;

  const admin = getAdmin();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  return NextResponse.json({
    success: true,
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl,
    contentType,
  });
}

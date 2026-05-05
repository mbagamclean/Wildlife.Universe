import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { registerMedia, publicUrl } from '@/lib/media/library';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

/**
 * POST /api/admin/media/register
 *
 * Called by the client after a direct-to-Supabase upload (videos via
 * signed URL) so the file gets a row in the media_library inventory.
 * Server-side upload paths (/api/upload, /api/ai/image, etc.) call
 * registerMedia() directly without going through this endpoint.
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
  const {
    path, fileType, fileSize,
    originalFilename = null, width = null, height = null, durationSec = null,
    source = 'upload', variants = null,
  } = body || {};

  if (!path || !fileType) {
    return NextResponse.json({ success: false, error: 'path and fileType required' }, { status: 400 });
  }
  if (!path.startsWith('videos/') && !path.startsWith('images/') && !path.startsWith('audio/') && !path.startsWith('ai/')) {
    return NextResponse.json({ success: false, error: 'invalid path prefix' }, { status: 400 });
  }

  const mediaKind = fileType.startsWith('video/')
    ? 'video'
    : fileType.startsWith('audio/')
      ? 'audio'
      : 'image';

  const filename = path.split('/').pop() || path;
  const row = await registerMedia({
    filename,
    originalFilename: originalFilename || filename,
    storagePath: path,
    fileUrl: publicUrl(path),
    fileType,
    mediaKind,
    fileSize,
    width,
    height,
    durationSec,
    source,
    variants,
    uploadedBy: user.id,
  });

  return NextResponse.json({ success: !!row, item: row });
}

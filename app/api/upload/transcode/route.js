import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { transcodeVideo } from '@/lib/media/transcode';

export const runtime = 'nodejs';
// Up to 5 minutes for VP9 encoding. Requires Vercel Pro plan to honour
// the full duration; on Hobby it caps at 60s and the function is killed
// mid-encode — the client treats that as a soft failure and keeps the
// original-only sources, so playback still works.
export const maxDuration = 300;

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);
const BUCKET = 'media';
// Files larger than this skip transcoding to fit Vercel's 512MB /tmp +
// 1GB function memory ceiling. We still extract a poster.
const SKIP_TRANSCODE_BYTES = 120 * 1024 * 1024;

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function publicUrlFor(path) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * POST /api/upload/transcode  body: { path }
 *
 * Triggered by the client after a successful direct-to-Supabase upload.
 * Downloads the file, runs ffmpeg → VP9/Opus WebM + WebP poster, uploads
 * the new artifacts back to the same bucket alongside the original.
 *
 * Returns: { success, data: { transcoded, reason, webmUrl, posterUrl, ...bytes } }
 *
 * Always returns 200 on graceful failure (caller can keep original-only).
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
  const { path } = body || {};

  // Path safety — only paths we created via /api/upload/sign are accepted
  if (!path || typeof path !== 'string' || !path.startsWith('videos/') || path.includes('..')) {
    return NextResponse.json({ success: false, error: 'invalid path' }, { status: 400 });
  }

  const admin = getAdmin();

  // Skip if it's already WebM — nothing to transcode
  if (/\.webm$/i.test(path)) {
    return NextResponse.json({
      success: true,
      data: { transcoded: false, reason: 'already_webm' },
    });
  }

  // Download the original from storage
  const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(path);
  if (dlErr || !blob) {
    return NextResponse.json(
      { success: false, error: dlErr?.message || 'file not found in storage' },
      { status: 404 }
    );
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const result = {
    transcoded: false,
    reason: null,
    originalBytes: buffer.length,
    webmBytes: 0,
    posterBytes: 0,
    webmUrl: null,
    posterUrl: null,
  };

  // Files over the cap skip transcoding but we still try a poster (cheap)
  if (buffer.length > SKIP_TRANSCODE_BYTES) {
    try {
      const t = await transcodeVideo(buffer);
      if (t.poster) {
        const posterPath = path.replace(/\.[^.]+$/, '') + '-poster.webp';
        await admin.storage.from(BUCKET).upload(posterPath, t.poster, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '31536000',
        });
        result.posterUrl = publicUrlFor(posterPath);
        result.posterBytes = t.poster.length;
      }
    } catch { /* poster extraction is best-effort */ }
    result.reason = 'too_large';
    return NextResponse.json({ success: true, data: result });
  }

  // Full transcode + poster
  let t;
  try {
    t = await transcodeVideo(buffer);
  } catch (err) {
    return NextResponse.json({
      success: true,
      data: { ...result, reason: 'transcode_failed', error: err?.message },
    });
  }

  // Upload WebM if we got one
  if (t.webm) {
    const webmPath = path.replace(/\.[^.]+$/, '') + '.webm';
    const { error: upErr } = await admin.storage.from(BUCKET).upload(webmPath, t.webm, {
      contentType: 'video/webm',
      upsert: true,
      cacheControl: '31536000',
    });
    if (!upErr) {
      result.webmUrl = publicUrlFor(webmPath);
      result.webmBytes = t.webm.length;
      result.transcoded = true;
    } else {
      result.reason = 'webm_upload_failed';
    }
  } else {
    result.reason = t.reason || 'transcode_failed';
  }

  // Upload poster (independent of WebM success)
  if (t.poster) {
    const posterPath = path.replace(/\.[^.]+$/, '') + '-poster.webp';
    const { error: pErr } = await admin.storage.from(BUCKET).upload(posterPath, t.poster, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '31536000',
    });
    if (!pErr) {
      result.posterUrl = publicUrlFor(posterPath);
      result.posterBytes = t.poster.length;
    }
  }

  return NextResponse.json({ success: true, data: result });
}

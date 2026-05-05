import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transcodeImage } from '@/lib/media/transcode';
import { registerMedia } from '@/lib/media/library';
import { createClient as createUserClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
// Image transcoding can take up to a minute on big sources; videos are
// stored as-is here and the WebM transcode runs in a follow-up call to
// /api/upload/transcode (matches the direct-upload flow).
export const maxDuration = 300;

const BUCKET = 'media';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;   // 20 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;  // 200 MB
const FETCH_TIMEOUT_MS = 90_000;

const IMAGE_MIME_RX = /^image\/(jpe?g|png|gif|webp|avif)$/i;
const VIDEO_MIME_RX = /^video\//i;

const IMAGE_EXT_TO_MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
};
const VIDEO_EXT_TO_MIME = {
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  m4v: 'video/x-m4v', mkv: 'video/x-matroska', ogv: 'video/ogg',
};

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function publicBase() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
}

async function uploadToBucket(admin, key, buffer, contentType) {
  const { error } = await admin.storage.from(BUCKET).upload(key, buffer, {
    contentType,
    upsert: false,
    cacheControl: '31536000',
  });
  if (error) throw new Error(`Storage upload failed (${key}): ${error.message}`);
  return `${publicBase()}/${key}`;
}

function isBlockedHostname(hostname) {
  const lower = (hostname || '').toLowerCase();
  if (!lower) return true;
  if (lower === 'localhost' || lower === '0.0.0.0' || lower === '::1') return true;
  if (lower.endsWith('.local') || lower.endsWith('.internal')) return true;
  if (/^127\./.test(lower)) return true;
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(lower)) return true;
  if (lower.startsWith('fe80:') || lower.startsWith('fc00:') || lower.startsWith('fd00:')) return true;
  return false;
}

function safeParseUrl(input) {
  try {
    const u = new URL(input);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (isBlockedHostname(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

function inferKindFromUrl(u) {
  const m = u.pathname.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/);
  const ext = m && m[1];
  if (!ext) return { kind: null, mime: null };
  if (ext in IMAGE_EXT_TO_MIME) return { kind: 'image', mime: IMAGE_EXT_TO_MIME[ext] };
  if (ext in VIDEO_EXT_TO_MIME) return { kind: 'video', mime: VIDEO_EXT_TO_MIME[ext] };
  return { kind: null, mime: null };
}

function classify(contentType) {
  const ct = (contentType || '').split(';')[0].trim();
  if (IMAGE_MIME_RX.test(ct)) return { kind: 'image', mime: ct };
  if (VIDEO_MIME_RX.test(ct)) return { kind: 'video', mime: ct };
  return { kind: null, mime: '' };
}

async function processImage(buffer, uid, originalFilename, uploadedBy) {
  const admin = getAdminClient();
  const t = await transcodeImage(buffer);

  const uploads = [
    uploadToBucket(admin, `${uid}.avif`, t.original.avif, 'image/avif')
      .then((src) => ({ key: 'origAvif', src })),
    uploadToBucket(admin, `${uid}.webp`, t.original.webp, 'image/webp')
      .then((src) => ({ key: 'origWebp', src })),
  ];
  for (const [w, v] of Object.entries(t.responsive)) {
    uploads.push(
      uploadToBucket(admin, `${uid}-${w}.avif`, v.avif, 'image/avif')
        .then((src) => ({ key: `r${w}Avif`, src })),
      uploadToBucket(admin, `${uid}-${w}.webp`, v.webp, 'image/webp')
        .then((src) => ({ key: `r${w}Webp`, src })),
    );
  }
  const settled = await Promise.all(uploads);
  const urls = Object.fromEntries(settled.map(({ key, src }) => [key, src]));

  const responsive = {};
  const bytes = {
    original: t.originalBytes,
    avif: t.original.avifBytes,
    webp: t.original.webpBytes,
  };
  for (const [w, v] of Object.entries(t.responsive)) {
    responsive[w] = [
      { src: urls[`r${w}Avif`], type: 'image/avif' },
      { src: urls[`r${w}Webp`], type: 'image/webp' },
    ];
    bytes[`avif${w}`] = v.avifBytes;
    bytes[`webp${w}`] = v.webpBytes;
  }

  const result = {
    type: 'image',
    width: t.width,
    height: t.height,
    sources: [
      { src: urls.origAvif, type: 'image/avif' },
      { src: urls.origWebp, type: 'image/webp' },
    ],
    responsive,
    bytes,
  };

  await registerMedia({
    filename: `${uid}.webp`,
    originalFilename,
    storagePath: `${uid}.webp`,
    fileUrl: urls.origWebp,
    fileType: 'image/webp',
    mediaKind: 'image',
    fileSize: t.original.webpBytes,
    width: t.width,
    height: t.height,
    source: 'url',
    variants: {
      sources: result.sources,
      responsive,
      bytes,
      avifPath: `${uid}.avif`,
      webpPath: `${uid}.webp`,
      ...Object.fromEntries(Object.entries(t.responsive).flatMap(([w]) => [
        [`avif${w}Path`, `${uid}-${w}.avif`],
        [`webp${w}Path`, `${uid}-${w}.webp`],
      ])),
    },
    uploadedBy,
  });

  return result;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!url) {
      return NextResponse.json({ success: false, error: 'Missing url.' }, { status: 400 });
    }
    const parsed = safeParseUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'Only public http(s) URLs are allowed.' },
        { status: 400 }
      );
    }

    // Some hosts block HEAD. Try it for early type/size validation, but
    // don't fail the whole request if HEAD returns non-2xx.
    let headType = '';
    let headLen = 0;
    try {
      const head = await fetch(parsed.href, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (head.ok) {
        headType = head.headers.get('content-type') || '';
        headLen = Number(head.headers.get('content-length') || 0);
      }
    } catch { /* HEAD blocked — let GET decide */ }

    let { kind, mime } = classify(headType);
    if (!kind) {
      const inferred = inferKindFromUrl(parsed);
      kind = inferred.kind;
      mime = inferred.mime || '';
    }
    if (kind && headLen) {
      const cap = kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (headLen > cap) {
        return NextResponse.json(
          { success: false, error: kind === 'video' ? 'Video at URL exceeds 200 MB limit.' : 'Image at URL exceeds 20 MB limit.' },
          { status: 413 }
        );
      }
    }

    // GET the body
    const dl = await fetch(parsed.href, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!dl.ok) {
      return NextResponse.json(
        { success: false, error: `Source URL returned HTTP ${dl.status}.` },
        { status: 502 }
      );
    }

    // Re-classify with the GET response, in case HEAD was wrong/blocked.
    const getType = dl.headers.get('content-type') || headType;
    const c2 = classify(getType);
    if (c2.kind) { kind = c2.kind; mime = c2.mime; }
    if (!kind) {
      return NextResponse.json(
        { success: false, error: 'Could not detect an image or video at that URL.' },
        { status: 415 }
      );
    }

    const arr = await dl.arrayBuffer();
    const cap = kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (arr.byteLength > cap) {
      return NextResponse.json(
        { success: false, error: kind === 'video' ? 'Video at URL exceeds 200 MB limit.' : 'Image at URL exceeds 20 MB limit.' },
        { status: 413 }
      );
    }
    const buffer = Buffer.from(arr);

    // Best-effort capture of who pulled this URL for media_library
    let uploadedBy = null;
    try {
      const userClient = await createUserClient();
      const { data: { user } } = await userClient.auth.getUser();
      uploadedBy = user?.id || null;
    } catch { /* ok */ }

    const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const filenameFromUrl = (parsed.pathname.split('/').pop() || `${uid}.bin`).slice(0, 200);

    if (kind === 'image') {
      const result = await processImage(buffer, uid, filenameFromUrl, uploadedBy);
      return NextResponse.json({ success: true, result });
    }

    // Video: store the original now and let the client kick the WebM
    // transcode in the background via /api/upload/transcode (same pattern
    // as direct-upload). This avoids long-running transcode in this route.
    const admin = getAdminClient();
    const ext = (mime.split('/')[1] || 'mp4').replace(/[^a-z0-9]/g, '') || 'mp4';
    const path = `videos/${uid}.${ext}`;
    const publicUrl = await uploadToBucket(admin, path, buffer, mime || 'video/mp4');

    try {
      await registerMedia({
        filename: `${uid}.${ext}`,
        originalFilename: filenameFromUrl,
        storagePath: path,
        fileUrl: publicUrl,
        fileType: mime || 'video/mp4',
        mediaKind: 'video',
        fileSize: buffer.length,
        source: 'url',
        variants: { sources: [{ src: publicUrl, type: mime || 'video/mp4' }] },
        uploadedBy,
      });
    } catch { /* best-effort */ }

    return NextResponse.json({
      success: true,
      result: {
        type: 'video',
        path,
        sources: [{ src: publicUrl, type: mime || 'video/mp4' }],
        poster: null,
        transcoded: false,
        transcodeSkipReason: null,
        bytes: { original: buffer.length, webm: 0, poster: 0 },
      },
    });
  } catch (err) {
    console.error('[/api/upload/from-url] failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error fetching URL' },
      { status: 500 }
    );
  }
}

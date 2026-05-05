import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transcodeImage, transcodeVideo } from '@/lib/media/transcode';
import { registerMedia } from '@/lib/media/library';
import { createClient as createUserClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
// 5 minutes — needed for VP9 video transcoding. Requires Vercel Pro plan.
// On Hobby plan this caps at 60s and very large videos will time out.
export const maxDuration = 300;

const BUCKET = 'media';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;  // 20 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function baseUrl() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
}

async function uploadToBucket(admin, key, buffer, contentType) {
  const { error } = await admin.storage.from(BUCKET).upload(key, buffer, {
    contentType,
    upsert: false,
    cacheControl: '31536000',  // 1y immutable — keys are unique per upload
  });
  if (error) throw new Error(`Storage upload failed (${key}): ${error.message}`);
  return `${baseUrl()}/${key}`;
}

async function processImage(buffer, uid, originalFilename, uploadedBy) {
  const admin = getAdminClient();
  const t = await transcodeImage(buffer);

  // Upload original-resolution pair
  const uploads = [
    uploadToBucket(admin, `${uid}.avif`, t.original.avif, 'image/avif')
      .then((src) => ({ key: 'origAvif', src })),
    uploadToBucket(admin, `${uid}.webp`, t.original.webp, 'image/webp')
      .then((src) => ({ key: 'origWebp', src })),
  ];

  // Upload responsive variants (one cap each pair)
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

  // Build the responsive map for srcset-aware consumers.
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

  // Register in media_library — never fail upload on bookkeeping failure
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
    source: 'upload',
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

async function processVideo(buffer, uid, originalMime, originalFilename, uploadedBy) {
  const admin = getAdminClient();
  const t = await transcodeVideo(buffer, originalMime);

  const sources = [];
  let posterUrl = null;
  let webmUrl = null;
  let posterPath = null;
  let webmPath = null;

  // 1. Upload original (always — Safari fallback / older codecs / edit history)
  const origExt = (originalMime.split('/')[1] || 'mp4').replace(/[^a-z0-9]/g, '');
  const originalPath = `videos/${uid}.${origExt}`;
  const originalUrl = await uploadToBucket(admin, originalPath, buffer, originalMime);

  // 2. Upload WebM if produced
  if (t.webm) {
    webmPath = `videos/${uid}.webm`;
    webmUrl = await uploadToBucket(admin, webmPath, t.webm, 'video/webm');
    sources.push({ src: webmUrl, type: 'video/webm' });
  }
  sources.push({ src: originalUrl, type: originalMime });

  // 3. Upload poster
  if (t.poster) {
    posterPath = `videos/${uid}-poster.webp`;
    posterUrl = await uploadToBucket(admin, posterPath, t.poster, 'image/webp');
  }

  const result = {
    type: 'video',
    sources,
    poster: posterUrl,
    bytes: { original: t.originalBytes, webm: t.webmBytes, poster: t.posterBytes },
    transcoded: t.transcoded,
    transcodeSkipReason: t.reason,
  };

  // Register in media_library
  await registerMedia({
    filename: `${uid}.${origExt}`,
    originalFilename,
    storagePath: originalPath,
    fileUrl: webmUrl || originalUrl,
    fileType: webmUrl ? 'video/webm' : originalMime,
    mediaKind: 'video',
    fileSize: webmUrl ? t.webmBytes : t.originalBytes,
    source: 'upload',
    variants: { sources, poster: posterUrl, originalPath, webmPath, posterPath },
    uploadedBy,
  });

  return result;
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      return NextResponse.json({ success: false, error: 'Unsupported file type' }, { status: 400 });
    }

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ success: false, error: 'Video exceeds 200 MB limit' }, { status: 413 });
    }
    if (isImage && file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ success: false, error: 'Image exceeds 20 MB limit' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Best-effort capture of who uploaded this for media_library
    let uploadedBy = null;
    try {
      const userClient = await createUserClient();
      const { data: { user } } = await userClient.auth.getUser();
      uploadedBy = user?.id || null;
    } catch { /* anonymous upload still allowed */ }

    const result = isImage
      ? await processImage(buffer, uid, file.name || `${uid}.bin`, uploadedBy)
      : await processVideo(buffer, uid, file.type || 'video/mp4', file.name || `${uid}.bin`, uploadedBy);

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('[/api/upload] failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error during upload' },
      { status: 500 }
    );
  }
}

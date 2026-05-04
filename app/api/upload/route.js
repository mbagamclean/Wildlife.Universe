import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transcodeImage, transcodeVideo } from '@/lib/media/transcode';

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

async function processImage(buffer, uid) {
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
  // Each width entry has the AVIF+WebP source pair for that resolution.
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

  return {
    type: 'image',
    width: t.width,
    height: t.height,
    // `sources` keeps original resolution — backward compatible with every
    // existing consumer (PostEditor cover, HeroEditor, MediaUpload preview).
    sources: [
      { src: urls.origAvif, type: 'image/avif' },
      { src: urls.origWebp, type: 'image/webp' },
    ],
    // `responsive` is opt-in for code that wants srcset (HomePage feed,
    // PostCard, search results). Width keys are strings: '1600', etc.
    responsive,
    bytes,
  };
}

async function processVideo(buffer, uid, originalMime) {
  const admin = getAdminClient();
  const t = await transcodeVideo(buffer, originalMime);

  const sources = [];
  let posterUrl = null;

  // 1. Upload original (always — Safari fallback / older codecs / edit history)
  const origExt = (originalMime.split('/')[1] || 'mp4').replace(/[^a-z0-9]/g, '');
  const originalUrl = await uploadToBucket(
    admin,
    `videos/${uid}.${origExt}`,
    buffer,
    originalMime
  );

  // 2. Upload WebM (browser preference if present)
  if (t.webm) {
    const webmUrl = await uploadToBucket(
      admin,
      `videos/${uid}.webm`,
      t.webm,
      'video/webm'
    );
    // Most-compatible source first per <video> rules — but the BROWSER picks
    // the first it can play. WebM-supporting browsers (all modern) will use it.
    sources.push({ src: webmUrl, type: 'video/webm' });
  }

  sources.push({ src: originalUrl, type: originalMime });

  // 3. Upload poster
  if (t.poster) {
    posterUrl = await uploadToBucket(
      admin,
      `videos/${uid}-poster.webp`,
      t.poster,
      'image/webp'
    );
  }

  return {
    type: 'video',
    sources,
    poster: posterUrl,
    bytes: {
      original: t.originalBytes,
      webm: t.webmBytes,
      poster: t.posterBytes,
    },
    transcoded: t.transcoded,
    transcodeSkipReason: t.reason,  // 'too_large' | 'transcode_failed' | null
  };
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

    const result = isImage
      ? await processImage(buffer, uid)
      : await processVideo(buffer, uid, file.type || 'video/mp4');

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('[/api/upload] failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error during upload' },
      { status: 500 }
    );
  }
}

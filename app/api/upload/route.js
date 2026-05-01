import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const BUCKET = 'media';
const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

async function processImage(buffer, name) {
  const [avifBuf, webpBuf] = await Promise.all([
    sharp(buffer).avif({ quality: 75, effort: 4 }).toBuffer(),
    sharp(buffer).webp({ quality: 80, effort: 4 }).toBuffer(),
  ]);

  const [r1, r2] = await Promise.all([
    adminClient.storage.from(BUCKET).upload(`${name}.avif`, avifBuf, { contentType: 'image/avif', upsert: false }),
    adminClient.storage.from(BUCKET).upload(`${name}.webp`, webpBuf, { contentType: 'image/webp', upsert: false }),
  ]);

  if (r1.error) throw new Error(r1.error.message);
  if (r2.error) throw new Error(r2.error.message);

  return {
    type: 'image',
    sources: [
      { src: `${baseUrl}/${name}.avif`, type: 'image/avif' },
      { src: `${baseUrl}/${name}.webp`, type: 'image/webp' },
    ],
  };
}

async function processVideo(buffer, name, mimeType) {
  const { error } = await adminClient.storage.from(BUCKET).upload(name, buffer, { contentType: mimeType, upsert: false });
  if (error) throw new Error(error.message);

  return {
    type: 'video',
    sources: [{ src: `${baseUrl}/${name}`, type: mimeType }],
  };
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });

    const sizeMB = file.size / (1024 * 1024);
    if (isVideo && sizeMB > 200) return NextResponse.json({ error: 'Video exceeds 200MB limit' }, { status: 400 });
    if (isImage && sizeMB > 20)  return NextResponse.json({ error: 'Image exceeds 20MB limit' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = isVideo ? `.${file.type.split('/')[1] || 'mp4'}` : '';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;

    const result = isImage
      ? await processImage(buffer, `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`)
      : await processVideo(buffer, uniqueName, file.type);

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message || 'Server error during upload' }, { status: 500 });
  }
}

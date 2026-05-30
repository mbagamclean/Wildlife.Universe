/**
 * /api/admin/authors/[slug]/photo — author headshot upload.
 *
 * Accepts a multipart form-data POST with one `file` field (image).
 * Uploads to the `media` storage bucket under a slug-prefixed key,
 * writes the resulting URL into the author_overrides.photo_url field,
 * and returns the public URL so the admin form can preview it.
 *
 * Deliberately simpler than /api/upload — author photos are single
 * portraits, not multi-variant responsive media objects, so we skip
 * the AVIF / responsive-srcset transcoding pipeline. WebP at one
 * size is enough for the byline avatar.
 *
 * Auth: staff-role only.
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { getAuthorBySlug } from '@/lib/seo/authors';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'media';
const PREFIX = 'authors';
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const TARGET_SIZE = 512; // square 512x512 for byline + JSON-LD
const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function checkStaff() {
  const ssr = await createSSRClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return { ok: false, status: 401, body: { error: 'Unauthorized' } };
  const { data: profile } = await ssr.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return { ok: false, status: 403, body: { error: 'Forbidden' } };
  }
  return { ok: true };
}

export async function POST(req, { params }) {
  const { slug } = await params;
  const auth = await checkStaff();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const base = getAuthorBySlug(slug);
  if (!base || base.slug !== slug) {
    return NextResponse.json({ error: 'unknown-author' }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'missing-file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `file-too-large (${file.size} > ${MAX_BYTES})` }, { status: 400 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // Crop to centered square, downscale to 512×512, encode as WebP.
  // The byline avatar is small; 512 covers retina up to roughly 170 CSS px.
  let webp;
  try {
    webp = await sharp(inputBuffer)
      .rotate() // honour EXIF orientation
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'cover', position: 'attention' })
      .webp({ quality: 88 })
      .toBuffer();
  } catch (err) {
    return NextResponse.json({ error: `image-decode-failed: ${err.message}` }, { status: 400 });
  }

  const key = `${PREFIX}/${slug}-${randomUUID().slice(0, 8)}.webp`;
  const sb = adminClient();
  const { error: upErr } = await sb.storage.from(BUCKET).upload(key, webp, {
    contentType: 'image/webp',
    upsert: false,
    cacheControl: '31536000',
  });
  if (upErr) {
    return NextResponse.json({ error: `upload-failed: ${upErr.message}` }, { status: 500 });
  }

  const photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;

  // Write photo_url into the override row. Tolerate the table being
  // absent — return the URL so the admin can save it manually later.
  try {
    const { error: dbErr } = await sb
      .from('author_overrides')
      .upsert({ slug, photo_url: photoUrl, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
    if (dbErr) {
      if (/relation .* does not exist|schema cache/i.test(dbErr.message)) {
        return NextResponse.json({
          ok: true,
          photoUrl,
          warning: 'Photo uploaded but not yet persisted — run supabase/migrations/021_author_overrides.sql in the Supabase SQL Editor, then save the form again to write the URL into the override row.',
        });
      }
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({
      ok: true,
      photoUrl,
      warning: `Photo uploaded; DB persistence skipped (${err.message}).`,
    });
  }

  try {
    revalidatePath('/', 'layout');
    revalidatePath('/author');
    revalidatePath(`/author/${slug}`);
  } catch {}

  return NextResponse.json({ ok: true, photoUrl });
}

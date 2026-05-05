/**
 * Server-side helpers for the unified media library.
 *
 * Every upload path (image upload, video direct upload, AI image
 * generation, TTS, voiceover, transcode) calls registerMedia() to
 * insert a row into the media_library table so the admin Media page
 * can list/preview/delete the full inventory.
 *
 * The transcode pipeline calls updateMediaVariants() when it produces
 * derived formats (WebM, poster) so the same row reflects the upgrade
 * — no duplicate rows per upload event.
 */
import { createClient as createServiceClient } from '@supabase/supabase-js';

const TABLE = 'media_library';
const BUCKET = 'media';

function admin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export function publicUrl(path) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * Insert one media row. Returns the inserted row, or null on graceful
 * failure (e.g. table doesn't exist because the migration isn't run yet
 * — never want to break an upload because of media-library bookkeeping).
 *
 * Required: filename, fileUrl, fileType, mediaKind ('image'|'video'|'audio')
 */
export async function registerMedia({
  filename,
  originalFilename,
  storagePath,
  fileUrl,
  fileType,
  mediaKind = 'image',
  fileSize = 0,
  width = null,
  height = null,
  durationSec = null,
  altText = null,
  caption = null,
  source = 'upload',
  variants = null,
  uploadedBy = null,
} = {}) {
  if (!filename || !fileUrl || !fileType) return null;

  try {
    const { data, error } = await admin()
      .from(TABLE)
      .insert({
        filename,
        original_filename: originalFilename || filename,
        storage_path: storagePath || null,
        file_url: fileUrl,
        file_type: fileType,
        media_kind: mediaKind,
        file_size: Math.max(0, parseInt(fileSize, 10) || 0),
        width: width ? parseInt(width, 10) : null,
        height: height ? parseInt(height, 10) : null,
        duration_sec: durationSec ? parseInt(durationSec, 10) : null,
        alt_text: altText,
        caption,
        source,
        variants: variants || null,
        uploaded_by: uploadedBy || null,
      })
      .select()
      .single();

    if (error) {
      // Table-missing or RLS-blocked — never fail the upload over this
      console.warn('[media_library] register skipped:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('[media_library] register failed:', e?.message);
    return null;
  }
}

/**
 * Update an existing row (matched by storage_path) — used when the
 * transcode pipeline produces a WebM + poster after the original was
 * already registered. Patches `file_url`, `variants` and adds
 * `transcoded` to the source.
 */
export async function updateMediaVariants(storagePath, { fileUrl, variants, mediaKind, source } = {}) {
  if (!storagePath) return null;
  try {
    const patch = {};
    if (fileUrl !== undefined) patch.file_url = fileUrl;
    if (variants !== undefined) patch.variants = variants;
    if (mediaKind !== undefined) patch.media_kind = mediaKind;
    if (source !== undefined) patch.source = source;
    if (Object.keys(patch).length === 0) return null;

    const { data, error } = await admin()
      .from(TABLE)
      .update(patch)
      .eq('storage_path', storagePath)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[media_library] update skipped:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('[media_library] update failed:', e?.message);
    return null;
  }
}

export const MEDIA_BUCKET = BUCKET;
export const MEDIA_TABLE = TABLE;

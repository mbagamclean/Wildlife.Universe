/**
 * Client-side upload helpers.
 *
 * - Images go through /api/upload (Sharp transcodes to AVIF + WebP +
 *   1600w responsive variants on the server). They're small enough to
 *   fit in Vercel's serverless body limit.
 *
 * - Videos go DIRECT to Supabase Storage via a signed URL. This bypasses
 *   Vercel's 4.5 MB serverless body limit which would otherwise reject
 *   any reasonable video with an HTML "Request Entity Too Large" page —
 *   the source of the "Unexpected token 'R'" JSON.parse error.
 *
 * Both helpers return the same `{ type, sources, ... }` shape so every
 * consumer (MediaUpload, HomepageVideos admin, etc.) works uniformly.
 */

export async function uploadImage(file, { onProgress } = {}) {
  if (onProgress) onProgress(0);
  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Upload failed (${res.status})`);
  }
  if (onProgress) onProgress(100);
  return json.result;
}

export async function uploadVideoDirect(file, { onProgress } = {}) {
  // 1. Get a signed upload URL from our server (auth-gated, validates type/size)
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'video/mp4',
      size: file.size,
    }),
  });
  const sign = await signRes.json().catch(() => ({}));
  if (!signRes.ok || !sign.success) {
    throw new Error(sign.error || `Could not authorize upload (${signRes.status})`);
  }

  // 2. PUT the file directly to Supabase Storage with progress tracking
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', sign.signedUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('x-upsert', 'false');

    if (xhr.upload && onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed: HTTP ${xhr.status} ${xhr.responseText?.slice(0, 200) || ''}`));
    };
    xhr.onerror = () => reject(new Error('Storage upload failed: network error'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));

    xhr.send(file);
  });

  // 3. Return the same shape /api/upload would have returned for video
  return {
    type: 'video',
    path: sign.path,
    sources: [{ src: sign.publicUrl, type: file.type || 'video/mp4' }],
    poster: null,            // direct-uploaded videos skip server-side poster generation
    transcoded: false,       // direct uploads aren't transcoded — original format only
    transcodeSkipReason: 'direct_upload',
    bytes: { original: file.size, webm: 0, poster: 0 },
  };
}

/**
 * Auto-routes by file MIME: image → server transcode, video → direct upload.
 * Pass `onProgress(pct)` to drive a UI bar.
 */
export async function uploadMedia(file, opts = {}) {
  if (file.type?.startsWith('video/')) return uploadVideoDirect(file, opts);
  return uploadImage(file, opts);
}

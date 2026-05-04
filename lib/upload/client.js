/**
 * Client-side upload helpers.
 *
 * Architecture:
 *   - Images go through /api/upload (Sharp transcodes server-side to
 *     AVIF + WebP + 1600w responsive variants). They fit in Vercel's
 *     4.5MB serverless body limit.
 *
 *   - Videos go DIRECT to Supabase Storage via a signed URL — Vercel's
 *     body limit makes server-receive impossible past ~4MB. After the
 *     direct upload completes, the client kicks off a background
 *     /api/upload/transcode call that downloads the file server-side
 *     (no body limit on that direction), runs ffmpeg → VP9/Opus WebM
 *     and uploads the result back to the bucket alongside the original.
 *
 * Two-phase return shape (videos only):
 *   uploadVideoDirect() returns AS SOON AS the upload completes, with
 *   original-only sources. The form / post can be saved immediately.
 *   It also exposes a `transcodePromise` that resolves later with the
 *   enriched result — same shape but with WebM source + poster prepended.
 *   The UI can `await` it (with its own timeout) and call onChange a
 *   second time to upgrade the saved record.
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

/**
 * Returns:
 *   {
 *     ...mediaResult (original-only sources),
 *     transcodePromise: Promise<mediaResult | null>
 *       — resolves with the WebM-enriched result, or null on failure
 *   }
 */
export async function uploadVideoDirect(file, { onProgress, signal } = {}) {
  // 1. Get a signed upload URL from our server (auth-gated)
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'video/mp4',
      size: file.size,
    }),
    signal,
  });
  const sign = await signRes.json().catch(() => ({}));
  if (!signRes.ok || !sign.success) {
    throw new Error(sign.error || `Could not authorize upload (${signRes.status})`);
  }

  // 2. PUT direct to Supabase Storage with progress events
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', sign.signedUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('x-upsert', 'false');

    if (xhr.upload && onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    if (signal) {
      const abort = () => xhr.abort();
      signal.addEventListener('abort', abort, { once: true });
      xhr.onloadend = () => signal.removeEventListener('abort', abort);
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed: HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Storage upload failed: network error'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));

    xhr.send(file);
  });

  // 3. Build the immediate result with original-only sources
  const originalSource = { src: sign.publicUrl, type: file.type || 'video/mp4' };
  const baseResult = {
    type: 'video',
    path: sign.path,
    sources: [originalSource],
    poster: null,
    transcoded: false,
    transcodeSkipReason: null,
    bytes: { original: file.size, webm: 0, poster: 0 },
  };

  // 4. Fire off the background transcode. Caller can await this (or not).
  //    Resolves with the upgraded result, or null on failure / abort.
  const transcodePromise = (async () => {
    try {
      const tRes = await fetch('/api/upload/transcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: sign.path }),
        signal,
      });
      const tJson = await tRes.json().catch(() => ({}));
      if (!tJson.success || !tJson.data) return null;

      const data = tJson.data;
      const sources = [];
      if (data.webmUrl) sources.push({ src: data.webmUrl, type: 'video/webm' });
      sources.push(originalSource);

      return {
        ...baseResult,
        sources,
        poster: data.posterUrl || null,
        transcoded: !!data.transcoded,
        transcodeSkipReason: data.reason || null,
        bytes: {
          original: data.originalBytes || file.size,
          webm: data.webmBytes || 0,
          poster: data.posterBytes || 0,
        },
      };
    } catch {
      return null; // network failure, abort, etc. — caller keeps original
    }
  })();

  // Don't unhandled-reject if the caller never awaits
  transcodePromise.catch(() => {});

  return { ...baseResult, transcodePromise };
}

/**
 * Auto-routes by MIME. For VIDEOS the result includes a `transcodePromise`
 * the caller may optionally await to upgrade the form value with WebM +
 * poster once server-side transcoding finishes. Images don't have one.
 */
export async function uploadMedia(file, opts = {}) {
  if (file.type?.startsWith('video/')) return uploadVideoDirect(file, opts);
  return uploadImage(file, opts);
}

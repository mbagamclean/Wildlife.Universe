'use client';

import { useRef, useState, useEffect } from 'react';
import { Upload, X, Link as LinkIcon } from 'lucide-react';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { uploadMedia, uploadFromUrl } from '@/lib/upload/client';
import { resolveImageUrl } from '@/lib/media/pickUrl';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

function fmtSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaUpload({ value, onChange, label = 'Cover media', accept = 'image/*,video/*' }) {
  const ref = useRef(null);
  const abortRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [savings, setSavings] = useState(null);
  const [transcoding, setTranscoding] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState('');

  // Cancel any in-flight upload/transcode if this component unmounts
  useEffect(() => () => abortRef.current?.abort(), []);

  const reportSavings = (r, originalBytes) => {
    const orig = r?.bytes?.original || originalBytes || 0;
    const smallest = r?.type === 'image'
      ? Math.min(r.bytes?.avif || Infinity, r.bytes?.webp || Infinity)
      : (r?.bytes?.webm || orig);
    if (orig && smallest && smallest < orig) {
      const pct = Math.round(((orig - smallest) / orig) * 100);
      setSavings({ orig, smallest, pct, transcoded: r?.type === 'video' ? r.transcoded : true, reason: r?.transcodeSkipReason || null });
    } else if (r?.type === 'video' && r?.transcoded === false) {
      setSavings({ orig, smallest: orig, pct: 0, transcoded: false, reason: r.transcodeSkipReason });
    }
  };

  const handleUrl = async () => {
    const url = urlValue.trim();
    if (!url) return;
    setError('');
    setProgressMsg('');
    setSavings(null);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setBusy(true);
    setTranscoding(false);
    setProgressMsg('Fetching and optimizing media from URL…');
    try {
      const result = await uploadFromUrl(url, { signal: abortRef.current.signal });
      onChange(result);
      reportSavings(result);
      setUrlMode(false);
      setUrlValue('');

      if (result?.transcodePromise) {
        setBusy(false);
        setTranscoding(true);
        setProgressMsg('Transcoding to WebM in background — you can save now…');
        const upgraded = await result.transcodePromise;
        if (upgraded) {
          onChange(upgraded);
          reportSavings(upgraded);
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setError(e.message || 'Could not fetch media from URL.');
    } finally {
      setBusy(false);
      setTranscoding(false);
      setProgressMsg('');
      setTimeout(() => setSavings(null), 8000);
    }
  };

  const handle = async (file) => {
    setError('');
    setProgressMsg('');
    setSavings(null);
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setError('Video too large (max 200 MB).');
      return;
    }
    if (!isVideo && file.size > MAX_IMAGE_BYTES) {
      setError('Image too large (max 20 MB).');
      return;
    }

    // Cancel anything in flight from a previous file pick
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setBusy(true);
    setTranscoding(false);
    setProgressMsg(isVideo ? 'Uploading video to storage…' : 'Optimizing image to AVIF + WebP…');

    try {
      const result = await uploadMedia(file, {
        signal: abortRef.current.signal,
        onProgress: (pct) => {
          if (isVideo) setProgressMsg(`Uploading video to storage… ${pct}%`);
        },
      });

      // 1st phase: upload finished. Form gets the original-only sources
      // immediately so the user can save right now if they want.
      onChange(result);
      reportSavings(result, file.size);

      // 2nd phase (videos only): wait for the background transcode and
      // re-emit onChange with the WebM-enriched sources when it lands.
      if (result?.transcodePromise) {
        setBusy(false);
        setTranscoding(true);
        setProgressMsg('Transcoding to WebM in background — you can save now…');
        const upgraded = await result.transcodePromise;
        if (upgraded) {
          onChange(upgraded);
          reportSavings(upgraded, file.size);
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setError(e.message || 'Could not process file.');
    } finally {
      setBusy(false);
      setTranscoding(false);
      setProgressMsg('');
      setTimeout(() => setSavings(null), 8000);
    }
  };

  const renderPreview = () => {
    if (!value) return null;

    // Video upload-result object — render the player so the admin can
    // verify the clip plays. The player handles its own poster.
    if (value && typeof value === 'object' && value.type === 'video') {
      return <VideoPlayer src={value} rounded={false} showBadge={false} muted autoplay />;
    }

    // Everything else (string URL, image upload-result object, legacy
    // shapes) gets routed through the shared resolver so we never end
    // up with <img src=""> producing the broken-image icon.
    const url = resolveImageUrl(value);
    if (!url) return null;

    if (value && typeof value === 'object' && Array.isArray(value.sources)) {
      // Multiple variants available (AVIF + WebP) — let the browser pick.
      const sources = value.sources;
      return (
        <picture>
          {sources.slice(0, -1).map((s, i) =>
            s && typeof s.src === 'string' && s.src
              ? <source key={i} srcSet={s.src} type={s.type} />
              : null
          )}
          <img
            src={url}
            alt=""
            className="h-40 w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </picture>
      );
    }

    return (
      <img
        src={url}
        alt=""
        className="h-40 w-full object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  };

  // Render the preview EAGERLY so we can detect the case where `value` is
  // truthy but the resolver can't produce a usable URL (legacy/bad data).
  // In that case we fall through to the dropzone so the admin can always
  // re-upload — never an invisible empty card with just a stray X button.
  const previewEl = renderPreview();

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[var(--color-fg)]">{label}</label>
      {previewEl ? (
        <div className="relative overflow-hidden rounded-xl border border-[var(--glass-border)]">
          {previewEl}
          <button
            type="button"
            onClick={() => onChange('')}
            className="glass absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="glass flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--glass-border)] text-sm text-[var(--color-fg-soft)] transition-colors hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]"
            disabled={busy}
          >
            <Upload className="h-5 w-5" />
            {busy ? (progressMsg || 'Processing…') : 'Click to upload'}
            <span className="text-xs">Image (max 20 MB) or Video (max 200 MB) — optional</span>
          </button>
          {!urlMode ? (
            <button
              type="button"
              onClick={() => setUrlMode(true)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-semibold text-[var(--color-primary)] hover:underline disabled:opacity-50"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Or attach a URL — we'll re-encode it for the web
            </button>
          ) : (
            <div className="glass flex flex-col gap-2 rounded-xl p-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-soft)]">
                Media URL
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="url"
                  inputMode="url"
                  autoFocus
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUrl(); } }}
                  placeholder="https://example.com/photo.jpg or video.mp4"
                  className="min-w-[16rem] flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={handleUrl}
                  disabled={busy || !urlValue.trim()}
                  className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[var(--color-primary)]/30 hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
                >
                  {busy ? (progressMsg || 'Fetching…') : 'Attach'}
                </button>
                <button
                  type="button"
                  onClick={() => { setUrlMode(false); setUrlValue(''); setError(''); }}
                  disabled={busy}
                  className="rounded-full border border-[var(--glass-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-primary)]/5 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[11px] text-[var(--color-fg-soft)]">
                The file at this URL is downloaded and re-encoded to AVIF + WebP (images) or VP9 WebM (videos) so it loads fast on the site.
              </p>
            </div>
          )}
        </div>
      )}
      {transcoding && !busy && (
        <p className="flex items-center gap-2 text-xs text-amber-600">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          {progressMsg || 'Transcoding to WebM in background…'}
        </p>
      )}
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {savings && !error && (
        <p className="text-xs text-emerald-600">
          {savings.transcoded
            ? `Compressed ${fmtSize(savings.orig)} → ${fmtSize(savings.smallest)} (saved ${savings.pct}%).`
            : savings.reason === 'too_large'
              ? `Stored at original size (${fmtSize(savings.orig)}). Files >120 MB skip transcoding to avoid timeouts.`
              : savings.reason === 'direct_upload'
                ? `Uploaded ${fmtSize(savings.orig)} directly to storage.`
                : `Stored at original size (${fmtSize(savings.orig)}). Transcoding fell back to the source.`}
        </p>
      )}
    </div>
  );
}

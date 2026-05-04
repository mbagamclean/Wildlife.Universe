'use client';

import { useRef, useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { uploadMedia } from '@/lib/upload/client';

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

  // Cancel any in-flight upload/transcode if this component unmounts
  useEffect(() => () => abortRef.current?.abort(), []);

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

      const reportSavings = (r) => {
        const orig = r?.bytes?.original || file.size;
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

      // 1st phase: upload finished. Form gets the original-only sources
      // immediately so the user can save right now if they want.
      onChange(result);
      reportSavings(result);

      // 2nd phase (videos only): wait for the background transcode and
      // re-emit onChange with the WebM-enriched sources when it lands.
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

    // Legacy support (Base64 string or simple URL string)
    if (typeof value === 'string') {
      return <img src={value} alt="" className="h-40 w-full object-cover" />;
    }

    if (value.type === 'video') {
      return <VideoPlayer src={value} rounded={false} showBadge={false} muted autoplay />;
    }

    if (value.type === 'image') {
      const sources = value.sources || [];
      return (
        <picture>
          {sources.slice(0, -1).map((s, i) => (
            <source key={i} srcSet={s.src} type={s.type} />
          ))}
          <img 
            src={sources[Math.max(0, sources.length - 1)]?.src || ''} 
            alt="" 
            className="h-40 w-full object-cover" 
          />
        </picture>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[var(--color-fg)]">{label}</label>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-[var(--glass-border)]">
          {renderPreview()}
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
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="glass flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--glass-border)] text-sm text-[var(--color-fg-soft)] transition-colors hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]"
          disabled={busy}
        >
          <Upload className="h-5 w-5" />
          {busy ? (progressMsg || 'Processing…') : 'Click to upload'}
          <span className="text-xs">Image (max 20 MB) or Video (max 200 MB)</span>
        </button>
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

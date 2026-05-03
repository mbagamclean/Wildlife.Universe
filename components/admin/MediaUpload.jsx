'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { VideoPlayer } from '@/components/ui/VideoPlayer';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

export function MediaUpload({ value, onChange, label = 'Cover media', accept = 'image/*,video/*' }) {
  const ref = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const handle = async (file) => {
    setError('');
    setProgressMsg('');
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

    setBusy(true);
    if (isVideo) {
      setProgressMsg('Uploading & Optimizing Video (This may take a few minutes)...');
    } else {
      setProgressMsg('Optimizing Image...');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // the object: { type: 'image'|'video', sources: [...] }
      onChange(data.result);
    } catch (e) {
      setError(e.message || 'Could not process file.');
    } finally {
      setBusy(false);
      setProgressMsg('');
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
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

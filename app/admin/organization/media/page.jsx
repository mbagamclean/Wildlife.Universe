'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Image as ImageIcon, FileVideo, AudioLines, Loader2, AlertCircle, Trash2,
  Copy, Check, Search, ExternalLink, Sparkles, Mic, Upload, Grid3x3, List,
  RefreshCw, X, Calendar, HardDrive, Layers,
} from 'lucide-react';

const KIND_FILTERS = [
  { id: 'all',   label: 'All' },
  { id: 'image', label: 'Images', icon: ImageIcon, color: '#16a34a' },
  { id: 'video', label: 'Videos', icon: FileVideo, color: '#dc2626' },
  { id: 'audio', label: 'Audio',  icon: AudioLines, color: '#7c3aed' },
];

const SOURCE_BADGE = {
  upload:        { label: 'Uploaded',     color: '#16a34a', icon: Upload },
  transcoded:    { label: 'Transcoded',   color: '#0891b2', icon: Layers },
  'ai-generated':{ label: 'AI Generated', color: '#a855f7', icon: Sparkles },
  tts:           { label: 'TTS',          color: '#7c3aed', icon: Mic },
  voiceover:     { label: 'Voiceover',    color: '#ea580c', icon: Mic },
  external:      { label: 'External',     color: '#64748b', icon: ExternalLink },
  pexels:        { label: 'Pexels',       color: '#05a081', icon: Sparkles },
};

function fmtSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminMediaPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [active, setActive] = useState(null);   // selected item for modal
  const [copied, setCopied] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setTableMissing(false);
    try {
      const res = await fetch(`/api/admin/media${kind !== 'all' ? `?kind=${kind}` : ''}`);
      const json = await res.json();
      if (json.error === 'table_missing') {
        setTableMissing(true); setItems([]);
        return;
      }
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load media');
      setItems(json.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      (it.filename || '').toLowerCase().includes(q)
      || (it.original_filename || '').toLowerCase().includes(q)
      || (it.alt_text || '').toLowerCase().includes(q)
      || (it.caption || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const counts = useMemo(() => ({
    all:   items.length,
    image: items.filter((x) => x.media_kind === 'image').length,
    video: items.filter((x) => x.media_kind === 'video').length,
    audio: items.filter((x) => x.media_kind === 'audio').length,
  }), [items]);

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1600);
    } catch { /* clipboard blocked */ }
  };

  const remove = async (item) => {
    if (!confirm(`Delete "${item.original_filename || item.filename}" permanently? This also removes the file from storage.`)) return;
    setDeleting(item.id);
    try {
      const res = await fetch(`/api/admin/media?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
      setActive((a) => (a?.id === item.id ? null : a));
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
            <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
            ORGANIZATION
          </p>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Media Library</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            Every uploaded image, video, and audio clip from across the CMS — {items.length} item{items.length === 1 ? '' : 's'}.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {tableMissing && (
        <div className="mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(245,158,11,0.08)', color: '#a16207', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Migration not run yet.</strong> Open Supabase → SQL Editor and paste{' '}
            <code style={{ background: 'rgba(245,158,11,0.15)', padding: '1px 6px', borderRadius: 4 }}>
              supabase/migrations/008_media_library.sql
            </code>{' '}
            to create the table.
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Filters + search + view */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {KIND_FILTERS.map((f) => {
            const Icon = f.icon || Layers;
            const isActive = kind === f.id;
            const accent = f.color || '#d4af37';
            return (
              <button
                key={f.id}
                onClick={() => setKind(f.id)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: isActive ? accent : 'transparent',
                  color: isActive ? '#fff' : 'var(--adm-text-muted)',
                  border: `1px solid ${isActive ? accent : 'var(--adm-border)'}`,
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon size={11} />
                  {f.label}
                  <span className="opacity-70">({counts[f.id]})</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 items-center gap-2 sm:min-w-[280px]">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--adm-text-subtle)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by filename, alt text, caption…"
              className="w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none focus:border-[#d4af37]"
              style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
            />
          </div>
          <div className="flex rounded-xl border" style={{ borderColor: 'var(--adm-border)' }}>
            <button onClick={() => setView('grid')} className="p-2"
              style={{ color: view === 'grid' ? '#d4af37' : 'var(--adm-text-subtle)' }} title="Grid">
              <Grid3x3 size={14} />
            </button>
            <button onClick={() => setView('list')} className="p-2"
              style={{ color: view === 'list' ? '#d4af37' : 'var(--adm-text-subtle)' }} title="List">
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {loading && items.length === 0 && !tableMissing && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--adm-text-muted)' }} />
        </div>
      )}

      {!loading && filtered.length === 0 && !tableMissing && (
        <div className="rounded-2xl py-16 text-center" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
          <ImageIcon className="mx-auto mb-3 h-10 w-10 opacity-40" style={{ color: 'var(--adm-text-subtle)' }} />
          <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            {items.length === 0
              ? 'No media uploaded yet. Files appear here automatically as you upload covers, hero media, AI images, or audio.'
              : `No items match "${search}".`}
          </p>
        </div>
      )}

      {/* Grid view */}
      {view === 'grid' && filtered.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {filtered.map((it) => (
            <MediaCard
              key={it.id}
              item={it}
              copied={copied === it.file_url}
              onOpen={() => setActive(it)}
              onCopy={() => copyUrl(it.file_url)}
              onDelete={() => remove(it)}
              deleting={deleting === it.id}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {view === 'list' && filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text-subtle)' }}>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">File</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider hidden md:table-cell">Added</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const badge = SOURCE_BADGE[it.source] || SOURCE_BADGE.upload;
                const BadgeIcon = badge.icon || Upload;
                return (
                  <tr key={it.id} className="border-t" style={{ borderColor: 'var(--adm-border)' }}>
                    <td className="px-4 py-3">
                      <button onClick={() => setActive(it)} className="flex items-center gap-3 text-left">
                        <Thumb item={it} size={48} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>
                            {it.original_filename || it.filename}
                          </p>
                          <p className="truncate text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{it.file_type}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: `${badge.color}1a`, color: badge.color, border: `1px solid ${badge.color}40` }}>
                        <BadgeIcon size={9} /> {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>{fmtSize(it.file_size)}</td>
                    <td className="px-4 py-3 text-[12px] hidden md:table-cell" style={{ color: 'var(--adm-text-muted)' }}>{fmtDate(it.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => copyUrl(it.file_url)} title="Copy URL" className="rounded p-1.5">
                          {copied === it.file_url
                            ? <Check size={14} style={{ color: '#16a34a' }} />
                            : <Copy size={14} style={{ color: 'var(--adm-text-muted)' }} />}
                        </button>
                        <a href={it.file_url} target="_blank" rel="noreferrer" title="Open in new tab" className="rounded p-1.5">
                          <ExternalLink size={14} style={{ color: 'var(--adm-text-muted)' }} />
                        </a>
                        <button onClick={() => remove(it)} disabled={deleting === it.id} title="Delete" className="rounded p-1.5">
                          {deleting === it.id
                            ? <Loader2 size={14} className="animate-spin" style={{ color: '#dc2626' }} />
                            : <Trash2 size={14} style={{ color: '#dc2626' }} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {active && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setActive(null)}>
          <div
            className="my-8 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl"
            style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'var(--adm-border)' }}>
              <h3 className="truncate text-sm font-bold" style={{ color: 'var(--adm-text)' }}>
                {active.original_filename || active.filename}
              </h3>
              <button onClick={() => setActive(null)} className="rounded-lg p-1.5">
                <X size={16} style={{ color: 'var(--adm-text-muted)' }} />
              </button>
            </div>

            <div className="bg-black/80 p-4">
              <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
                {active.media_kind === 'image' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={active.file_url} alt={active.alt_text || ''} className="max-h-[60vh] w-auto rounded-lg" />
                )}
                {active.media_kind === 'video' && (
                  <video controls src={active.file_url} className="max-h-[60vh] w-full rounded-lg" />
                )}
                {active.media_kind === 'audio' && (
                  <audio controls src={active.file_url} className="w-full" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-5 text-xs" style={{ color: 'var(--adm-text-muted)' }}>
              <Field label="Type"><code>{active.file_type}</code></Field>
              <Field label="Size">{fmtSize(active.file_size)}</Field>
              {active.width && active.height && <Field label="Dimensions">{active.width} × {active.height}</Field>}
              {active.duration_sec && <Field label="Duration">{active.duration_sec}s</Field>}
              <Field label="Source">{(SOURCE_BADGE[active.source] || SOURCE_BADGE.upload).label}</Field>
              <Field label="Added">{fmtDate(active.created_at)}</Field>
            </div>

            <div className="border-t px-5 py-3" style={{ borderColor: 'var(--adm-border)' }}>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--adm-text-subtle)' }}>
                Public URL
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg p-2 text-[11px]" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}>
                  {active.file_url}
                </code>
                <button onClick={() => copyUrl(active.file_url)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold"
                  style={{ borderColor: 'var(--adm-border)', color: copied === active.file_url ? '#16a34a' : 'var(--adm-text-muted)' }}>
                  {copied === active.file_url ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
                <a href={active.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold"
                  style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}>
                  <ExternalLink size={12} /> Open
                </a>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: 'var(--adm-border)' }}>
              <button onClick={() => remove(active)} disabled={deleting === active.id}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white"
                style={{ background: '#dc2626', cursor: deleting ? 'wait' : 'pointer' }}>
                {deleting === active.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--adm-text-subtle)' }}>{label}</p>
      <p className="mt-0.5" style={{ color: 'var(--adm-text)' }}>{children}</p>
    </div>
  );
}

function Thumb({ item, size = 48 }) {
  const style = {
    width: size, height: size, borderRadius: 8, overflow: 'hidden',
    background: 'var(--adm-bg)', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  if (item.media_kind === 'image') {
    return (
      <div style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.file_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  if (item.media_kind === 'video') {
    const poster = item.variants?.poster;
    return (
      <div style={style}>
        {poster
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <FileVideo size={20} style={{ color: 'var(--adm-text-subtle)' }} />}
      </div>
    );
  }
  return (
    <div style={style}>
      <AudioLines size={20} style={{ color: 'var(--adm-text-subtle)' }} />
    </div>
  );
}

function MediaCard({ item, copied, onOpen, onCopy, onDelete, deleting }) {
  const badge = SOURCE_BADGE[item.source] || SOURCE_BADGE.upload;
  const BadgeIcon = badge.icon || Upload;
  return (
    <div
      className="group relative overflow-hidden rounded-xl"
      style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}
    >
      <button onClick={onOpen} className="block w-full" style={{ aspectRatio: '4/3' }}>
        <Thumb item={item} size="100%" />
      </button>

      {/* Source badge top-left */}
      <span
        className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
        style={{ background: `${badge.color}dd`, color: '#fff' }}
      >
        <BadgeIcon size={8} /> {badge.label}
      </span>

      {/* Hover actions */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={onCopy} className="pointer-events-auto rounded-lg bg-white/15 p-2 text-white backdrop-blur"
          title="Copy URL">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button onClick={onDelete} disabled={deleting} className="pointer-events-auto rounded-lg bg-red-600/90 p-2 text-white"
          title="Delete">
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>

      <div className="px-3 py-2">
        <p className="truncate text-[11px] font-semibold" style={{ color: 'var(--adm-text)' }}>
          {item.original_filename || item.filename}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--adm-text-subtle)' }}>
          {fmtSize(item.file_size)}
        </p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Video, Plus, Loader2, AlertCircle, Trash2, Pencil, Eye, EyeOff, GripVertical,
  Upload, Check, Save,
} from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';
import { detectVideoProvider, PROVIDER_LABELS, PROVIDER_COLORS } from '@/lib/video/detect';
import { VideoPlayer } from '@/components/ui/VideoPlayer';

const SECTIONS = [
  { id: 'featured',       label: 'Featured (top of homepage)' },
  { id: 'shorts',         label: 'Shorts (vertical)' },
  { id: 'documentaries',  label: 'Documentaries (long-form)' },
];

const EMPTY_FORM = {
  id: null,
  sourceUrl: '',
  sourceType: 'embed',
  provider: null,
  title: '',
  description: '',
  thumbnail: '',
  section: 'featured',
  position: 0,
  active: true,
};

export default function HomepageVideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const dragId = useRef(null);

  const flash = (msg) => { setSaved(msg); setTimeout(() => setSaved(null), 2200); };

  const load = useCallback(async () => {
    setLoading(true); setError(null); setTableMissing(false);
    try {
      const res = await fetch('/api/admin/homepage-videos');
      const json = await res.json();
      if (json.error === 'table_missing') {
        setTableMissing(true);
        setVideos([]);
        return;
      }
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load');
      setVideos(json.videos || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => setForm({ ...EMPTY_FORM });
  const startEdit = (v) => setForm({
    id: v.id,
    sourceUrl: v.source_url || '',
    sourceType: v.source_type || 'embed',
    provider: v.provider || null,
    title: v.title || '',
    description: v.description || '',
    thumbnail: v.thumbnail || '',
    section: v.section || 'featured',
    position: v.position || 0,
    active: v.active !== false,
  });
  const cancelForm = () => { setForm(null); setError(null); };

  const updateForm = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'sourceUrl') {
        next.provider = detectVideoProvider(value);
      }
      return next;
    });
  };

  const submit = async () => {
    if (!form?.sourceUrl?.trim()) {
      setError('Source URL is required.');
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const isEdit = !!form.id;
      const res = await fetch('/api/admin/homepage-videos', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Save failed');
      flash(isEdit ? 'Video updated.' : 'Video added.');
      setForm(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (v) => {
    if (!confirm(`Delete "${v.title || v.source_url}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/homepage-videos?id=${encodeURIComponent(v.id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
      flash('Video removed.');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleActive = async (v) => {
    try {
      const res = await fetch('/api/admin/homepage-videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: v.id, active: !v.active }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Update failed');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  // Drag-to-reorder within a section
  const onDragStart = (id) => () => { dragId.current = id; };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = (sectionItems, overId) => async (e) => {
    e.preventDefault();
    const fromId = dragId.current;
    dragId.current = null;
    if (!fromId || fromId === overId) return;
    const arr = [...sectionItems];
    const fromIdx = arr.findIndex((x) => x.id === fromId);
    const toIdx = arr.findIndex((x) => x.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    // Optimistic local reorder
    const reordered = arr.map((it, i) => ({ ...it, position: i }));
    setVideos((v) => {
      const others = v.filter((x) => x.section !== arr[0].section);
      return [...others, ...reordered];
    });
    // Persist
    try {
      await Promise.all(reordered.map((it) =>
        fetch('/api/admin/homepage-videos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: it.id, position: it.position }),
        })
      ));
    } finally {
      load();
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Upload failed');
      const url = json.result?.sources?.find((s) => s.type === 'video/mp4')?.src
        || json.result?.sources?.[0]?.src;
      if (url) {
        updateForm('sourceUrl', url);
        updateForm('sourceType', 'upload');
        flash('Upload complete. Add a title and save.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const grouped = SECTIONS.map((s) => ({
    ...s,
    items: videos.filter((v) => v.section === s.id),
  }));

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <AIPageHeader
          eyebrow="HOMEPAGE"
          title="Homepage Videos"
          description="Curate videos for the public homepage. Paste a URL (YouTube, TikTok, Instagram, Vimeo, Facebook, X) or upload a file."
          icon={Video}
          accent="#dc2626"
        />
        {!tableMissing && !form && (
          <button
            onClick={startCreate}
            className="mt-1 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
          >
            <Plus size={14} /> Add Video
          </button>
        )}
      </div>

      {tableMissing && (
        <div className="mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(245,158,11,0.08)', color: '#a16207', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Migration not run yet.</strong> Open Supabase → SQL Editor and paste{' '}
            <code style={{ background: 'rgba(245,158,11,0.15)', padding: '1px 6px', borderRadius: 4 }}>
              supabase/migrations/006_homepage_videos.sql
            </code>{' '}
            to create the table.
          </span>
        </div>
      )}

      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm" style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
          <Check size={14} /> {saved}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {form && (
        <div
          className="mb-6 rounded-2xl p-5"
          style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}
        >
          <h2 className="mb-4 text-lg font-bold" style={{ color: 'var(--adm-text)' }}>
            {form.id ? 'Edit video' : 'Add video'}
          </h2>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg"
            onChange={(e) => uploadFile(e.target.files?.[0])}
            style={{ display: 'none' }}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field label="Source URL or upload">
              <div className="flex gap-2">
                <input
                  value={form.sourceUrl}
                  onChange={(e) => updateForm('sourceUrl', e.target.value)}
                  placeholder="https://youtube.com/watch?v=… or paste any video URL"
                  className="select-base flex-1"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold"
                  style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
                  title="Upload video file (max 200 MB)"
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
              {form.provider ? (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold">
                  <span
                    className="rounded-full px-2 py-0.5 text-white"
                    style={{ background: PROVIDER_COLORS[form.provider] }}
                  >
                    {PROVIDER_LABELS[form.provider]}
                  </span>
                </p>
              ) : form.sourceUrl ? (
                <p className="mt-1 text-[11px] italic" style={{ color: 'var(--adm-text-subtle)' }}>
                  Provider not detected — will try as raw embed.
                </p>
              ) : null}
            </Field>

            <Field label="Section">
              <select
                value={form.section}
                onChange={(e) => updateForm('section', e.target.value)}
                className="select-base"
              >
                {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>

            <Field label="Title">
              <input
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
                placeholder="Optional — shown on hover and in the section grid"
                className="select-base"
              />
            </Field>

            <Field label="Position (lower = earlier)">
              <input
                type="number"
                value={form.position}
                onChange={(e) => updateForm('position', parseInt(e.target.value, 10) || 0)}
                className="select-base"
              />
            </Field>

            <Field label="Description" full>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={2}
                placeholder="Optional caption shown beneath the title"
                className="select-base"
              />
            </Field>

            <Field label="Custom thumbnail URL (optional)">
              <input
                value={form.thumbnail}
                onChange={(e) => updateForm('thumbnail', e.target.value)}
                placeholder="Defaults to the platform's own thumbnail when blank"
                className="select-base"
              />
            </Field>

            <Field label="Active on homepage">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--adm-text)' }}>
                <input
                  type="checkbox"
                  checked={!!form.active}
                  onChange={(e) => updateForm('active', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                {form.active ? 'Visible on the homepage' : 'Hidden (saved but not shown)'}
              </label>
            </Field>
          </div>

          {form.sourceUrl && (
            <div className="mt-5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>
                Preview
              </div>
              <div style={{ maxWidth: 560 }}>
                <VideoPlayer src={form.sourceUrl} title={form.title || 'Video preview'} />
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all"
              style={{
                background: submitting ? 'var(--adm-hover-bg)' : 'linear-gradient(135deg, #dc2626, #ef4444)',
                color: submitting ? 'var(--adm-text-muted)' : '#fff',
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {submitting ? 'Saving…' : (form.id ? 'Save changes' : 'Add to homepage')}
            </button>
            <button
              onClick={cancelForm}
              className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
              style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && !videos.length && !tableMissing && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--adm-text-muted)' }} />
        </div>
      )}

      {!loading && videos.length === 0 && !tableMissing && !form && (
        <div className="rounded-2xl py-16 text-center" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
          <Video className="mx-auto mb-3 h-10 w-10 opacity-40" style={{ color: 'var(--adm-text-subtle)' }} />
          <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>No videos yet. Click <strong>Add Video</strong> to get started.</p>
        </div>
      )}

      {grouped.map((g) => g.items.length > 0 && (
        <div key={g.id} className="mb-6">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--adm-text-subtle)' }}>
            {g.label} <span style={{ color: 'var(--adm-text-muted)' }}>({g.items.length})</span>
          </h3>
          <p className="mb-3 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
            Drag the handle to reorder. Eye toggles visibility on the public site.
          </p>
          <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}>
            {g.items.map((v) => (
              <div
                key={v.id}
                draggable
                onDragStart={onDragStart(v.id)}
                onDragOver={onDragOver}
                onDrop={onDrop(g.items, v.id)}
                className="flex items-center gap-3 border-b px-4 py-3"
                style={{ borderColor: 'var(--adm-border)', opacity: v.active ? 1 : 0.55 }}
              >
                <span
                  className="cursor-grab active:cursor-grabbing"
                  title="Drag to reorder"
                  style={{ color: 'var(--adm-text-subtle)' }}
                >
                  <GripVertical size={14} />
                </span>
                <span style={{
                  flexShrink: 0,
                  fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                  color: '#fff',
                  background: PROVIDER_COLORS[v.provider] || '#6b7280',
                }}>
                  {PROVIDER_LABELS[v.provider] || v.source_type || 'Video'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>
                    {v.title || <span style={{ color: 'var(--adm-text-subtle)' }}>(no title)</span>}
                  </p>
                  <p className="truncate text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{v.source_url}</p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  background: 'var(--adm-hover-bg)', color: 'var(--adm-text-muted)',
                }}>#{v.position}</span>
                <button onClick={() => toggleActive(v)} title={v.active ? 'Hide' : 'Show'} className="rounded p-1.5">
                  {v.active
                    ? <Eye size={14} style={{ color: '#16a34a' }} />
                    : <EyeOff size={14} style={{ color: 'var(--adm-text-subtle)' }} />}
                </button>
                <button onClick={() => startEdit(v)} title="Edit" className="rounded p-1.5">
                  <Pencil size={14} style={{ color: 'var(--adm-text-muted)' }} />
                </button>
                <button onClick={() => remove(v)} title="Delete" className="rounded p-1.5">
                  <Trash2 size={14} style={{ color: '#dc2626' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <style jsx>{`
        :global(.select-base) {
          width: 100%;
          border-radius: 10px;
          border: 1px solid var(--adm-border);
          background: var(--adm-bg);
          color: var(--adm-text);
          padding: 9px 11px;
          font-size: 13px;
          outline: none;
        }
        :global(.select-base:focus) { border-color: #dc2626; }
      `}</style>
    </div>
  );
}

function Field({ label, full, children }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

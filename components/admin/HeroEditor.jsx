'use client';

import { useEffect, useState } from 'react';
import { MediaUpload } from './MediaUpload';
import { db } from '@/lib/storage/db';

const SUBJECTS = ['lion', 'forest', 'eagle'];

export function HeroEditor({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    type: initial?.type || 'image',
    src: initial?.src || '',
    poster: initial?.poster || '',
    title: initial?.title || '',
    description: initial?.description || '',
    ctaLabel: initial?.cta?.label || 'Discover',
    ctaHref: initial?.cta?.href || '/animals',
    subject: initial?.subject || 'lion',
    paletteFrom: initial?.palette?.from || '#0c4a1a',
    paletteVia: initial?.palette?.via || '#3aa15a',
    paletteTo: initial?.palette?.to || '#d4af37',
    accent: initial?.accent || '#d4af37',
  }));
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      type: form.type,
      src: form.src,
      poster: form.poster,
      title: form.title.trim(),
      description: form.description.trim(),
      subject: form.subject,
      accent: form.accent,
      palette: { from: form.paletteFrom, via: form.paletteVia, to: form.paletteTo },
      cta: { label: form.ctaLabel.trim() || 'Discover', href: form.ctaHref.trim() || '/' },
    };
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass flex flex-col gap-5 rounded-2xl p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Type</span>
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Subject (placeholder)</span>
          <select
            value={form.subject}
            onChange={(e) => set('subject', e.target.value)}
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <MediaUpload
        value={form.src}
        onChange={(v) => set('src', v)}
        label={form.type === 'video' ? 'Video file (optional, will fall back to placeholder)' : 'Hero image'}
        accept={form.type === 'video' ? 'video/*' : 'image/*'}
      />

      {form.type === 'video' && (
        <MediaUpload
          value={form.poster}
          onChange={(v) => set('poster', v)}
          label="Video poster (optional)"
          accept="image/*"
        />
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Title</span>
        <input
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Description</span>
        <textarea
          required
          maxLength={280}
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">CTA label</span>
          <input
            value={form.ctaLabel}
            onChange={(e) => set('ctaLabel', e.target.value)}
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">CTA href</span>
          <input
            value={form.ctaHref}
            onChange={(e) => set('ctaHref', e.target.value)}
            placeholder="/posts/<slug> or any URL"
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
      </div>

      <PickPost onPick={(href) => set('ctaHref', href)} />


      <fieldset className="grid gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">From</span>
          <input type="color" value={form.paletteFrom} onChange={(e) => set('paletteFrom', e.target.value)} className="h-10 w-full rounded-xl" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Via</span>
          <input type="color" value={form.paletteVia} onChange={(e) => set('paletteVia', e.target.value)} className="h-10 w-full rounded-xl" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">To</span>
          <input type="color" value={form.paletteTo} onChange={(e) => set('paletteTo', e.target.value)} className="h-10 w-full rounded-xl" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Accent</span>
          <input type="color" value={form.accent} onChange={(e) => set('accent', e.target.value)} className="h-10 w-full rounded-xl" />
        </label>
      </fieldset>

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--glass-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-fg)] hover:bg-[var(--color-primary)]/5"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-[var(--color-primary)]/30 transition-colors hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save hero'}
        </button>
      </div>
    </form>
  );
}

/**
 * Pick a published post and write its /posts/<slug> URL into the CTA field.
 * Filters as you type. Closes after pick.
 */
function PickPost({ onPick }) {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || posts.length > 0) return;
    setLoading(true);
    db.posts.list()
      .then((rows) => setPosts((rows || []).filter((p) => p.status !== 'draft')))
      .finally(() => setLoading(false));
  }, [open, posts.length]);

  const filtered = q.trim()
    ? posts.filter((p) => (p.title || '').toLowerCase().includes(q.toLowerCase()))
    : posts;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs font-semibold text-[var(--color-primary)] hover:underline"
      >
        + Pick a published post for the CTA
      </button>
    );
  }

  return (
    <div className="glass flex flex-col gap-2 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-fg-soft)]">
          Pick post
        </span>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--color-fg-soft)] hover:underline">
          Cancel
        </button>
      </div>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search published posts…"
        className="rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
      />
      <div className="max-h-56 overflow-y-auto">
        {loading && <p className="px-2 py-3 text-xs text-[var(--color-fg-soft)]">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="px-2 py-3 text-xs text-[var(--color-fg-soft)]">No matching published posts.</p>
        )}
        {filtered.slice(0, 25).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => { onPick(`/posts/${p.slug}`); setOpen(false); }}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--color-primary)]/10"
          >
            <span className="truncate">{p.title || '(untitled)'}</span>
            <span className="flex-shrink-0 text-[10px] uppercase tracking-wider text-[var(--color-fg-soft)]">
              {p.category || '—'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}


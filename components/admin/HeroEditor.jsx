'use client';

import { useState } from 'react';
import { MediaUpload } from './MediaUpload';

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
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
      </div>

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

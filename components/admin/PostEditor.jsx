'use client';

import { useMemo, useState } from 'react';
import { categories } from '@/lib/mock/categories';
import { MediaUpload } from './MediaUpload';

function buildLabelOptions() {
  const options = [];
  categories.forEach((cat) => {
    cat.labels.forEach((label) => {
      options.push({ value: `${cat.slug}:${label}`, category: cat.slug, label, display: `${cat.name} → ${label}` });
    });
  });
  return options;
}

export function PostEditor({ initial, onSave, onCancel }) {
  const labelOptions = useMemo(buildLabelOptions, []);
  const [form, setForm] = useState(() => ({
    title: initial?.title || '',
    slug: initial?.slug || '',
    category: initial?.category || 'animals',
    label: initial?.label || (categories[0]?.labels?.[0] ?? ''),
    description: initial?.description || '',
    body: initial?.body || '',
    cover: initial?.cover || '',
    featured: !!initial?.featured,
    palette: initial?.coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' },
  }));
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLabelPair = (value) => {
    const [category, label] = value.split(':');
    setForm((f) => ({ ...f, category, label }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      category: form.category,
      label: form.label,
      description: form.description.trim(),
      body: form.body,
      cover: form.cover,
      featured: form.featured,
      coverPalette: form.palette,
    };
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass flex flex-col gap-5 rounded-2xl p-6">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Title</span>
        <input
          required
          maxLength={140}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Slug (optional, auto-generated if blank)</span>
          <input
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            placeholder="my-post-slug"
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Category & label</span>
          <select
            value={`${form.category}:${form.label}`}
            onChange={(e) => setLabelPair(e.target.value)}
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            {labelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.display}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Short description</span>
        <textarea
          required
          maxLength={280}
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Body</span>
        <textarea
          rows={10}
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-sm"
          placeholder="Write your story… (plain text, paragraphs separated by blank lines)"
        />
      </label>

      <MediaUpload value={form.cover} onChange={(v) => set('cover', v)} label="Cover image (optional)" />

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Palette from</span>
          <input type="color" value={form.palette.from} onChange={(e) => set('palette', { ...form.palette, from: e.target.value })} className="h-10 w-full rounded-xl" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Palette via</span>
          <input type="color" value={form.palette.via} onChange={(e) => set('palette', { ...form.palette, via: e.target.value })} className="h-10 w-full rounded-xl" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Palette to</span>
          <input type="color" value={form.palette.to} onChange={(e) => set('palette', { ...form.palette, to: e.target.value })} className="h-10 w-full rounded-xl" />
        </label>
      </fieldset>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => set('featured', e.target.checked)}
          className="h-4 w-4 accent-[var(--color-primary)]"
        />
        Mark as featured (eligible for the Featured hero rotation)
      </label>

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--glass-border)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--color-primary)]/5"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-[var(--color-primary)]/30 hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save post'}
        </button>
      </div>
    </form>
  );
}

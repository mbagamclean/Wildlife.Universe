'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { MediaUpload } from './MediaUpload';
import { db } from '@/lib/storage/db';
import { categories } from '@/lib/mock/categories';

const SUBJECTS = ['lion', 'forest', 'eagle'];

const AI_FIELDS = ['title', 'description', 'ctaLabel', 'ctaHref'];

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
  const [error, setError] = useState(null);

  // AI generator state — source filter (category + label) + per-field
  // busy flags + a small message strip showing which post was used.
  const [aiCategory, setAiCategory] = useState('');
  const [aiLabel, setAiLabel] = useState('');
  const [aiBusy, setAiBusy] = useState({});       // { title?: bool, all?: bool, ... }
  const [aiSource, setAiSource] = useState(null); // { title, slug, category, label }
  const [aiError, setAiError] = useState(null);

  const aiCategoryLabels =
    categories.find((c) => c.slug === aiCategory)?.labels || [];

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setBusy = (key, value) =>
    setAiBusy((b) => ({ ...b, [key]: value }));

  /**
   * Generate one or all hero fields from a source post. The API picks
   * the latest published post under the selected category/label (or the
   * latest overall when both are blank), then calls Claude to write
   * curiosity-driving copy that links to that post.
   */
  const aiFill = async (field) => {
    setAiError(null);
    setBusy(field, true);
    try {
      const res = await fetch('/api/admin/heroes/ai-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          category: aiCategory || null,
          label: aiLabel || null,
          currentValues: {
            title: form.title,
            description: form.description,
            ctaLabel: form.ctaLabel,
            ctaHref: form.ctaHref,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.detail || json.error || `Generation failed (${res.status})`);
      }
      // Apply only the fields the server returned. 'all' returns
      // title+description+ctaLabel+ctaHref; single-field requests only
      // return that field.
      const data = json.data || {};
      setForm((f) => ({
        ...f,
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.ctaLabel !== undefined ? { ctaLabel: data.ctaLabel } : {}),
        ...(data.ctaHref !== undefined ? { ctaHref: data.ctaHref } : {}),
      }));
      if (json.sourcePost) setAiSource(json.sourcePost);
    } catch (err) {
      setAiError(err?.message || 'Generation failed');
    } finally {
      setBusy(field, false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
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
    } catch (err) {
      setError(err?.message || 'Failed to save hero. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass flex flex-col gap-5 rounded-2xl p-6">
      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── AI source picker + master fill button ────────────────── */}
      <div className="rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]">
              <Sparkles className="h-4 w-4" aria-hidden /> AI hero generator
            </span>
            <span className="text-xs text-[var(--color-fg-soft)]">
              Picks the latest post in the chosen category and writes curiosity-driving copy that links to it. Leave blank for any category.
            </span>
          </div>
          <button
            type="button"
            onClick={() => aiFill('all')}
            disabled={!!aiBusy.all}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[var(--color-primary)]/30 transition-colors hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
          >
            {aiBusy.all ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            {aiBusy.all ? 'Filling…' : 'Auto-fill all from posts'}
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-[var(--color-fg-soft)]">Source category</span>
            <select
              value={aiCategory}
              onChange={(e) => { setAiCategory(e.target.value); setAiLabel(''); }}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            >
              <option value="">Any category (latest post)</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-[var(--color-fg-soft)]">Source label</span>
            <select
              value={aiLabel}
              onChange={(e) => setAiLabel(e.target.value)}
              disabled={!aiCategory}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Any label</option>
              {aiCategoryLabels.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>

        {aiSource && (
          <p className="mt-3 truncate text-xs text-[var(--color-fg-soft)]">
            Last fill used: <span className="font-medium text-[var(--color-fg)]">{aiSource.title}</span>
            {' '}({aiSource.category}{aiSource.label ? ` / ${aiSource.label}` : ''})
          </p>
        )}
        {aiError && (
          <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">{aiError}</p>
        )}
      </div>

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
        label={form.type === 'video' ? 'Video file (optional — falls back to placeholder)' : 'Hero image (optional — falls back to gradient)'}
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
        <span className="flex items-center justify-between">
          <span className="font-medium">Title</span>
          <AiFieldButton busy={aiBusy.title} onClick={() => aiFill('title')} />
        </span>
        <input
          required
          maxLength={120}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="flex items-center justify-between">
          <span className="font-medium">Description</span>
          <AiFieldButton busy={aiBusy.description} onClick={() => aiFill('description')} />
        </span>
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
          <span className="flex items-center justify-between">
            <span className="font-medium">CTA label</span>
            <AiFieldButton busy={aiBusy.ctaLabel} onClick={() => aiFill('ctaLabel')} />
          </span>
          <input
            value={form.ctaLabel}
            onChange={(e) => set('ctaLabel', e.target.value)}
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="flex items-center justify-between">
            <span className="font-medium">CTA href</span>
            <AiFieldButton busy={aiBusy.ctaHref} onClick={() => aiFill('ctaHref')} title="Set CTA href to the latest matching post" />
          </span>
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
 * Inline ✨ button that triggers AI generation for one field. Shows a
 * spinner while busy. The parent owns the busy state and the click
 * handler so the same component works for every field.
 */
function AiFieldButton({ busy, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!busy}
      title={title || 'Generate this field with AI'}
      aria-label={title || 'Generate this field with AI'}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/20 disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="h-3 w-3" aria-hidden />
      )}
      {busy ? 'Filling…' : 'AI fill'}
    </button>
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


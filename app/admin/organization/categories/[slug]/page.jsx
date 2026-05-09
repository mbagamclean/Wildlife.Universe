'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Loader2,
  Sparkles,
  AlertCircle,
  Check,
  Image as ImageIcon,
  Globe,
  Search,
  Share2,
  Settings,
} from 'lucide-react';
import { MediaUpload } from '@/components/admin/MediaUpload';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wildlifeuniverse.org';

// ── helpers ───────────────────────────────────────────────────────────────────

function urlFromMedia(media) {
  if (!media) return '';
  if (typeof media === 'string') return media;
  if (Array.isArray(media?.sources) && media.sources.length) {
    return media.sources[media.sources.length - 1]?.src || '';
  }
  return '';
}

/**
 * Score a string against length thresholds and return a tone the UI
 * paints with green / amber / rose. Used to give an at-a-glance health
 * read on every SEO field without dragging in a full SEO library.
 */
function lengthScore(value, low, ideal, max) {
  const len = (value || '').length;
  if (len === 0) return { tone: 'empty', label: 'empty', len };
  if (len > max) return { tone: 'bad', label: `${len} chars (over limit)`, len };
  if (len < low) return { tone: 'warn', label: `${len} chars (too short)`, len };
  if (len > ideal) return { tone: 'warn', label: `${len} chars (long)`, len };
  return { tone: 'good', label: `${len} chars`, len };
}

const TONE_CLASS = {
  good: 'text-emerald-500',
  warn: 'text-amber-500',
  bad: 'text-rose-500',
  empty: 'text-zinc-400',
};

const TONE_DOT = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-rose-500',
  empty: 'bg-zinc-400',
};

// ── editor ───────────────────────────────────────────────────────────────────

export default function CategoryEditorPage() {
  const router = useRouter();
  const { slug } = useParams();

  const [form, setForm] = useState(null);
  const [originalForm, setOriginalForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [, startTransition] = useTransition();

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/categories/${slug}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!cancelled) {
          setForm(data);
          setOriginalForm(data);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const setField = (key, value) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const isDirty = useMemo(() => {
    if (!form || !originalForm) return false;
    return JSON.stringify(form) !== JSON.stringify(originalForm);
  }, [form, originalForm]);

  // ── AI generate ──
  async function generateWithAi() {
    if (!form) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch('/api/admin/categories/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          labels: form.labels,
          existing: {
            shortDescription: form.shortDescription,
            description: form.description,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}`);
      // Merge: only fill empty fields by default. If you want to
      // overwrite, just clear the field first then re-run.
      setForm((f) => ({
        ...f,
        shortDescription: f.shortDescription || json.data.shortDescription,
        description: f.description || json.data.description,
        seoTitle: f.seoTitle || json.data.seoTitle,
        seoDescription: f.seoDescription || json.data.seoDescription,
        seoKeywords: f.seoKeywords || json.data.seoKeywords,
        ogTitle: f.ogTitle || json.data.ogTitle,
        ogDescription: f.ogDescription || json.data.ogDescription,
        twitterTitle: f.twitterTitle || json.data.twitterTitle,
        twitterDescription: f.twitterDescription || json.data.twitterDescription,
        imageAlt: f.imageAlt || json.data.imageAlt,
        imageCaption: f.imageCaption || json.data.imageCaption,
      }));
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  // ── save ──
  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          shortDescription: form.shortDescription,
          description: form.description,
          thumbnailUrl: form.thumbnailUrl,
          heroImageUrl: form.heroImageUrl,
          heroImageMobileUrl: form.heroImageMobileUrl,
          imageAlt: form.imageAlt,
          imageCaption: form.imageCaption,
          seoTitle: form.seoTitle,
          seoDescription: form.seoDescription,
          seoKeywords: form.seoKeywords,
          canonicalUrl: form.canonicalUrl,
          ogTitle: form.ogTitle,
          ogDescription: form.ogDescription,
          twitterTitle: form.twitterTitle,
          twitterDescription: form.twitterDescription,
          featured: form.featured,
          trending: form.trending,
          position: form.position,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setForm(json);
      setOriginalForm(json);
      setSavedAt(new Date());
      // Notify other components on the same tab so list views refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wu:storage-changed'));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--adm-text-muted)]" />
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="p-8">
        <p className="text-sm text-rose-500">Failed to load category: {error}</p>
        <Link href="/admin/organization/categories" className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--adm-text-muted)] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to categories
        </Link>
      </div>
    );
  }

  if (!form) return null;

  const titleScore = lengthScore(form.seoTitle, 30, 60, 70);
  const metaScore = lengthScore(form.seoDescription, 120, 160, 180);
  const shortScore = lengthScore(form.shortDescription, 40, 160, 180);
  const ogTitleScore = lengthScore(form.ogTitle, 20, 65, 90);
  const ogDescScore = lengthScore(form.ogDescription, 80, 180, 220);

  const canonical = form.canonicalUrl?.trim() || `${SITE}/${form.slug}`;
  const previewTitle = (form.seoTitle?.trim() || `${form.name} — Wildlife Universe`).slice(0, 70);
  const previewDescription = (form.seoDescription?.trim() || form.shortDescription?.trim() || '').slice(0, 180);

  return (
    <div className="p-5 sm:p-8">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 -mx-5 -mt-5 border-b px-5 py-4 backdrop-blur sm:-mx-8 sm:-mt-8 sm:px-8" style={{ background: 'rgba(0,0,0,0.0)', borderColor: 'var(--adm-border)' }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3" style={{ background: 'var(--adm-bg)' }}>
          <Link
            href="/admin/organization/categories"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--adm-surface)]"
            aria-label="Back to categories"
            style={{ color: 'var(--adm-text-muted)' }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#d4af37]">Categories</p>
            <h1 className="truncate text-base font-bold sm:text-lg" style={{ color: 'var(--adm-text)' }}>
              {form.name || form.slug}
            </h1>
          </div>
          <SavedIndicator savedAt={savedAt} dirty={isDirty} />
          <button
            type="button"
            onClick={save}
            disabled={saving || !isDirty}
            className="flex items-center gap-2 rounded-xl bg-[#008000] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#006400] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-5xl flex-col gap-6">
        {/* ── AI panel ── */}
        <Section
          icon={Sparkles}
          title="AI Assistant"
          subtitle="Generate descriptions, SEO copy, and Open Graph metadata in one pass. Existing fields aren't overwritten — only blanks fill in."
        >
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={generateWithAi}
              disabled={aiBusy || !form.name}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
            >
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiBusy ? 'Generating…' : 'Generate with AI'}
            </button>
            {aiError && (
              <span className="inline-flex items-center gap-1.5 text-xs text-rose-500">
                <AlertCircle className="h-3.5 w-3.5" /> {aiError}
              </span>
            )}
            <span className="text-xs" style={{ color: 'var(--adm-text-subtle)' }}>
              To regenerate a specific field, clear it first then click again.
            </span>
          </div>
        </Section>

        {/* ── Basics ── */}
        <Section icon={Settings} title="Basics" subtitle="Identity + slug + the editorial copy.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label="Slug"
              hint="URLs depend on this — locked to avoid breaking links."
            >
              <input
                type="text"
                value={form.slug}
                readOnly
                className={`${inputClass} cursor-not-allowed opacity-60`}
              />
            </Field>
          </div>
          <Field
            label="Short description"
            hint="One line. Used on cards, RSS, and as the default meta description fallback."
            score={shortScore}
          >
            <input
              type="text"
              value={form.shortDescription}
              onChange={(e) => setField('shortDescription', e.target.value)}
              maxLength={220}
              className={inputClass}
            />
          </Field>
          <Field label="Full description" hint="Shown on the category landing page (HTML allowed).">
            <textarea
              rows={8}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className={`${inputClass} resize-y font-sans`}
            />
          </Field>
        </Section>

        {/* ── Media ── */}
        <Section icon={ImageIcon} title="Media" subtitle="Hero + thumbnail. Upload to Supabase via the same pipeline used by posts.">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label>Thumbnail</Label>
              <MediaUpload
                label="Square / portrait card image"
                accept="image/*"
                value={form.thumbnailUrl ? { type: 'image', sources: [{ src: form.thumbnailUrl, type: 'image/webp' }] } : ''}
                onChange={(media) => setField('thumbnailUrl', urlFromMedia(media))}
              />
            </div>
            <div>
              <Label>Desktop hero</Label>
              <MediaUpload
                label="Wide hero banner (≥ 1600px ideal)"
                accept="image/*"
                value={form.heroImageUrl ? { type: 'image', sources: [{ src: form.heroImageUrl, type: 'image/webp' }] } : ''}
                onChange={(media) => setField('heroImageUrl', urlFromMedia(media))}
              />
            </div>
            <div>
              <Label>Mobile hero (optional)</Label>
              <MediaUpload
                label="Portrait/mobile-tuned hero"
                accept="image/*"
                value={form.heroImageMobileUrl ? { type: 'image', sources: [{ src: form.heroImageMobileUrl, type: 'image/webp' }] } : ''}
                onChange={(media) => setField('heroImageMobileUrl', urlFromMedia(media))}
              />
              <p className="mt-1 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
                Falls back to the desktop hero when blank.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <Field label="Image alt text" hint="Descriptive, no “image of”.">
                <input
                  type="text"
                  value={form.imageAlt}
                  onChange={(e) => setField('imageAlt', e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Image caption" hint="Optional editorial line under the hero.">
                <input
                  type="text"
                  value={form.imageCaption}
                  onChange={(e) => setField('imageCaption', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* ── SEO ── */}
        <Section icon={Search} title="SEO" subtitle="Search-engine metadata. Length thresholds are advisory; green = healthy, amber = drift, rose = over.">
          <div className="grid grid-cols-1 gap-4">
            <Field label="SEO title" hint="≤ 60 chars sweet spot." score={titleScore}>
              <input
                type="text"
                value={form.seoTitle}
                onChange={(e) => setField('seoTitle', e.target.value)}
                maxLength={120}
                className={inputClass}
              />
            </Field>
            <Field label="Meta description" hint="140–160 chars sweet spot." score={metaScore}>
              <textarea
                rows={3}
                value={form.seoDescription}
                onChange={(e) => setField('seoDescription', e.target.value)}
                maxLength={220}
                className={`${inputClass} resize-none`}
              />
            </Field>
            <Field label="Keywords" hint="Comma-separated. 8–12 ideal.">
              <input
                type="text"
                value={form.seoKeywords}
                onChange={(e) => setField('seoKeywords', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Canonical URL" hint={`Defaults to ${SITE}/${form.slug}.`}>
              <input
                type="url"
                value={form.canonicalUrl}
                onChange={(e) => setField('canonicalUrl', e.target.value)}
                placeholder={`${SITE}/${form.slug}`}
                className={inputClass}
              />
            </Field>
          </div>

          {/* ── Google snippet preview ── */}
          <div className="mt-6 rounded-2xl p-5" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--adm-text-subtle)' }}>
              <Globe className="h-3 w-3" /> Google search preview
            </p>
            <div className="font-serif">
              <div className="text-xs text-[#5f6368]">{canonical.replace(/^https?:\/\//, '')}</div>
              <div className="mt-1 truncate text-[20px] leading-tight text-[#1a0dab] dark:text-[#8ab4f8]">
                {previewTitle}
              </div>
              <div className="mt-1 text-[14px] leading-snug text-[#4d5156] dark:text-[#bdc1c6]">
                {previewDescription || <span className="italic opacity-60">— meta description not set —</span>}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Social ── */}
        <Section icon={Share2} title="Open Graph &amp; Twitter" subtitle="Share-card metadata. Falls back to SEO fields when blank.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Open Graph title" score={ogTitleScore}>
              <input
                type="text"
                value={form.ogTitle}
                onChange={(e) => setField('ogTitle', e.target.value)}
                maxLength={120}
                className={inputClass}
              />
            </Field>
            <Field label="Twitter title">
              <input
                type="text"
                value={form.twitterTitle}
                onChange={(e) => setField('twitterTitle', e.target.value)}
                maxLength={120}
                className={inputClass}
              />
            </Field>
            <Field label="Open Graph description" score={ogDescScore}>
              <textarea
                rows={3}
                value={form.ogDescription}
                onChange={(e) => setField('ogDescription', e.target.value)}
                maxLength={300}
                className={`${inputClass} resize-none`}
              />
            </Field>
            <Field label="Twitter description">
              <textarea
                rows={3}
                value={form.twitterDescription}
                onChange={(e) => setField('twitterDescription', e.target.value)}
                maxLength={300}
                className={`${inputClass} resize-none`}
              />
            </Field>
          </div>
        </Section>

        {/* ── Discoverability ── */}
        <Section icon={Settings} title="Discoverability" subtitle="Surfacing flags + ordering on the homepage.">
          <div className="flex flex-wrap items-center gap-6">
            <Toggle
              checked={form.featured}
              onChange={(v) => setField('featured', v)}
              label="Featured"
              hint="Highlight on the homepage hero strip."
            />
            <Toggle
              checked={form.trending}
              onChange={(v) => setField('trending', v)}
              label="Trending"
              hint="Surface in the trending rail."
            />
            <Field label="Position" hint="Lower numbers come first." className="!w-32">
              <input
                type="number"
                value={form.position}
                onChange={(e) => setField('position', Number(e.target.value) || 0)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <AlertCircle className="mr-1.5 inline h-4 w-4" /> {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ── small UI bits ────────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-xl border bg-[var(--adm-surface)] px-4 py-2.5 text-sm transition-colors placeholder:text-[var(--adm-text-subtle)] focus:border-[#d4af37] focus:outline-none';

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section
      className="rounded-2xl p-5 sm:p-6"
      style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}
    >
      <div className="mb-5 flex items-start gap-3">
        {Icon && (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--adm-surface-3)' }}>
            <Icon className="h-4 w-4" style={{ color: 'var(--adm-text-muted)' }} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-bold sm:text-lg" style={{ color: 'var(--adm-text)' }}>
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs sm:text-sm" style={{ color: 'var(--adm-text-subtle)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Label({ children }) {
  return <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--adm-text-muted)' }}>{children}</label>;
}

function Field({ label, hint, score, className = '', children }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        {score && (
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${TONE_CLASS[score.tone]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[score.tone]}`} />
            {score.label}
          </span>
        )}
      </div>
      {children}
      {hint && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span
        className={`mt-0.5 inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-[#008000]' : 'bg-[var(--adm-surface-3)]'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>{label}</span>
        {hint && <span className="text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{hint}</span>}
      </span>
      <input type="checkbox" className="sr-only" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function SavedIndicator({ savedAt, dirty }) {
  if (dirty) {
    return (
      <span className="hidden items-center gap-1.5 text-xs sm:flex" style={{ color: 'var(--adm-text-subtle)' }}>
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
      </span>
    );
  }
  if (!savedAt) return null;
  return (
    <span className="hidden items-center gap-1.5 text-xs text-emerald-500 sm:flex">
      <Check className="h-3.5 w-3.5" /> Saved
    </span>
  );
}

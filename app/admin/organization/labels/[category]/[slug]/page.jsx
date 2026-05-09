'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  Tag,
} from 'lucide-react';
import { MediaUpload } from '@/components/admin/MediaUpload';
import { categoriesDb } from '@/lib/storage/categoriesDb';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wildlifeuniverse.org';

function urlFromMedia(media) {
  if (!media) return '';
  if (typeof media === 'string') return media;
  if (Array.isArray(media?.sources) && media.sources.length) {
    return media.sources[media.sources.length - 1]?.src || '';
  }
  return '';
}

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

export default function LabelEditorPage() {
  const { category: categorySlug, slug } = useParams();

  const [categoryName, setCategoryName] = useState('');
  const [form, setForm] = useState(null);
  const [originalForm, setOriginalForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [labelRes, cats] = await Promise.all([
          fetch(`/api/admin/labels/${categorySlug}/${slug}`),
          categoriesDb.list(),
        ]);
        const labelData = await labelRes.json();
        if (!labelRes.ok) throw new Error(labelData?.error || `HTTP ${labelRes.status}`);
        if (!cancelled) {
          setForm(labelData);
          setOriginalForm(labelData);
          const cat = cats.find((c) => c.slug === categorySlug);
          setCategoryName(cat?.name || categorySlug);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [categorySlug, slug]);

  const setField = (key, value) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const isDirty = useMemo(() => {
    if (!form || !originalForm) return false;
    return JSON.stringify(form) !== JSON.stringify(originalForm);
  }, [form, originalForm]);

  async function generateWithAi() {
    if (!form) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch('/api/admin/labels/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          categoryName,
          categorySlug,
          existing: {
            shortDescription: form.shortDescription,
            description: form.description,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}`);
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

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/labels/${categorySlug}/${slug}`, {
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
          position: form.position,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setForm(json);
      setOriginalForm(json);
      setSavedAt(new Date());
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
        <p className="text-sm text-rose-500">Failed to load label: {error}</p>
        <Link href="/admin/organization/labels" className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--adm-text-muted)] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to labels
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

  const canonical = form.canonicalUrl?.trim() || `${SITE}/${categorySlug}/${slug}`;
  const previewTitle = (form.seoTitle?.trim() || `${form.name} · ${categoryName} — Wildlife Universe`).slice(0, 70);
  const previewDescription = (form.seoDescription?.trim() || form.shortDescription?.trim() || '').slice(0, 180);

  return (
    <div className="p-5 sm:p-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-5 -mt-5 border-b px-5 py-4 sm:-mx-8 sm:-mt-8 sm:px-8" style={{ background: 'var(--adm-bg)', borderColor: 'var(--adm-border)' }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            href="/admin/organization/labels"
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--adm-surface)]"
            aria-label="Back to labels"
            style={{ color: 'var(--adm-text-muted)' }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#d4af37]">
              {categoryName} · Label
            </p>
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
        <Section
          icon={Sparkles}
          title="AI Assistant"
          subtitle={`Generate copy + SEO tailored to ${form.name} within ${categoryName}. Existing fields aren't overwritten — only blanks fill in.`}
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
          </div>
        </Section>

        <Section icon={Settings} title="Basics">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name">
              <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Slug" hint="Locked — URLs depend on this.">
              <input type="text" value={form.slug} readOnly className={`${inputClass} cursor-not-allowed opacity-60`} />
            </Field>
          </div>
          <Field label="Short description" hint="One line. Used on cards + meta description fallback." score={shortScore}>
            <input type="text" value={form.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} maxLength={220} className={inputClass} />
          </Field>
          <Field label="Full description" hint="Shown on the label landing page (HTML allowed).">
            <textarea rows={8} value={form.description} onChange={(e) => setField('description', e.target.value)} className={`${inputClass} resize-y font-sans`} />
          </Field>
        </Section>

        <Section icon={ImageIcon} title="Media">
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
            </div>
            <div className="flex flex-col gap-4">
              <Field label="Image alt text">
                <input type="text" value={form.imageAlt} onChange={(e) => setField('imageAlt', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Image caption">
                <input type="text" value={form.imageCaption} onChange={(e) => setField('imageCaption', e.target.value)} className={inputClass} />
              </Field>
            </div>
          </div>
        </Section>

        <Section icon={Search} title="SEO">
          <div className="grid grid-cols-1 gap-4">
            <Field label="SEO title" hint="≤ 60 chars sweet spot." score={titleScore}>
              <input type="text" value={form.seoTitle} onChange={(e) => setField('seoTitle', e.target.value)} maxLength={120} className={inputClass} />
            </Field>
            <Field label="Meta description" hint="140–160 chars sweet spot." score={metaScore}>
              <textarea rows={3} value={form.seoDescription} onChange={(e) => setField('seoDescription', e.target.value)} maxLength={220} className={`${inputClass} resize-none`} />
            </Field>
            <Field label="Keywords" hint="Comma-separated. 8–12 ideal.">
              <input type="text" value={form.seoKeywords} onChange={(e) => setField('seoKeywords', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Canonical URL" hint={`Defaults to ${SITE}/${categorySlug}/${slug}.`}>
              <input type="url" value={form.canonicalUrl} onChange={(e) => setField('canonicalUrl', e.target.value)} placeholder={`${SITE}/${categorySlug}/${slug}`} className={inputClass} />
            </Field>
          </div>

          <div className="mt-6 rounded-2xl p-5" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--adm-text-subtle)' }}>
              <Globe className="h-3 w-3" /> Google search preview
            </p>
            <div className="font-serif">
              <div className="text-xs text-[#5f6368]">{canonical.replace(/^https?:\/\//, '')}</div>
              <div className="mt-1 truncate text-[20px] leading-tight text-[#1a0dab] dark:text-[#8ab4f8]">{previewTitle}</div>
              <div className="mt-1 text-[14px] leading-snug text-[#4d5156] dark:text-[#bdc1c6]">
                {previewDescription || <span className="italic opacity-60">— meta description not set —</span>}
              </div>
            </div>
          </div>
        </Section>

        <Section icon={Share2} title="Open Graph &amp; Twitter">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Open Graph title" score={ogTitleScore}>
              <input type="text" value={form.ogTitle} onChange={(e) => setField('ogTitle', e.target.value)} maxLength={120} className={inputClass} />
            </Field>
            <Field label="Twitter title">
              <input type="text" value={form.twitterTitle} onChange={(e) => setField('twitterTitle', e.target.value)} maxLength={120} className={inputClass} />
            </Field>
            <Field label="Open Graph description" score={ogDescScore}>
              <textarea rows={3} value={form.ogDescription} onChange={(e) => setField('ogDescription', e.target.value)} maxLength={300} className={`${inputClass} resize-none`} />
            </Field>
            <Field label="Twitter description">
              <textarea rows={3} value={form.twitterDescription} onChange={(e) => setField('twitterDescription', e.target.value)} maxLength={300} className={`${inputClass} resize-none`} />
            </Field>
          </div>
        </Section>

        <Section icon={Tag} title="Surfacing">
          <div className="flex flex-wrap items-center gap-6">
            <Toggle
              checked={form.featured}
              onChange={(v) => setField('featured', v)}
              label="Featured"
              hint={`Highlight ${form.name} on the ${categoryName} category page.`}
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

const inputClass =
  'w-full rounded-xl border bg-[var(--adm-surface)] px-4 py-2.5 text-sm transition-colors placeholder:text-[var(--adm-text-subtle)] focus:border-[#d4af37] focus:outline-none';

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}>
      <div className="mb-5 flex items-start gap-3">
        {Icon && (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--adm-surface-3)' }}>
            <Icon className="h-4 w-4" style={{ color: 'var(--adm-text-muted)' }} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-bold sm:text-lg" style={{ color: 'var(--adm-text)' }}>{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs sm:text-sm" style={{ color: 'var(--adm-text-subtle)' }}>{subtitle}</p>}
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
      {hint && <p className="mt-1 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className={`mt-0.5 inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-[#008000]' : 'bg-[var(--adm-surface-3)]'}`}>
        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'}`} />
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

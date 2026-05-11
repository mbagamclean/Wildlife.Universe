'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Star, Clock, Eye, Check, ChevronUp,
  Calendar, List, ChevronDown, Bookmark, BookmarkCheck, Share2, User,
} from 'lucide-react';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PostCard } from './PostCard';
import { ArticleAudioPlayer } from './ArticleAudioPlayer';
import { ArticleReactions } from './ArticleReactions';
import { PostLabelSections } from './PostLabelSections';
import { categories, labelSlug } from '@/lib/mock/categories';
import {
  bodyToHtml,
  sanitizeBodyHtml,
  injectHeadingIdsAndBuildToc,
  stripHtml,
} from '@/lib/posts/html';
import {
  TRANSLATE_TARGET_BY_AUDIO_LANG,
  translateText,
} from '@/lib/posts/translate';

/* ─── helpers ─── */
function categoryName(slug) {
  return categories.find((c) => c.slug === slug)?.name || slug;
}
function formatDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return ''; }
}
function readingMins(text) {
  return Math.max(1, Math.round(((text || '').trim().split(/\s+/).filter(Boolean).length) / 200));
}
/* TOC from a plain-text body — used as a fallback when an HTML body has
   no h1/h2/h3 headings. Splits by paragraph, then sentence boundary,
   then takes up to 7 evenly-spaced anchors. */
function buildTocFromText(text) {
  if (!text) return [];
  const paragraphs = text
    .split(/(?:\n\s*\n|\.\s+(?=[A-Z0-9"']))/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (paragraphs.length < 2) return [];
  const step = Math.max(1, Math.floor(paragraphs.length / 7));
  const items = [];
  for (let i = 0; i < paragraphs.length && items.length < 7; i += step) {
    const raw = paragraphs[i].replace(/\s+/g, ' ').trim();
    const dot = raw.search(/[.!?]/);
    const full = dot > 8 ? raw.slice(0, dot + 1) : raw;
    const title = full.length > 72 ? `${full.slice(0, 69)}…` : full;
    items.push({ id: `post-text-anchor-${i}`, title, level: 2 });
  }
  return items;
}

/* ─── Brand-faithful share icons ──────────────────────────────────────────
 * Each entry carries:
 *   color    — at-rest icon colour (vivid brand colour, or a CSS var when
 *              the brand mark is black/white so it stays visible across
 *              light + dark themes — X and Threads use --color-fg).
 *   hoverBg  — the fill colour the button takes on hover. Falls back to
 *              `color` when not overridden.
 *   shadow   — RGBA glow used for the hover lift; matches the hover fill.
 * SVG paths are the canonical SimpleIcons brand glyphs.
 * ──────────────────────────────────────────────────────────────────────── */
const SOCIALS = [
  {
    name: 'WhatsApp',
    color: '#25D366',
    shadow: 'rgba(37,211,102,0.45)',
    href: (u, t) => `https://api.whatsapp.com/send?text=${encodeURIComponent(t + ' ' + u)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>,
  },
  {
    name: 'Facebook',
    color: '#1877F2',
    shadow: 'rgba(24,119,242,0.45)',
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  {
    name: 'Telegram',
    color: '#26A5E4',
    shadow: 'rgba(38,165,228,0.45)',
    href: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
  },
  {
    // X's brand mark is monochrome — pin the rest colour to the theme's
    // foreground so it reads on both light and dark, switch to brand-true
    // black on hover with a white glyph.
    name: 'X',
    color: 'var(--color-fg)',
    hoverBg: '#000000',
    shadow: 'rgba(0,0,0,0.45)',
    href: (u, t) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  {
    name: 'Threads',
    color: 'var(--color-fg)',
    hoverBg: '#000000',
    shadow: 'rgba(0,0,0,0.45)',
    href: (u, t) => `https://www.threads.net/intent/post?text=${encodeURIComponent(t + ' ' + u)}`,
    // Official Meta Threads brand glyph published at about.threads.net/brand —
    // the @-with-loop knot recognisable from the app icon. Single path, fills
    // edge-to-edge in the 24x24 viewBox so it reads cleanly at 20px and stays
    // sharp on retina.
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
        <path d="M16.668 11.214c-.087-.041-.176-.081-.265-.119-.157-2.886-1.75-4.541-4.426-4.558-.012 0-.024 0-.036 0-1.601 0-2.954.683-3.789 1.927l1.467.974c.626-.929 1.611-1.131 2.323-1.131h.024c.882.006 1.547.262 1.978.762.314.364.523.866.626 1.501-.762-.13-1.585-.169-2.464-.117-2.482.143-4.084 1.602-3.976 3.633.054 1.029.566 1.913 1.443 2.491.741.488 1.696.728 2.689.673 1.31-.072 2.34-.578 3.058-1.498.546-.7.892-1.61 1.038-2.745.578.348 1.005.804 1.241 1.351.404.939.426 2.484-.838 3.751-1.108 1.107-2.434 1.586-4.439 1.601-2.225-.017-3.911-.733-5.013-2.131C7.28 15.354 6.745 13.59 6.736 12c.009-1.59.546-3.354 1.529-4.629C9.367 5.973 11.054 5.257 13.279 5.241c2.244.017 3.961.737 5.099 2.142.557.687.972 1.555 1.234 2.567l1.715-.515C20.991 8.196 20.461 7.011 19.679 6.036 18.224 4.236 16.082 3.293 13.288 3.273h-.013c-2.788.019-4.91.97-6.319 2.79C5.534 7.766 4.847 9.842 4.838 12s.696 4.225 1.985 5.917c1.536 1.943 3.752 2.927 6.591 2.94h.013c2.515-.018 4.295-.658 5.808-2.169 1.86-1.86 1.793-4.221 1.18-5.626-.439-1.005-1.243-1.823-2.347-2.395-.235-.122-.479-.235-.728-.34l-.072-.113ZM12.06 14.928c-1.099.062-2.244-.434-2.301-1.519-.04-.755.546-1.598 2.371-1.703.21-.012.413-.018.616-.018.6 0 1.158.06 1.667.171-.18 2.366-1.272 3.005-2.353 3.069Z"/>
      </svg>
    ),
  },
  {
    name: 'Instagram',
    color: '#E4405F',
    // Instagram's iconic gradient — used only on hover so the at-rest
    // colour stays single-tone for clarity.
    hoverBg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    shadow: 'rgba(220,39,67,0.45)',
    href: (u) => `https://www.instagram.com/`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  },
  {
    name: 'Blogger',
    color: '#FF5722',
    shadow: 'rgba(255,87,34,0.45)',
    href: (u, t) => `https://www.blogger.com/blog-this.g?u=${encodeURIComponent(u)}&n=${encodeURIComponent(t)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M21.976 24H2.026C.9 24 0 23.1 0 21.976V2.026C0 .9.9 0 2.026 0h19.95C23.1 0 24 .9 24 2.026v19.95C24 23.1 23.1 24 21.976 24zM11.5 6.5H8.94C7.622 6.5 6.5 7.603 6.5 8.94v6.12c0 1.337 1.103 2.44 2.44 2.44h6.12c1.337 0 2.44-1.103 2.44-2.44V13.3c0-.547-.44-.988-.988-.988s-.988.441-.988.988v1.76c0 .256-.208.463-.463.463H8.94a.463.463 0 01-.463-.463V8.94c0-.256.208-.463.463-.463H11.5c.547 0 .988-.44.988-.988S12.047 6.5 11.5 6.5zm5.963 2.2a.888.888 0 00-.888-.888H14.9a.888.888 0 100 1.776h1.675c.49 0 .888-.397.888-.888zm-4.288.131H9.788a.756.756 0 100 1.512h3.387a.756.756 0 100-1.512zm0 2.7H9.788a.756.756 0 100 1.512h3.387a.756.756 0 100-1.512z"/></svg>,
  },
  {
    name: 'Pinterest',
    color: '#E60023',
    shadow: 'rgba(230,0,35,0.45)',
    href: (u, t) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}&description=${encodeURIComponent(t)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>,
  },
];

function SocialIcon({ social, url, title }) {
  const restColor = social.color;
  const hoverBg = social.hoverBg || social.color;
  const shadow = social.shadow || 'rgba(0,0,0,0.25)';
  return (
    <a
      href={social.href(url, title)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Share on ${social.name}`}
      title={`Share on ${social.name}`}
      // CSS variables let the at-rest icon colour and the hover fill be
      // driven from data while still being overridable by Tailwind hover:
      // utilities (which sit in the cascade and beat var-based values).
      style={{
        '--brand-rest': restColor,
        '--brand-hover': hoverBg,
        '--brand-shadow': shadow,
      }}
      className="
        group/share relative flex h-11 w-11 items-center justify-center rounded-full
        border border-[var(--glass-border)] bg-[var(--glass-bg)]
        text-[color:var(--brand-rest)] backdrop-blur-md
        transition-all duration-200 ease-out
        hover:-translate-y-0.5 hover:scale-110 hover:border-transparent hover:text-white
        hover:[background:var(--brand-hover)]
        hover:shadow-[0_8px_24px_var(--brand-shadow)]
        active:scale-95
        focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-[color:var(--brand-rest)]
      "
    >
      {social.icon}
    </a>
  );
}

function SocialShareRow({ title, slug }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const url = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-md transition-all duration-200 active:scale-[0.97] ${
          open
            ? 'border-[#008000]/50 bg-[#008000]/15 text-[#008000]'
            : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-fg)] hover:border-[#008000]/40 hover:text-[#008000]'
        }`}
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-1.5"
          >
            {SOCIALS.map((s) => (
              <SocialIcon key={s.name} social={s} url={url} title={title} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CoverMedia({ cover, title, className = '' }) {
  if (!cover) return null;

  if (typeof cover === 'string') {
    // Could be a video URL or image URL
    const isVideoUrl = /\.(mp4|webm|ogv|mov)(\?|$)/i.test(cover) ||
      cover.includes('youtube.com') || cover.includes('youtu.be') ||
      cover.includes('vimeo.com') || cover.includes('tiktok.com') ||
      cover.includes('instagram.com') || cover.includes('facebook.com');
    if (isVideoUrl)
      return <VideoPlayer src={cover} className={className} rounded={false} showBadge />;
    return (
      <img
        src={cover}
        alt={title}
        className={`h-full w-full object-cover ${className}`}
        style={{ objectPosition: 'center center' }}
      />
    );
  }

  if (cover.type === 'video')
    return <VideoPlayer src={cover} className={className} rounded={false} showBadge={false} />;

  return (
    <picture>
      {(cover.sources || []).slice(0, -1).map((s, i) => <source key={i} srcSet={s.src} type={s.type} />)}
      <img
        src={cover.sources?.[Math.max(0, (cover.sources?.length || 1) - 1)]?.src || ''}
        alt={title}
        className={`h-full w-full object-cover ${className}`}
        style={{ objectPosition: 'center center' }}
      />
    </picture>
  );
}

/* ─── word-level highlight renderer ─── */
function renderWords(text, paraStartIdx, currentIdx) {
  const parts = text.split(/(\s+)/);
  let wc = 0;
  return parts.map((part, i) => {
    if (!part.trim()) return <span key={i}>{part}</span>;
    const idx       = paraStartIdx + wc++;
    const isCurrent = currentIdx >= 0 && idx === currentIdx;
    return (
      <span
        key={i}
        {...(isCurrent ? { 'data-audio-word': 'true' } : {})}
        className={isCurrent
          ? 'rounded bg-[#008000]/20 font-semibold text-[#008000] transition-colors duration-75'
          : undefined
        }
      >
        {part}
      </span>
    );
  });
}

/* ─── Mobile sticky TOC bar (tablet + phone only) ─── */
function MobileTocBar({ toc, activeToc, progress, visible, onNavigate }) {
  const [open, setOpen] = useState(false);

  if (toc.length < 2) return null;

  const prev = activeToc > 0 ? toc[activeToc - 1] : null;
  const curr = toc[activeToc] || toc[0];
  const next = activeToc < toc.length - 1 ? toc[activeToc + 1] : null;

  return (
    // Pinned at top-14 (56 px), not top-16 (64 px). The navbar
    // shrinks from 64 to 56 px when the page scrolls (py-3 to py-2
    // in Navbar.jsx). MobileTocBar only ever appears AFTER the hero
    // has scrolled out of view — by which point the navbar is always
    // in its 56 px scrolled state — so 56 px sits flush against the
    // navbar bottom with no gap.
    <div className="fixed left-0 right-0 top-14 z-40 lg:hidden">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 32, mass: 0.8 }}
          >
            {/* dual-track reading progress strip */}
            <div className="relative h-[3px] bg-[var(--glass-border)]">
              <div
                aria-hidden
                className="absolute left-0 top-0 h-full bg-[#008000] transition-[width] duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* main bar — matches the scrolled navbar's glassmorphism so
                this sticky strip blends into the same translucent panel
                the nav becomes once scrolling starts. lg:hidden on the
                outer wrapper keeps the effect mobile-only. */}
            <div className="glass border-b border-[var(--glass-border)] shadow-lg shadow-black/5">
              <div className="flex items-stretch">

                {/* ≡ TOC button */}
                <button
                  onClick={() => setOpen((v) => !v)}
                  aria-label="Table of contents"
                  className="flex w-12 flex-shrink-0 items-center justify-center border-r border-[var(--glass-border)] text-[#008000] transition-colors hover:bg-[#008000]/8 active:scale-95"
                >
                  <List className="h-[18px] w-[18px]" />
                </button>

                {/* prev / current / next */}
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="flex min-w-0 flex-1 flex-col items-center justify-center gap-px py-2.5"
                  aria-label={`Section ${activeToc + 1}: ${curr.title}. Tap to expand`}
                >
                  {prev && (
                    <span className="max-w-[88%] truncate text-[10px] text-[var(--color-fg-soft)] opacity-50">
                      {prev.title}
                    </span>
                  )}
                  <span className="max-w-[92%] truncate text-xs font-semibold text-[#008000]">
                    {curr.title}
                  </span>
                  {next && (
                    <span className="max-w-[88%] truncate text-[10px] text-[var(--color-fg-soft)] opacity-50">
                      {next.title}
                    </span>
                  )}
                </button>

                {/* progress % + chevron */}
                <button
                  onClick={() => setOpen((v) => !v)}
                  aria-label={open ? 'Collapse' : 'Expand table of contents'}
                  className="flex w-14 flex-shrink-0 flex-col items-center justify-center gap-1 border-l border-[var(--glass-border)] transition-colors hover:bg-[var(--glass-border)]/40 active:scale-95"
                >
                  <span className="text-[10px] font-bold tabular-nums text-[#008000]">
                    {Math.round(progress)}%
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-[var(--color-fg-soft)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Expanded full section list */}
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden border-t border-[var(--glass-border)]"
                  >
                    <ol className="max-h-60 overflow-y-auto py-1.5">
                      {toc.map((item, idx) => {
                        const active = idx === activeToc;
                        const lvl = Math.max(2, Math.min(4, item.level || 2));
                        const extraIndent = (lvl - 2) * 14; // px on top of px-4
                        const isSub = lvl > 2;
                        return (
                          <li key={item.id}>
                            <button
                              onClick={() => { onNavigate(idx, item.id); setOpen(false); }}
                              style={{ paddingLeft: 16 + extraIndent }}
                              className={`flex w-full items-center gap-3 pr-4 py-2.5 text-left transition-colors ${
                                active
                                  ? 'bg-[#008000]/10 text-[#008000]'
                                  : `${isSub ? 'text-[var(--color-fg-soft)]/80' : 'text-[var(--color-fg-soft)]'} hover:bg-[var(--glass-border)]/30 hover:text-[var(--color-fg)]`
                              }`}
                            >
                              <span className={`flex flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                                isSub ? 'h-4 w-4' : 'h-5 w-5'
                              } ${
                                active ? 'bg-[#008000] text-white' : 'bg-[var(--glass-border)] text-[var(--color-fg-soft)]'
                              }`}>
                                {/* H3/H4 get a dot, H2 keeps the section number */}
                                {isSub ? '•' : (idx + 1)}
                              </span>
                              <span className={`flex-1 truncate ${isSub ? 'text-[12.5px]' : 'text-sm'} leading-snug ${active ? 'font-semibold' : ''}`}>
                                {item.title}
                              </span>
                              {active && <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#008000]" />}
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── main component ─── */
export function PostView({ slug }) {
  const [post, setPost]           = useState(null);
  const [loaded, setLoaded]       = useState(false);
  const [related, setRelated]     = useState([]);
  const [progress, setProgress]   = useState(0);
  const [showTop, setShowTop]     = useState(false);
  const [saved, setSaved]         = useState(false);
  const [activeToc, setActiveToc]       = useState(0);
  const [tocOpen, setTocOpen]           = useState(false);
  const [tocExpanded, setTocExpanded]   = useState(false);
  const [tocBarVisible, setTocBarVisible] = useState(false);
  const [audioWordIdx, setAudioWordIdx] = useState(-1);
  const [audioWord, setAudioWord]       = useState('');
  /* Listening language + translation cache live up here so the audio
     player, the table of contents AND the rendered article body can all
     render in the same translated language. Caches are keyed by audio-lang
     and reset when the post changes. */
  const [audioLang, setAudioLang] = useState('en-US');
  const [translatedBodies, setTranslatedBodies] = useState({}); // { lang: audio text }
  const [translatedTocs, setTranslatedTocs]     = useState({}); // { lang: ToC[] }
  const [translatedHtmls, setTranslatedHtmls]   = useState({}); // { lang: rendered HTML }
  const [translating, setTranslating]           = useState(false);
  const [translateErr, setTranslateErr]         = useState(null);
  const translateAbortRef = useRef(null);
  const paraRefs      = useRef([]);
  const tocCardRef    = useRef(null);
  const articleBodyRef = useRef(null);

  /* load */
  useEffect(() => {
    let cancelled = false;
    db.posts.get(slug)
      .then(async (p) => {
        if (cancelled) return;
        setPost(p);
        setLoaded(true);
        if (p) {
          try {
            const saved = JSON.parse(localStorage.getItem('wu_saved') || '[]');
            setSaved(saved.includes(slug));
          } catch { /* ignore */ }
          try {
            const all = await db.posts.listByCategory(p.category);
            if (!cancelled) setRelated(all.filter((r) => r.slug !== slug).slice(0, 3));
          } catch { /* ignore */ }
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [slug]);

  /* Reset the translation caches whenever the post changes. */
  useEffect(() => {
    setTranslatedBodies({});
    setTranslatedTocs({});
    setTranslatedHtmls({});
    setTranslateErr(null);
    translateAbortRef.current?.abort();
    return () => translateAbortRef.current?.abort();
  }, [post?.id]);

  /* view ping — fire once per (slug × session) after a 5s dwell, so accidental
     clicks don't inflate counts. Persists in sessionStorage so a refresh
     within the same tab session doesn't double-count. */
  useEffect(() => {
    if (!post?.id && !slug) return undefined;
    const key = `wu_viewed:${slug}`;
    if (typeof window === 'undefined') return undefined;
    if (sessionStorage.getItem(key)) return undefined;

    let sessionId = sessionStorage.getItem('wu_session_id');
    if (!sessionId) {
      sessionId = (crypto.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem('wu_session_id', sessionId);
    }

    const t = setTimeout(() => {
      sessionStorage.setItem(key, '1');
      fetch('/api/posts/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, postId: post?.id || null, sessionId }),
        keepalive: true,
      }).catch(() => { /* swallow */ });
    }, 5000);

    return () => clearTimeout(t);
  }, [slug, post?.id]);

  /* scroll progress — measured against the article body only, not the whole page */
  useEffect(() => {
    const fn = () => {
      const el = document.documentElement;
      setShowTop(el.scrollTop > 500);
      if (!articleBodyRef.current) return;
      const rect    = articleBodyRef.current.getBoundingClientRect();
      const artTop  = rect.top + el.scrollTop;   // absolute offset from doc top
      const artH    = rect.height;
      const viewH   = el.clientHeight;
      const navH    = 64;
      // 0% = article top just entered below the navbar
      // 100% = article bottom has scrolled to the navbar line
      const scrolledIn = el.scrollTop - (artTop - navH);
      const range      = Math.max(1, artH - (viewH - navH));
      setProgress(Math.min(100, Math.max(0, (scrolledIn / range) * 100)));
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* sticky TOC bar: fires the instant the card's bottom crosses the navbar */
  useEffect(() => {
    if (!loaded) return;
    const card = tocCardRef.current;
    if (!card) return;
    let hasBeenVisible = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) hasBeenVisible = true;
        setTocBarVisible(hasBeenVisible && !entry.isIntersecting);
      },
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [loaded]);

  /* active TOC — finds the heading nearest the upper-third of the
     viewport using the injected IDs on h1/h2/h3/h4 inside the rendered
     article body. Picking the upper third (rather than the centre)
     lines up with how readers actually read: the heading they're
     reading under sits near the top of the screen, not the middle. */
  useEffect(() => {
    if (!loaded || !post) return undefined;
    const fn = () => {
      const root = articleBodyRef.current;
      if (!root) return;
      const headings = root.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');
      if (headings.length === 0) return;
      const target = window.innerHeight * 0.33;
      let best = 0, bestDist = Infinity;
      headings.forEach((el, i) => {
        const top = el.getBoundingClientRect().top;
        // Prefer the last heading whose top has scrolled above the target
        // line; if none has, fall back to the first heading by absolute
        // distance. This avoids the "active flickers backward" issue when
        // a sub-heading lives just below the section's H2.
        const d = top <= target ? target - top : (top - target) * 2;
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setActiveToc(best);
    };
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [loaded, post]);

  /* auto-scroll to keep highlighted word in view */
  useEffect(() => {
    if (audioWordIdx < 0) return;
    const el = document.querySelector('[data-audio-word="true"]');
    if (!el) return;
    const { top, bottom } = el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (top < vh * 0.2 || bottom > vh * 0.8) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [audioWordIdx]);

  const toggleSave = () => {
    try {
      const list = JSON.parse(localStorage.getItem('wu_saved') || '[]');
      const next = saved ? list.filter((s) => s !== slug) : [...list, slug];
      localStorage.setItem('wu_saved', JSON.stringify(next));
      setSaved(!saved);
    } catch { /* ignore */ }
  };

  if (!loaded) {
    return <div className="flex min-h-[60vh] items-center justify-center"><p className="text-sm text-[var(--color-fg-soft)]">Loading post…</p></div>;
  }

  if (!post) {
    return (
      <section className="py-32">
        <Container>
          <GlassPanel className="mx-auto max-w-2xl p-12 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-primary)]">404</p>
            <h1 className="font-display text-4xl font-black text-[var(--color-fg)] sm:text-5xl">Post not found</h1>
            <p className="mt-4 text-[var(--color-fg-soft)]">The post you're looking for doesn't exist or was removed.</p>
            <Link href="/posts" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[var(--color-primary)]/30 hover:bg-[var(--color-primary-deep)]">
              <ArrowLeft className="h-4 w-4" /> Back to posts
            </Link>
          </GlassPanel>
        </Container>
      </section>
    );
  }

  const palette    = post.coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' };
  /* HTML pipeline: editor saves Tiptap HTML; we sanitize + inject heading
     IDs (for the TOC) and render with dangerouslySetInnerHTML. The flat
     text we strip from the HTML is what feeds the audio player and the
     reading-time / word-count math. */
  const safeHtml = sanitizeBodyHtml(bodyToHtml(post.body));
  const { html: bodyHtml, toc: headingToc } = injectHeadingIdsAndBuildToc(safeHtml);
  const bodyText = stripHtml(safeHtml);
  const mins     = readingMins(bodyText);
  const baseToc  = headingToc.length > 0 ? headingToc : buildTocFromText(bodyText);

  /* Translation orchestration. The translate-API prompt preserves HTML
     tags exactly, so we send the sanitized body HTML plus the title in
     parallel and derive everything else from the result:
       - body display  ← translated HTML (tags preserved)
       - TOC titles    ← re-extract from translated HTML (anchors unchanged)
       - audio text    ← stripped translated HTML, prefixed with translated title
     Cached per audio-lang so toggling back is instant. */
  const targetLanguageName = TRANSLATE_TARGET_BY_AUDIO_LANG[audioLang] || null;
  const translatedBody     = translatedBodies[audioLang] || null;
  const translatedTocItems = translatedTocs[audioLang] || null;
  const translatedHtmlOut  = translatedHtmls[audioLang] || null;
  // The body the reader actually sees: translated HTML when available,
  // original sanitized HTML otherwise.
  const displayBodyHtml = translatedHtmlOut || bodyHtml;
  // Show translated TOC titles when available; anchors stay the same so
  // clicks still scroll to the headings in the rendered article body.
  const toc = translatedTocItems || baseToc;

  const handleTranslate = async () => {
    if (!targetLanguageName || translating) return null;
    if (translatedBody) return translatedBody;
    if (!safeHtml) return null;

    translateAbortRef.current?.abort();
    translateAbortRef.current = new AbortController();
    const { signal } = translateAbortRef.current;

    setTranslating(true);
    setTranslateErr(null);
    try {
      const [translatedHtmlRaw, translatedTitleText] = await Promise.all([
        translateText(safeHtml, targetLanguageName, signal),
        post?.title
          ? translateText(post.title, targetLanguageName, signal)
          : Promise.resolve(''),
      ]);
      if (!translatedHtmlRaw) throw new Error('Empty translation');

      // Re-inject heading IDs and pull a TOC out of the translated HTML.
      // IDs are deterministic (post-h-N) so links from the original-language
      // TOC still resolve once we swap the body in.
      const { html: bodyHtmlOut, toc: tocOut } = injectHeadingIdsAndBuildToc(translatedHtmlRaw);
      const tocItems = tocOut.length > 0 ? tocOut : baseToc;

      const stripped = stripHtml(bodyHtmlOut);
      const audioFullText = [translatedTitleText || post.title, stripped]
        .filter(Boolean)
        .join('. ');

      setTranslatedBodies((prev) => ({ ...prev, [audioLang]: audioFullText }));
      setTranslatedTocs((prev) => ({ ...prev, [audioLang]: tocItems }));
      setTranslatedHtmls((prev) => ({ ...prev, [audioLang]: bodyHtmlOut }));
      return audioFullText;
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setTranslateErr(e.message || 'Translation failed.');
      }
      return null;
    } finally {
      setTranslating(false);
    }
  };

  const handleAudioLangChange = (next) => {
    setAudioLang(next);
    setTranslateErr(null);
  };

  /* Audio player tells us which word is being spoken; we render it in a
     floating chip so readers can follow along regardless of language. */
  const handleWordChange = (idx, word) => {
    setAudioWordIdx(idx);
    setAudioWord(typeof word === 'string' ? word : '');
  };

  return (
    <article>
      {/* Progress bar */}
      <div aria-hidden className="fixed left-0 top-0 z-[60] h-1 origin-left bg-[#008000] transition-[width] duration-100" style={{ width: `${progress}%` }} />

      {/* ── Hero ── */}
      <header className="relative -mt-16 flex h-[88vh] min-h-[640px] items-end overflow-hidden">
        {/* background: cover image or palette gradient */}
        <div aria-hidden className="absolute inset-0"
          style={{ background: post.cover ? undefined : `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 55%, ${palette.to} 100%)` }}
        >
          <CoverMedia cover={post.cover} title={post.title} className="h-full" />
        </div>

        {/* gradient fade — white in light mode, dark in dark mode */}
        <div aria-hidden className="absolute inset-0 dark-overlay" />

        <Container className="relative z-10 pb-14 pt-20 sm:pb-16 sm:pt-24">

          {/* ── Back button ── */}
          <Link
            href={post.label ? `/${post.category}/${labelSlug(post.label)}` : `/${post.category}`}
            className="group mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm font-medium text-[var(--color-fg)] backdrop-blur-md transition-all duration-200 hover:border-[#008000]/40 hover:text-[#008000] active:scale-[0.97]"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to {post.label || categoryName(post.category)}
          </Link>

          {/* ── Category / label badges ── */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#008000] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_12px_rgba(0,128,0,0.40)]">
              {categoryName(post.category)}{post.label ? ` · ${post.label}` : ''}
            </span>
            {post.featured && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37]/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1a1208] shadow-[0_2px_12px_rgba(212,175,55,0.35)]">
                <Star className="h-3 w-3" /> Featured
              </span>
            )}
          </div>

          {/* ── Title ── */}
          <h1 className="font-display text-3xl font-black leading-[1.05] hero-text-title text-balance sm:text-4xl md:text-5xl lg:text-6xl">
            {post.title}
          </h1>

          {/* ── Meta chips ── */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-fg)] backdrop-blur-sm transition-all duration-200 hover:border-[#008000]/35 hover:text-[#008000]">
              <User className="h-3.5 w-3.5 text-[#008000]" />
              Wildlife Universe
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-fg)] backdrop-blur-sm transition-all duration-200 hover:border-[#008000]/35 hover:text-[#008000]">
              <Clock className="h-3.5 w-3.5 text-[#008000]" />
              {mins} min read
            </span>
            {post.createdAt && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-fg)] backdrop-blur-sm transition-all duration-200 hover:border-[#008000]/35 hover:text-[#008000]">
                <Calendar className="h-3.5 w-3.5 text-[#008000]" />
                {formatDate(post.createdAt)}
              </span>
            )}
            {post.views > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-fg)] backdrop-blur-sm transition-all duration-200 hover:border-[#008000]/35 hover:text-[#008000]">
                <Eye className="h-3.5 w-3.5 text-[#008000]" />
                {post.views.toLocaleString()} views
              </span>
            )}
          </div>

          {/* ── Save + Share ── */}
          <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={toggleSave}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-md transition-all duration-200 active:scale-[0.97] ${
                saved
                  ? 'border-[#008000]/50 bg-[#008000]/15 text-[#008000] shadow-[0_2px_12px_rgba(0,128,0,0.20)] hover:bg-[#008000]/25'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-fg)] hover:border-[#008000]/40 hover:text-[#008000]'
              }`}
            >
              {saved
                ? <BookmarkCheck className="h-4 w-4 text-[#008000]" />
                : <Bookmark className="h-4 w-4" />}
              {saved ? 'Saved' : 'Save'}
            </button>
            <SocialShareRow title={post.title} slug={post.slug} />
          </div>
        </Container>

        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 gradient-fade-down" />
      </header>

      {/* ── Body ── */}
      <section className="py-8 sm:py-14">
        {/* Mobile: full-width edge-to-edge so the article + TOC + audio
            player can fill the screen. Tablet+: the standard 90/85% gutter. */}
        <div className="mx-auto w-full max-w-[1560px] sm:w-[90%] lg:w-[85%]">
          <div className="grid grid-cols-1 gap-3 sm:gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">

            {/* ── TOC sidebar — desktop only ── */}
            <aside className="hidden lg:block">
              <div className="lg:sticky lg:top-24">
                {toc.length >= 2 && (
                  <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] p-4 transition-all duration-300 hover:border-[#d4af37]/30 hover:shadow-[0_8px_32px_rgba(212,175,55,0.10),0_2px_12px_rgba(0,128,0,0.06)] sm:p-5">
                    <button
                      onClick={() => setTocOpen((v) => !v)}
                      className="flex w-full items-center justify-between text-sm font-bold text-[var(--color-fg)] lg:cursor-default"
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-1 rounded-full bg-[#008000]" />
                        Table of Contents
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform lg:hidden ${tocOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <ol className={`mt-3 flex flex-col gap-0.5 lg:flex ${tocOpen ? 'flex' : 'hidden'}`}>
                      {toc.map((item, idx) => {
                        // Indent + de-emphasise sub-headings so readers can
                        // see article structure at a glance. H2 is baseline,
                        // H3/H4 step in by 12px / 24px and lose a notch of
                        // weight + size.
                        const lvl = Math.max(2, Math.min(4, item.level || 2));
                        const indent = (lvl - 2) * 12;
                        const fontSize = lvl === 2 ? 'text-sm' : lvl === 3 ? 'text-[12.5px]' : 'text-xs';
                        return (
                          <li key={item.id}>
                            <button
                              onClick={() => { document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveToc(idx); }}
                              style={{ paddingLeft: 12 + indent }}
                              className={`w-full rounded-lg pr-3 py-2 text-left ${fontSize} leading-snug transition-colors ${
                                activeToc === idx
                                  ? 'border-l-2 border-[#008000] bg-[#008000]/10 font-medium text-[#008000]'
                                  : `${lvl > 2 ? 'text-[var(--color-fg-soft)]/85' : 'text-[var(--color-fg-soft)]'} hover:text-[var(--color-fg)]`
                              }`}
                            >
                              {item.title}
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
            </aside>

            {/* ── Main content column ── */}
            <div className="flex min-w-0 flex-col gap-6">

              {/* Audio player — has its own card already.
                  Pass the stripped plain-text so the synthesizer doesn't
                  read tag names aloud. The audio player is controlled by
                  PostView so the TOC can render in the same translated
                  language as the audio. */}
              <ArticleAudioPlayer
                title={post.title}
                body={bodyText}
                lang={audioLang}
                onLangChange={handleAudioLangChange}
                translatedText={translatedBody}
                translating={translating}
                translateErr={translateErr}
                onTranslate={handleTranslate}
                onWordChange={handleWordChange}
              />

              {/* ── Inline TOC — collapsed by default, expands on tap ── */}
              {toc.length >= 2 && (
                <div
                  ref={tocCardRef}
                  className="overflow-hidden border-y border-x-0 sm:rounded-2xl sm:border bg-[var(--color-bg-deep)] border-[var(--glass-border)] transition-colors duration-300 hover:border-[#008000]/25"
                >
                  {/* Header — always visible */}
                  <button
                    onClick={() => setTocExpanded((v) => !v)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                    aria-expanded={tocExpanded}
                  >
                    <span className="flex items-center gap-2.5 text-sm font-bold text-[var(--color-fg)]">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#008000]/10 text-[#008000]">
                        <List className="h-4 w-4" />
                      </span>
                      Table of Contents
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-[var(--glass-border)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-fg-soft)]">
                        {toc.length}
                      </span>
                      <ChevronDown className={`h-4 w-4 flex-shrink-0 text-[var(--color-fg-soft)] transition-transform duration-200 ${tocExpanded ? 'rotate-180' : ''}`} />
                    </span>
                  </button>

                  {/* Expandable section list */}
                  <AnimatePresence initial={false}>
                    {tocExpanded && (
                      <motion.div
                        key="toc-list"
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <ol className="border-t border-[var(--glass-border)] py-2">
                          {toc.map((item, idx) => {
                            const active = activeToc === idx;
                            return (
                              <li key={item.id}>
                                <button
                                  onClick={() => {
                                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    setActiveToc(idx);
                                  }}
                                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors sm:px-5 ${
                                    active
                                      ? 'bg-[#008000]/8 text-[#008000]'
                                      : 'text-[var(--color-fg-soft)] hover:bg-[var(--glass-border)]/40 hover:text-[var(--color-fg)]'
                                  }`}
                                >
                                  <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                                    active ? 'bg-[#008000] text-white' : 'bg-[var(--glass-border)] text-[var(--color-fg-soft)]'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <span className={`flex-1 leading-snug ${active ? 'font-semibold' : ''}`}>{item.title}</span>
                                  {active && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#008000]" />}
                                </button>
                              </li>
                            );
                          })}
                        </ol>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Article body — its own card.
                  Renders the editor's Tiptap HTML directly so paragraphs,
                  headings, lists, links, embeds, and inline formatting
                  display correctly instead of as literal "<p>" text. The
                  HTML has already been sanitized (XSS-safe) and had stable
                  IDs injected onto headings to power the TOC. */}
              <div ref={articleBodyRef} className="border-y border-x-0 sm:rounded-2xl sm:border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-4 py-6 transition-all duration-500 hover:border-[#d4af37]/25 sm:px-8 sm:py-8 sm:hover:shadow-[0_20px_56px_rgba(0,0,0,0.08),0_4px_20px_rgba(212,175,55,0.10),0_2px_8px_rgba(0,128,0,0.05)]">
                {bodyText ? (
                  <div
                    className="post-body"
                    dangerouslySetInnerHTML={{ __html: displayBodyHtml }}
                  />
                ) : (
                  <p className="text-base text-[var(--color-fg-soft)]">No body content yet — the CEO can add a body in the admin panel.</p>
                )}
              </div>

              {/* Tags — its own card */}
              <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-5 py-4 transition-all duration-300 hover:border-[#d4af37]/25 hover:shadow-[0_8px_28px_rgba(212,175,55,0.08),0_2px_8px_rgba(0,128,0,0.05)]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-fg-soft)]">Tags</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/${post.category}`} className="rounded-full border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-fg)] transition-colors hover:border-[#d4af37]/40 hover:bg-[var(--color-bg-deep)]">
                    {categoryName(post.category)}
                  </Link>
                  {post.label && (
                    <span className="rounded-full bg-[#008000]/15 px-3 py-1 text-xs font-medium text-[#008000]">{post.label}</span>
                  )}
                </div>
              </div>

              {/* Reactions + Comments */}
              <ArticleReactions slug={post.slug} />

            </div>
          </div>
        </div>
      </section>

      {/* ── Related posts — its own card ── */}
      {related.length > 0 && (
        <section className="pb-10 sm:pb-14">
          <Container>
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] p-5 transition-all duration-500 hover:border-[#d4af37]/25 hover:shadow-[0_20px_56px_rgba(0,0,0,0.08),0_4px_20px_rgba(212,175,55,0.10)] sm:p-8">
              <h2 className="font-display mb-6 text-xl font-black text-[var(--color-fg)] sm:mb-8 sm:text-3xl">More in {categoryName(post.category)}</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {related.map((r) => <PostCard key={r.id} post={r} />)}
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* ── All-label sections (recommended by label) ── */}
      <section className="bg-[var(--color-bg-deep)] py-4">
        <Container>
          <PostLabelSections post={post} />
        </Container>
      </section>

      {/* ── Reading indicator: floats above the back-to-top button while
              the audio player is speaking and shows the current word being
              read, in whatever language playback is in. */}
      {audioWord && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 max-w-[90vw] sm:bottom-24"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-[#008000]/40 bg-[var(--color-bg-deep)]/95 px-4 py-2 shadow-2xl shadow-black/30 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#008000] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#008000]" />
            </span>
            <span className="truncate text-sm font-semibold text-[#008000]">
              {audioWord}
            </span>
          </div>
        </div>
      )}

      {/* ── Fixed mobile TOC bar — appears after scrolling into article ── */}
      <MobileTocBar
        toc={toc}
        activeToc={activeToc}
        progress={progress}
        visible={tocBarVisible}
        onNavigate={(idx, id) => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveToc(idx);
        }}
      />

      {/* Back to top */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="fixed bottom-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#008000] text-white shadow-lg shadow-[#008000]/30 transition-all hover:scale-110 hover:bg-[#006400] sm:bottom-8 sm:right-8 sm:h-11 sm:w-11"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </article>
  );
}

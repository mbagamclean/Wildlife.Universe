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
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PostCard } from './PostCard';
import { ArticleAudioPlayer } from './ArticleAudioPlayer';
import { ArticleReactions } from './ArticleReactions';
import { PostLabelSections } from './PostLabelSections';
import { categories, labelSlug } from '@/lib/mock/categories';

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
/* Split body into sections for TOC + rendering.
   Priority 1: natural double-newline paragraph breaks.
   Priority 2: sentence-boundary split (period/!/? + space + capital letter).
   This ensures even single-paragraph posts with 2+ sentences get sections. */
function splitIntoSections(body) {
  if (!body) return [];
  const byPara = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (byPara.length >= 2) return byPara;
  // Split at sentence boundaries: end-punctuation + whitespace + capital/digit
  const sentences = body
    .replace(/([.!?])\s+([A-Z0-9"'])/g, '$1\n$2')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length < 2) return [body.trim()];
  // Group into at most 6 sections (1-2 sentences each)
  const perSection = Math.max(1, Math.ceil(sentences.length / 6));
  const sections = [];
  for (let i = 0; i < sentences.length; i += perSection) {
    sections.push(sentences.slice(i, i + perSection).join(' '));
  }
  return sections;
}

/* Build TOC from sections. Uses the first complete sentence of each section
   as the heading title — much more readable than arbitrary word snippets. */
function buildToc(paragraphs) {
  if (paragraphs.length < 2) return [];
  const step = Math.max(1, Math.floor(paragraphs.length / 7));
  const items = [];
  for (let i = 0; i < paragraphs.length && items.length < 7; i += step) {
    const raw = paragraphs[i].replace(/\s+/g, ' ').trim();
    const dot = raw.search(/[.!?]/);
    const full = dot > 8 ? raw.slice(0, dot + 1) : raw;
    const title = full.length > 72 ? `${full.slice(0, 69)}…` : full;
    items.push({ id: `para-${i}`, title, paraIndex: i });
  }
  return items;
}

/* ─── social share icons (inline SVG) ─── */
const SOCIALS = [
  {
    name: 'WhatsApp', bg: '#25D366',
    href: (u, t) => `https://api.whatsapp.com/send?text=${encodeURIComponent(t + ' ' + u)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>,
  },
  {
    name: 'Facebook', bg: '#1877F2',
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  {
    name: 'Telegram', bg: '#26A5E4',
    href: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
  },
  {
    name: 'X', bg: '#000000',
    href: (u, t) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  {
    name: 'Threads', bg: '#000000',
    href: (u, t) => `https://www.threads.net/intent/post?text=${encodeURIComponent(t + ' ' + u)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.688-1.685-1.749-1.752-2.979-.065-1.185.43-2.278 1.394-3.079.906-.754 2.188-1.168 3.608-1.168.442 0 .89.033 1.33.1.043-.292.063-.593.063-.9 0-1.077-.563-1.625-1.675-1.63-1.035-.004-1.846.46-2.258 1.263l-1.844-.836C8.397 5.01 10.073 4.13 12.11 4.13c2.515 0 4.053 1.37 4.11 3.65l.002.056-.002.056c0 .588-.064 1.152-.19 1.676.338.165.657.35.956.554.844.577 1.443 1.332 1.777 2.245.576 1.583.552 3.876-1.177 5.562-1.768 1.726-3.968 2.595-6.925 2.615l-.475.002zm-.28-9.963c-.914 0-1.743.198-2.333.55-.446.27-.701.618-.683 1.008.028.533.345.96.893 1.266.578.327 1.316.47 2.013.433 1.005-.054 1.798-.434 2.362-1.127.412-.513.682-1.185.795-2.006-.69-.08-1.395-.124-2.047-.124z"/></svg>,
  },
  {
    name: 'Instagram', bg: '#E4405F',
    href: (u) => `https://www.instagram.com/`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  },
  {
    name: 'Blogger', bg: '#FF5722',
    href: (u, t) => `https://www.blogger.com/blog-this.g?u=${encodeURIComponent(u)}&n=${encodeURIComponent(t)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M21.976 24H2.026C.9 24 0 23.1 0 21.976V2.026C0 .9.9 0 2.026 0h19.95C23.1 0 24 .9 24 2.026v19.95C24 23.1 23.1 24 21.976 24zM11.5 6.5H8.94C7.622 6.5 6.5 7.603 6.5 8.94v6.12c0 1.337 1.103 2.44 2.44 2.44h6.12c1.337 0 2.44-1.103 2.44-2.44V13.3c0-.547-.44-.988-.988-.988s-.988.441-.988.988v1.76c0 .256-.208.463-.463.463H8.94a.463.463 0 01-.463-.463V8.94c0-.256.208-.463.463-.463H11.5c.547 0 .988-.44.988-.988S12.047 6.5 11.5 6.5zm5.963 2.2a.888.888 0 00-.888-.888H14.9a.888.888 0 100 1.776h1.675c.49 0 .888-.397.888-.888zm-4.288.131H9.788a.756.756 0 100 1.512h3.387a.756.756 0 100-1.512zm0 2.7H9.788a.756.756 0 100 1.512h3.387a.756.756 0 100-1.512z"/></svg>,
  },
  {
    name: 'Pinterest', bg: '#E60023',
    href: (u, t) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}&description=${encodeURIComponent(t)}`,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>,
  },
];

function SocialIcon({ social, url, title }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={social.href(url, title)}
      target="_blank"
      rel="noopener noreferrer"
      title={social.name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
      style={hovered
        ? { backgroundColor: social.bg, color: '#fff', boxShadow: `0 4px 14px ${social.bg}66`, border: '1px solid transparent' }
        : { backgroundColor: 'var(--glass-bg)', color: 'var(--color-fg-soft)', border: '1px solid var(--glass-border)' }
      }
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
  if (typeof cover === 'string')
    return <img src={cover} alt={title} className={`w-full object-cover ${className}`} />;
  if (cover.type === 'video')
    return (
      <video className={`w-full object-cover ${className}`} controls muted playsInline>
        {cover.sources?.map((s, i) => <source key={i} src={s.src} type={s.type} />)}
      </video>
    );
  return (
    <picture>
      {(cover.sources || []).slice(0, -1).map((s, i) => <source key={i} srcSet={s.src} type={s.type} />)}
      <img
        src={cover.sources?.[Math.max(0, (cover.sources?.length || 1) - 1)]?.src || ''}
        alt={title}
        className={`w-full object-cover ${className}`}
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
    <div className="fixed left-0 right-0 top-16 z-40 lg:hidden">
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

            {/* main bar */}
            <div className="border-b border-[var(--glass-border)] bg-[var(--color-bg-deep)]/96 shadow-lg backdrop-blur-xl">
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
                        return (
                          <li key={item.id}>
                            <button
                              onClick={() => { onNavigate(idx, item.id); setOpen(false); }}
                              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                active
                                  ? 'bg-[#008000]/10 text-[#008000]'
                                  : 'text-[var(--color-fg-soft)] hover:bg-[var(--glass-border)]/30 hover:text-[var(--color-fg)]'
                              }`}
                            >
                              <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                                active ? 'bg-[#008000] text-white' : 'bg-[var(--glass-border)] text-[var(--color-fg-soft)]'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className={`flex-1 truncate text-sm leading-snug ${active ? 'font-semibold' : ''}`}>
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

  /* active TOC */
  useEffect(() => {
    if (!paraRefs.current.length) return;
    const fn = () => {
      const mid = window.innerHeight / 2;
      let best = 0, bestDist = Infinity;
      paraRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = Math.abs(el.getBoundingClientRect().top - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setActiveToc(best);
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [loaded]);

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
  const paragraphs = splitIntoSections(post.body || '');
  const mins       = readingMins(post.body);
  const toc        = buildToc(paragraphs);
  const firstPart  = paragraphs.slice(0, 3);

  /* word offsets: fullText = title + '. ' + body, so body starts after title words */
  const titleWordCount = (post.title || '').split(/\s+/).filter(Boolean).length;
  let _wOff = titleWordCount;
  const paraWordStarts = paragraphs.map((para) => {
    const start = _wOff;
    _wOff += para.split(/\s+/).filter(Boolean).length;
    return start;
  });
  const restPart   = paragraphs.slice(3);

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
        <Container>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">

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
                      {toc.map((item, idx) => (
                        <li key={item.id}>
                          <button
                            onClick={() => { document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveToc(idx); }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm leading-snug transition-colors ${
                              activeToc === idx
                                ? 'border-l-2 border-[#008000] bg-[#008000]/10 font-medium text-[#008000] pl-2'
                                : 'text-[var(--color-fg-soft)] hover:text-[var(--color-fg)]'
                            }`}
                          >
                            {item.title}
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </aside>

            {/* ── Main content column ── */}
            <div className="flex min-w-0 flex-col gap-6">

              {/* Audio player — has its own card already */}
              <ArticleAudioPlayer title={post.title} body={post.body} onWordChange={setAudioWordIdx} />

              {/* ── Inline TOC — collapsed by default, expands on tap ── */}
              {toc.length >= 2 && (
                <div
                  ref={tocCardRef}
                  className="overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] transition-colors duration-300 hover:border-[#008000]/25"
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

              {/* Article body — its own card */}
              <div ref={articleBodyRef} className="rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] p-5 transition-all duration-500 hover:border-[#d4af37]/25 hover:shadow-[0_20px_56px_rgba(0,0,0,0.08),0_4px_20px_rgba(212,175,55,0.10),0_2px_8px_rgba(0,128,0,0.05)] sm:p-8">
                <div className="flex flex-col gap-5 text-base leading-relaxed text-[var(--color-fg)] sm:gap-6 sm:text-lg">
                  {firstPart.map((para, i) => {
                    const tocIdx = toc.findIndex((t) => t.paraIndex === i);
                    return (
                      <p key={i} id={`para-${i}`}
                        ref={(el) => { if (tocIdx !== -1) paraRefs.current[tocIdx] = el; }}
                        className="scroll-mt-28"
                      >{renderWords(para, paraWordStarts[i], audioWordIdx)}</p>
                    );
                  })}

                  {post.cover && restPart.length > 0 && (
                    <figure className="my-2 overflow-hidden rounded-xl sm:rounded-2xl">
                      <CoverMedia cover={post.cover} title={post.title} className="max-h-[280px] rounded-xl sm:max-h-[480px] sm:rounded-2xl" />
                      <figcaption className="mt-2 text-center text-xs text-[var(--color-fg-soft)] sm:text-sm">{post.title}</figcaption>
                    </figure>
                  )}

                  {restPart.map((para, i) => {
                    const realIdx = i + 3;
                    const tocIdx  = toc.findIndex((t) => t.paraIndex === realIdx);
                    return (
                      <p key={realIdx} id={`para-${realIdx}`}
                        ref={(el) => { if (tocIdx !== -1) paraRefs.current[tocIdx] = el; }}
                        className="scroll-mt-28"
                      >{renderWords(para, paraWordStarts[realIdx], audioWordIdx)}</p>
                    );
                  })}

                  {paragraphs.length === 0 && (
                    <p className="text-base text-[var(--color-fg-soft)]">No body content yet — the CEO can add a body in the admin panel.</p>
                  )}
                </div>
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
        </Container>
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

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  X,
  Clapperboard,
  Volume2,
  VolumeX,
  Heart,
  Share2,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';
import { VideoPlayer } from '@/components/ui/VideoPlayer';

// ── helpers ───────────────────────────────────────────────────────────────────

const HTML5_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;

function isHtml5Url(url) {
  if (!url || typeof url !== 'string') return false;
  if (HTML5_EXT.test(url)) return true;
  // Supabase public storage urls won't always have extensions in the path
  // (signed urls etc.), but the static-asset shape usually does.
  return false;
}

function isEmbedUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|instagram\.com|facebook\.com|twitter\.com|x\.com/.test(url);
}

function isVideoCover(cover) {
  return cover && typeof cover === 'object' && cover.type === 'video' && Array.isArray(cover.sources) && cover.sources.length > 0;
}

function pickPosterFromCover(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  if (cover.poster) {
    if (typeof cover.poster === 'string') return cover.poster;
    if (cover.poster.sources?.length) return cover.poster.sources[cover.poster.sources.length - 1]?.src || null;
  }
  return null;
}

/**
 * Normalise homepage_videos rows (preferred source for curated shorts) and
 * post rows (fallback when an admin uploaded a vertical video as a post
 * cover) into a single shape the viewer can consume.
 */
function normaliseSources(rows = []) {
  const out = [];
  for (const r of rows) {
    if (!r) continue;
    // homepage_videos shape: { id, title, description, thumbnail, sourceUrl, sourceType }
    if (r.sourceUrl) {
      const url = String(r.sourceUrl).trim();
      if (!url) continue;
      const html5 = isHtml5Url(url);
      const embed = !html5 && isEmbedUrl(url);
      // If it's neither a recognised embed nor a recognised file extension we
      // still pass it to VideoPlayer (which will treat it as html5 by default).
      out.push({
        id: r.id,
        title: r.title || 'Wildlife short',
        excerpt: r.description || '',
        slug: r.postSlug || null,
        poster: r.thumbnail || null,
        kind: html5 ? 'html5' : (embed ? 'embed' : 'html5'),
        sources: html5 ? [{ src: url, type: 'video/mp4' }] : null,
        embedUrl: !html5 ? url : null,
      });
      continue;
    }
    // post shape (cover.type==='video' fallback)
    if (isVideoCover(r.cover)) {
      out.push({
        id: r.id,
        title: r.title || 'Wildlife short',
        excerpt: r.excerpt || r.description || '',
        slug: r.slug || null,
        poster: pickPosterFromCover(r.cover),
        kind: 'html5',
        sources: r.cover.sources.filter((s) => s?.src),
        embedUrl: null,
      });
    }
  }
  return out;
}

// ── ShortsSection ────────────────────────────────────────────────────────────

/**
 * Carousel of vertical short-form videos plus an Instagram-style modal viewer.
 *
 * Default data source is the curated homepage_videos table (admin-managed via
 * /admin/configuration/homepage-videos with section='shorts'). If that table
 * has no rows for the requested section, we fall back to recent posts that
 * have a vertical video cover so the section never goes empty when there's
 * organic content.
 */
export function ShortsSection({
  section = 'shorts',
  heading = 'Wildlife Universe Shorts',
  subheading = 'Watch quick, immersive wildlife moments.',
  maxItems = 12,
  fallbackToPosts = true,
} = {}) {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);
  const trackRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let curated = [];
      try {
        curated = await db.homepageVideos.list({ section });
      } catch {
        curated = [];
      }
      let normalised = normaliseSources(curated).slice(0, maxItems);
      if (normalised.length === 0 && fallbackToPosts) {
        try {
          const posts = await db.posts.list();
          const videoPosts = (posts || [])
            .filter((p) => p?.status !== 'draft' && isVideoCover(p.cover))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, maxItems);
          normalised = normaliseSources(videoPosts);
        } catch {
          // ignore — fall through with empty list
        }
      }
      if (!cancelled) {
        setShorts(normalised);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [section, maxItems, fallbackToPosts]);

  const openViewer = useCallback((i) => setActiveIndex(i), []);
  const closeViewer = useCallback(() => setActiveIndex(null), []);
  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i === null || i === 0 ? i : i - 1));
  }, []);
  const goNext = useCallback(() => {
    setActiveIndex((i) => (i === null || i >= shorts.length - 1 ? i : i + 1));
  }, [shorts.length]);

  // Lock body scroll while viewer is open
  useEffect(() => {
    if (activeIndex === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [activeIndex]);

  // Keyboard nav + close
  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeViewer();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeIndex, closeViewer, goNext, goPrev]);

  if (loading || shorts.length === 0) return null;

  return (
    <section className="relative py-16 md:py-24" style={{ background: 'var(--color-bg)' }}>
      <Container>
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <span className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-pink-500">
              <Clapperboard className="h-3.5 w-3.5" />
              Reels &amp; Shorts
            </span>
            <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-[var(--color-fg)] sm:text-4xl">
              {heading}
            </h2>
            <p className="mt-3 text-sm text-[var(--color-fg-soft)] sm:text-base">
              {subheading}
            </p>
          </div>
          <div className="hidden gap-3 md:flex">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => trackRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className="glass flex h-11 w-11 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5 text-[var(--color-fg)]" />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => trackRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className="glass flex h-11 w-11 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
            >
              <ChevronRight className="h-5 w-5 text-[var(--color-fg)]" />
            </button>
          </div>
        </div>

        {/* ── Carousel ── */}
        <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--color-bg)] to-transparent sm:w-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--color-bg)] to-transparent sm:w-20" />

          <ul
            ref={trackRef}
            className="wu-no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-8 pt-4"
          >
            {shorts.map((short, i) => (
              <li
                key={short.id}
                className="shrink-0 snap-center"
                style={{ width: 'clamp(180px, 50vw, 240px)' }}
              >
                <button
                  type="button"
                  onClick={() => openViewer(i)}
                  aria-label={`Play short: ${short.title}`}
                  className="group relative block aspect-[9/16] w-full overflow-hidden rounded-[1.5rem] shadow-lg transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  {short.poster ? (
                    <img
                      src={short.poster}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                      <Play className="ml-1 h-6 w-6 text-white" fill="white" />
                    </div>
                  </div>
                  <h3
                    className="absolute inset-x-0 bottom-0 line-clamp-2 p-4 text-left text-sm font-bold text-white md:text-base"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
                  >
                    {short.title}
                  </h3>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <AnimatePresence>
        {activeIndex !== null && (
          <ShortsViewer
            shorts={shorts}
            index={activeIndex}
            onClose={closeViewer}
            onPrev={goPrev}
            onNext={goNext}
            onSelect={setActiveIndex}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// ── ShortsViewer — full-screen modal ─────────────────────────────────────────

function ShortsViewer({ shorts, index, onClose, onPrev, onNext, onSelect }) {
  const short = shorts[index];
  const hasPrev = index > 0;
  const hasNext = index < shorts.length - 1;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Shorts viewer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl"
      style={{
        height: '100dvh',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Top bar — progress strip + close */}
      <div
        className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: '0.75rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <ProgressDots total={shorts.length} active={index} onSelect={onSelect} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close shorts viewer"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop prev/next chevrons (hidden < md) */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous short"
          className="absolute left-4 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:scale-110 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:flex"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next short"
          className="absolute right-4 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:scale-110 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:flex"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Stage — video frame fills available height; safe-area + top bar
          subtracted so chrome (mobile address bar, notches) never overlap. */}
      <div
        className="flex h-full w-full items-center justify-center px-3 pb-3 sm:px-6 sm:pb-6"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 4rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ShortFrame
          key={short.id}
          short={short}
          onPrev={hasPrev ? onPrev : null}
          onNext={hasNext ? onNext : null}
        />
      </div>
    </motion.div>
  );
}

function ProgressDots({ total, active, onSelect }) {
  return (
    <div className="flex flex-1 items-center gap-1.5 overflow-hidden" role="tablist" aria-label="Shorts progress">
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === active;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Go to short ${i + 1} of ${total}`}
            onClick={() => onSelect(i)}
            className={`h-1 flex-1 min-w-[6px] max-w-[40px] rounded-full transition-colors ${
              isActive ? 'bg-white' : 'bg-white/30 hover:bg-white/50'
            }`}
          />
        );
      })}
    </div>
  );
}

function ShortFrame({ short, onPrev, onNext }) {
  const isHtml5 = short?.kind === 'html5';

  // Swipe-to-nav gesture (works on mobile + with mouse drag)
  const handleDragEnd = (_, info) => {
    const dx = info.offset.x;
    const dy = info.offset.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 80 && onPrev) onPrev();
      else if (dx < -80 && onNext) onNext();
    } else {
      if (dy < -80 && onNext) onNext();
      else if (dy > 80 && onPrev) onPrev();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.18}
      onDragEnd={handleDragEnd}
      className="relative flex h-full w-full max-w-[min(100%,calc(100dvh*9/16))] items-stretch justify-center"
    >
      {isHtml5 ? <Html5VideoFrame short={short} /> : <EmbedVideoFrame short={short} />}
    </motion.div>
  );
}

function Html5VideoFrame({ short }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showCue, setShowCue] = useState(false);

  // Reset + autoplay on every short id change
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    setProgress(0);
    el.muted = true;
    setIsMuted(true);
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [short?.id]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().then(() => setIsPlaying(true)).catch(() => {});
    else { el.pause(); setIsPlaying(false); }
    setShowCue(true);
    setTimeout(() => setShowCue(false), 500);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };

  const onTimeUpdate = () => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    setProgress(el.currentTime / el.duration);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black shadow-[0_0_60px_rgba(0,0,0,0.5)] sm:rounded-3xl">
      <video
        ref={videoRef}
        poster={short?.poster || undefined}
        autoPlay
        muted
        playsInline
        loop
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onClick={togglePlay}
        className="h-full w-full bg-black object-contain"
      >
        {(short?.sources || []).map((s, i) => (
          <source key={i} src={s.src} type={s.type} />
        ))}
      </video>

      {/* Tap cue */}
      <AnimatePresence>
        {showCue && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
              {isPlaying ? (
                <Play className="ml-1 h-10 w-10 text-white" fill="white" />
              ) : (
                <Pause className="h-10 w-10 text-white" fill="white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProgressBar progress={progress} />
      <Caption short={short} />
      <ActionRail isMuted={isMuted} onToggleMute={toggleMute} />
    </div>
  );
}

function EmbedVideoFrame({ short }) {
  // For YT/Vimeo/TikTok/IG: hand off to VideoPlayer (Plyr/iframe) and let the
  // platform's own controls drive playback. We still overlay the caption +
  // close stays in the parent. Mute / Like buttons remain so the chrome is
  // visually consistent — Mute on embeds is a no-op decoration since iframe
  // policies don't expose volume.
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black shadow-[0_0_60px_rgba(0,0,0,0.5)] sm:rounded-3xl">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-full w-full">
          <VideoPlayer
            src={short.embedUrl}
            poster={short.poster || null}
            aspectRatio="9/16"
            autoplay
            muted
            rounded={false}
            showBadge
            className="h-full w-full"
          />
        </div>
      </div>
      <Caption short={short} />
    </div>
  );
}

function ProgressBar({ progress }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 h-1 overflow-hidden rounded-full bg-white/15">
      <div
        className="h-full bg-white transition-[width] duration-100 ease-linear"
        style={{ width: `${Math.min(100, progress * 100)}%` }}
      />
    </div>
  );
}

function Caption({ short }) {
  if (!short) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-12 text-white sm:px-6 sm:pb-6">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
        aria-hidden
      />
      <div className="relative pr-16">
        <h3
          className="line-clamp-2 text-base font-bold leading-tight sm:text-lg"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
        >
          {short.title}
        </h3>
        {short.excerpt && (
          <p
            className="mt-1 line-clamp-2 text-xs text-white/85 sm:text-sm"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
          >
            {short.excerpt}
          </p>
        )}
        {short.slug && (
          <Link
            href={`/posts/${short.slug}`}
            className="pointer-events-auto mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-white/30"
          >
            Read article
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

function ActionRail({ isMuted, onToggleMute }) {
  return (
    <div className="absolute bottom-20 right-3 z-20 flex flex-col items-center gap-3 sm:bottom-24 sm:right-4">
      <ActionButton icon={Heart} label="Like" />
      <ActionButton icon={MessageCircle} label="Comments" />
      <ActionButton icon={Share2} label="Share" />
      <ActionButton
        icon={isMuted ? VolumeX : Volume2}
        label={isMuted ? 'Unmute' : 'Mute'}
        onClick={onToggleMute}
      />
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-black/60 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

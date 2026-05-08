'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';

// ── helpers ───────────────────────────────────────────────────────────────────

const HTML5_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;

function isHtml5Url(url) {
  return typeof url === 'string' && HTML5_EXT.test(url);
}

function isEmbedUrl(url) {
  if (typeof url !== 'string') return false;
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
  if (cover.sources?.length) return cover.sources[cover.sources.length - 1]?.src || null;
  return null;
}

function pickPosterFromAnyCover(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  if (cover.sources?.length) return cover.sources[cover.sources.length - 1]?.src || null;
  return null;
}

/**
 * Parse an embed URL into the iframe src that maximises in-modal sound +
 * loop. Returns null if we don't recognise the host (caller falls back to
 * the static card variant — no broken iframes).
 */
function parseEmbed(url) {
  if (typeof url !== 'string') return null;
  const u = url.trim();

  const ytId =
    u.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/)?.[1]
    || u.match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1]
    || u.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)?.[1]
    || u.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/)?.[1];
  if (ytId) {
    return {
      provider: 'youtube',
      src:
        `https://www.youtube.com/embed/${ytId}` +
        // mute=1 is required for autoplay to actually start; user can unmute
        // via the in-iframe controls. loop+playlist trick required for loop.
        `?autoplay=1&mute=1&controls=1&modestbranding=1&loop=1&playlist=${ytId}&playsinline=1&rel=0`,
    };
  }

  const ttId = u.match(/tiktok\.com\/.*\/video\/(\d+)/)?.[1];
  if (ttId) return { provider: 'tiktok', src: `https://www.tiktok.com/embed/v2/${ttId}` };

  const vmId = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
  if (vmId) return { provider: 'vimeo', src: `https://player.vimeo.com/video/${vmId}?autoplay=1&muted=1&loop=1&background=0&playsinline=1` };

  return null;
}

/**
 * Normalise a row from any source (homepage_videos or posts) into the
 * single shape the carousel and viewer consume.
 *
 * kind:
 *   'html5'  — <video> with mp4/webm/mov sources, full custom controls
 *   'embed'  — third-party iframe (YouTube/TikTok/Vimeo), iframe controls
 *   'static' — no playable source, image card that links to the post page
 */
function normaliseRows(rows = []) {
  const out = [];
  for (const r of rows) {
    if (!r) continue;

    // homepage_videos shape
    if (r.sourceUrl) {
      const url = String(r.sourceUrl).trim();
      if (!url) continue;
      const html5 = isHtml5Url(url);
      const embed = !html5 && isEmbedUrl(url);
      out.push({
        id: r.id,
        title: r.title || 'Wildlife short',
        slug: r.postSlug || null,
        poster: r.thumbnail || null,
        kind: html5 ? 'html5' : (embed ? 'embed' : 'html5'),
        sources: html5 ? [{ src: url, type: 'video/mp4' }] : null,
        embedUrl: !html5 ? url : null,
      });
      continue;
    }

    // post shape
    if (isVideoCover(r.cover)) {
      out.push({
        id: r.id,
        title: r.title || 'Wildlife short',
        slug: r.slug || null,
        poster: pickPosterFromCover(r.cover),
        kind: 'html5',
        sources: r.cover.sources.filter((s) => s?.src),
        embedUrl: null,
      });
    } else if (r.cover) {
      // Static fallback — no playable video, poster only. Card links to post.
      const poster = pickPosterFromAnyCover(r.cover);
      if (poster) {
        out.push({
          id: r.id,
          title: r.title || 'Wildlife post',
          slug: r.slug || null,
          poster,
          kind: 'static',
          sources: null,
          embedUrl: null,
        });
      }
    }
  }
  return out;
}

// ── ShortsSection ────────────────────────────────────────────────────────────

export function ShortsSection({
  section = 'shorts',
  heading = 'Wildlife Universe Shorts',
  subheading = 'Watch quick, immersive wildlife moments.',
  maxItems = 12,
} = {}) {
  const router = useRouter();
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const trackRef = useRef(null);

  // Three-tier fallback so the section is never empty:
  //   1. Admin-curated homepage_videos for this section
  //   2. Recent posts that have a vertical video cover
  //   3. Recent posts (any cover) — static cards that deep-link to the post
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let items = [];

      try {
        const curated = await db.homepageVideos.list({ section });
        items = normaliseRows(curated);
      } catch {
        items = [];
      }

      if (items.length === 0) {
        try {
          const posts = await db.posts.list();
          const live = (posts || []).filter((p) => p?.status !== 'draft');
          const videoPosts = live
            .filter((p) => isVideoCover(p.cover))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          items = normaliseRows(videoPosts);

          if (items.length === 0) {
            const recent = live
              .filter((p) => p.cover)
              .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
              .slice(0, maxItems);
            items = normaliseRows(recent);
          }
        } catch {
          items = [];
        }
      }

      if (!cancelled) {
        setShorts(items.slice(0, maxItems));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [section, maxItems]);

  const openViewer = useCallback((i) => {
    if (shorts[i]?.kind === 'static') {
      if (shorts[i].slug) router.push(`/posts/${shorts[i].slug}`);
      return;
    }
    setActiveIndex(i);
  }, [shorts, router]);
  const closeViewer = useCallback(() => setActiveIndex(null), []);
  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i === null || i === 0 ? i : i - 1));
  }, []);
  const goNext = useCallback(() => {
    setActiveIndex((i) => (i === null || i >= shorts.length - 1 ? i : i + 1));
  }, [shorts.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [activeIndex]);

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

  if (loading || shorts.length === 0 || dismissed) return null;

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
          <div className="flex items-center gap-3">
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
            <button
              type="button"
              aria-label="Hide shorts section"
              title="Hide shorts"
              onClick={() => setDismissed(true)}
              className="glass flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-fg)] transition-all hover:scale-110 hover:text-pink-500 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

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
                  aria-label={short.kind === 'static' ? `Open post: ${short.title}` : `Play short: ${short.title}`}
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {short.kind !== 'static' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                        <Play className="ml-1 h-6 w-6 text-white" fill="white" />
                      </div>
                    </div>
                  )}
                  <h3
                    className="absolute inset-x-0 bottom-0 line-clamp-2 p-4 text-left text-sm font-bold text-white md:text-base"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}
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

  // Mute preference is held at the viewer level so it persists across short
  // changes. Default false (try with sound — modal opens after a user click,
  // which is a valid user gesture for autoplay-with-sound). If the browser
  // blocks, the frame will flip this back to true via setIsMuted(true).
  const [isMuted, setIsMuted] = useState(false);
  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

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
      className="wu-no-scrollbar fixed inset-0 z-[100] overflow-hidden bg-black/95 backdrop-blur-xl"
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

      <div
        className="flex h-full w-full items-center justify-center overflow-hidden px-3 pb-3 sm:px-6 sm:pb-6"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 4rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
          // Hard cap on the video frame height so a 4K monitor doesn't render
          // a 1500px tall card. Width follows from the 9:16 aspect ratio
          // applied on ShortFrame, then max-w clamps it to the viewport on
          // narrow phones (where height becomes the constrained dimension).
          ['--short-h']: 'min(calc(100dvh - 7rem), 760px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ShortFrame
          key={short.id}
          short={short}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          onToggleMute={toggleMute}
          onPrev={hasPrev ? onPrev : null}
          onNext={hasNext ? onNext : null}
        />
      </div>
    </motion.div>
  );
}

function ProgressDots({ total, active, onSelect }) {
  return (
    <div className="wu-no-scrollbar flex flex-1 items-center gap-1.5 overflow-hidden" role="tablist" aria-label="Shorts progress">
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

function ShortFrame({ short, isMuted, setIsMuted, onToggleMute, onPrev, onNext }) {
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
      style={{
        height: 'var(--short-h, 100%)',
        maxHeight: '100%',
        maxWidth: '100%',
        aspectRatio: '9 / 16',
      }}
      className="relative flex items-stretch justify-center overflow-hidden"
    >
      {short?.kind === 'embed'
        ? <EmbedVideoFrame short={short} onToggleMute={onToggleMute} isMuted={isMuted} />
        : <Html5VideoFrame short={short} isMuted={isMuted} setIsMuted={setIsMuted} onToggleMute={onToggleMute} />}
    </motion.div>
  );
}

function Html5VideoFrame({ short, isMuted, setIsMuted, onToggleMute }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCue, setShowCue] = useState(false);

  // Reset on every short change. Try unmuted first; on browser block, fall
  // back to muted and keep playing — this preserves "sound by default" on
  // browsers that allow it (most desktop, recent Chrome/Edge after gesture)
  // without permanently muting the rest of the queue.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let alive = true;
    el.currentTime = 0;
    setProgress(0);

    const tryPlay = async () => {
      el.muted = isMuted;
      try {
        await el.play();
        if (alive) setIsPlaying(true);
        return;
      } catch {
        // Likely NotAllowedError — autoplay-with-sound blocked. Mute + retry.
      }
      el.muted = true;
      if (alive) setIsMuted(true);
      try {
        await el.play();
        if (alive) setIsPlaying(true);
      } catch {
        if (alive) setIsPlaying(false);
      }
    };

    tryPlay();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [short?.id]);

  // Honour external mute toggles (the action-rail Mute button)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = isMuted;
  }, [isMuted]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().then(() => setIsPlaying(true)).catch(() => {});
    else { el.pause(); setIsPlaying(false); }
    setShowCue(true);
    setTimeout(() => setShowCue(false), 500);
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
        playsInline
        loop
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onClick={togglePlay}
        className="absolute inset-0 h-full w-full bg-black object-cover"
      >
        {(short?.sources || []).map((s, i) => (
          <source key={i} src={s.src} type={s.type} />
        ))}
      </video>

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
      <ActionRail isMuted={isMuted} onToggleMute={onToggleMute} />
    </div>
  );
}

function EmbedVideoFrame({ short, isMuted, onToggleMute }) {
  // Inline iframe so we control the wrapper sizing — VideoPlayer's per-
  // provider maxWidth (400px for shorts/reels) caps the embed at 400px,
  // which leaves dead space inside our 9:16 stage on larger viewports.
  const parsed = parseEmbed(short?.embedUrl);

  if (!parsed) {
    // Unknown host — show the poster as a static splash, no broken iframe.
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black shadow-[0_0_60px_rgba(0,0,0,0.5)] sm:rounded-3xl">
        {short?.poster && (
          <img
            src={short.poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {short?.embedUrl && (
          <a
            href={short.embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm font-semibold"
          >
            Open video ↗
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black shadow-[0_0_60px_rgba(0,0,0,0.5)] sm:rounded-3xl">
      <iframe
        src={parsed.src}
        title={short?.title || 'Wildlife short'}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
        scrolling="no"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <ActionRail isMuted={isMuted} onToggleMute={onToggleMute} />
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

function ActionRail({ isMuted, onToggleMute }) {
  return (
    <div className="absolute bottom-4 right-3 z-20 flex flex-col items-center gap-3 sm:bottom-6 sm:right-4">
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
      className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-black/70 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

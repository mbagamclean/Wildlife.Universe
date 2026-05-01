'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Play, Flame, User } from 'lucide-react';
import { ShareButton } from '@/components/ui/ShareButton';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';

const MAX_POSTS        = 6;
const DISPLAY_DURATION = 5200; // ms each post stays featured
const PHASE1_DELAY     = 32;   // ms — lets Phase 1 paint before crossfade starts
const CROSSFADE_MS     = 480;  // ms — crossfade duration + small buffer

/* ─── helpers ──────────────────────────────────────────────── */
function resolveSrc(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  return cover.sources?.[cover.sources.length - 1]?.src || null;
}
function isVideo(cover) { return cover?.type === 'video'; }
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ─── Background layer (stacked, CSS opacity crossfade) ─────── */
function BgLayer({ post, active }) {
  const src     = resolveSrc(post.cover);
  const palette = post.coverPalette || { from: '#0c1a0c', via: '#1a3a1a', to: '#4a7a4a' };
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: active ? 1 : 0,
        transition: 'opacity 0.75s ease',
        zIndex: active ? 1 : 0,
        willChange: 'opacity',
      }}
    >
      {src ? (
        isVideo(post.cover) ? (
          <video className="h-full w-full object-cover" autoPlay muted loop playsInline>
            {post.cover.sources?.map((s, i) => <source key={i} src={s.src} type={s.type} />)}
          </video>
        ) : (
          <img src={src} alt={post.title} loading="lazy" className="h-full w-full object-cover" />
        )
      ) : (
        <div className="h-full w-full"
          style={{ background: `linear-gradient(145deg, ${palette.from} 0%, ${palette.via} 52%, ${palette.to} 100%)` }}
        >
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.12) 0%, transparent 60%)' }}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Featured text content (shared by both crossfade layers) ── */
function FeaturedContent({ post }) {
  if (!post) return null;
  return (
    <>
      {(post.label || post.category) && (
        <span className="mb-3 inline-block rounded-full bg-[var(--color-primary)]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
          {post.label || post.category}
        </span>
      )}
      <h3
        className="font-display text-2xl font-black leading-tight text-white md:text-3xl text-balance"
        style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
      >
        {post.title}
      </h3>
      <p className="mt-2.5 line-clamp-2 text-sm text-white/80 md:text-base">
        {post.description}
      </p>

      <div className="mt-4 flex items-center justify-between pointer-events-auto w-full">
        <div className="flex items-center gap-3 z-10 w-fit">
          <span className="flex items-center gap-1.5 font-medium text-white/70 text-xs">
            <User className="h-3 w-3 opacity-90" />
            {post.author?.name || 'Wildlife Universe'}
          </span>
          <ShareButton title={post.title} slug={post.slug} className="text-white bg-white/10 hover:bg-white/25 h-8 w-8 !p-1.5 shadow-sm" />
        </div>
        <span className="flex translate-y-1 items-center gap-1.5 text-sm font-semibold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          Read More <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </>
  );
}

/* ─── Right-side trending card ──────────────────────────────── */
function TrendingCard({ post, rank, onActivate }) {
  const src     = resolveSrc(post.cover);
  const palette = post.coverPalette || { from: '#0c1a0c', via: '#1a3a1a', to: '#4a7a4a' };
  const label   = post.label || post.category || '';
  return (
    <Link
      href={`/posts/${post.slug}`}
      onMouseEnter={onActivate}
      className="group/card relative flex items-center gap-3.5 rounded-xl p-3 cursor-pointer no-underline transition-colors duration-150 hover:bg-white/5"
    >
      <div className="relative shrink-0 overflow-hidden rounded-lg" style={{ width: 80, height: 60 }}>
        {src ? (
          <img src={src} alt={post.title} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
          />
        ) : (
          <div className="h-full w-full"
            style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.via} 55%, ${palette.to})` }}
          >
            <div className="absolute inset-0"
              style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), transparent 60%)' }}
            />
          </div>
        )}
        {isVideo(post.cover) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="h-4 w-4 fill-white text-white drop-shadow-lg" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[10px] font-black tabular-nums"
            style={{ color: 'var(--color-primary)', opacity: 0.75 }}
          >
            #{rank}
          </span>
          {label && (
            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{ background: 'rgba(0,128,0,0.12)', color: 'var(--color-primary)' }}
            >
              {label}
            </span>
          )}
        </div>
        <h4 className="text-sm font-bold leading-snug line-clamp-2 pr-[100px]" style={{ color: 'var(--color-fg)' }}>
          {post.title}
        </h4>
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[9px] font-medium" style={{ color: 'var(--color-fg-soft)', opacity: 0.8 }}>
            <User className="h-2.5 w-2.5" />
            {post.author?.name || 'Wildlife Universe'}
          </span>
          <ShareButton title={post.title} slug={post.slug} className="h-7 w-7 text-[var(--color-fg-soft)] hover:bg-white/10 opacity-0 group-hover/card:opacity-100 transition-opacity" />
        </div>
      </div>

      <ArrowRight
        className="h-4 w-4 shrink-0 opacity-0 transition-all duration-200 group-hover/card:opacity-100 group-hover/card:translate-x-0.5"
        style={{ color: 'var(--color-primary)' }}
      />
    </Link>
  );
}

/* ─── Skeleton / EmptyState ─────────────────────────────────── */
function Skeleton() {
  return (
    <div className="flex gap-5 lg:gap-6">
      <div className="wu-skeleton flex-1 rounded-2xl" style={{ minHeight: 420 }} />
      <div className="hidden w-[38%] shrink-0 flex-col gap-3 lg:flex">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 rounded-xl p-3">
            <div className="wu-skeleton shrink-0 rounded-lg" style={{ width: 80, height: 60 }} />
            <div className="flex flex-1 flex-col gap-2">
              <div className="wu-skeleton h-3.5 w-4/5 rounded-full" />
              <div className="wu-skeleton h-3 w-full rounded-full" />
              <div className="wu-skeleton h-3 w-2/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl py-20 text-center"
      style={{ border: '2px dashed var(--glass-border)' }}
    >
      <Flame className="h-8 w-8 opacity-30" style={{ color: 'var(--color-primary)' }} />
      <p className="text-sm" style={{ color: 'var(--color-fg-soft)' }}>No trending posts yet.</p>
    </div>
  );
}

/* ─── Crossfade layer style helpers ─────────────────────────── */
function layerStyle(isOutgoing, crossfading, hasOverlay) {
  if (!hasOverlay) {
    // no crossfade active — just show normally
    return { opacity: 1, transform: 'none' };
  }
  if (isOutgoing) {
    return {
      opacity: crossfading ? 0 : 1,
      transform: crossfading ? 'translateY(-18px)' : 'translateY(0)',
      transition: 'opacity 0.38s ease, transform 0.38s ease',
      willChange: 'opacity, transform',
    };
  }
  // incoming
  return {
    opacity: crossfading ? 1 : 0,
    transform: crossfading ? 'translateY(0)' : 'translateY(16px)',
    transition: crossfading
      ? 'opacity 0.44s cubic-bezier(0.22,1,0.36,1) 0.04s, transform 0.44s cubic-bezier(0.22,1,0.36,1) 0.04s'
      : 'none',
    willChange: 'opacity, transform',
  };
}

/* ─── Main section ──────────────────────────────────────────── */
export function TrendingSection() {
  const [queue,       setQueue]       = useState([]);
  const [status,      setStatus]      = useState('loading');
  /* Crossfade state — keeps BOTH outgoing and incoming mounted simultaneously */
  const [prevFeatured, setPrevFeatured] = useState(null);
  const [prevRight,    setPrevRight]    = useState(null);
  const [crossfading,  setCrossfading]  = useState(false);

  const lockRef    = useRef(false);
  const queueRef   = useRef([]);
  const cleanupRef = useRef(null);

  useEffect(() => { queueRef.current = queue; }, [queue]);

  /* ── Core rotation: simultaneous crossfade, never goes to 0 ── */
  const doRotate = useCallback((updater) => {
    if (lockRef.current) return;
    lockRef.current = true;
    clearTimeout(cleanupRef.current);

    const q = queueRef.current;

    // Phase 1: mount outgoing content at opacity:1, incoming at opacity:0
    setPrevFeatured(q[0] ?? null);
    setPrevRight(q.slice(1));
    setCrossfading(false);

    // Phase 2: after browser paints Phase 1, start the crossfade
    setTimeout(() => {
      setQueue(updater);      // update content of incoming layer
      setCrossfading(true);   // trigger CSS: outgoing fades up-out, incoming fades up-in

      // Phase 3: clean up outgoing layer after transition completes
      cleanupRef.current = setTimeout(() => {
        setPrevFeatured(null);
        setPrevRight(null);
        setCrossfading(false);
        lockRef.current = false;
      }, CROSSFADE_MS);
    }, PHASE1_DELAY);
  }, []);

  /* ── Auto-advance ─────────────────────────────────────────── */
  useEffect(() => {
    if (status !== 'ready' || queue.length <= 1) return;
    const timer = setInterval(() => {
      doRotate(prev => { const [f, ...r] = prev; return [...r, f]; });
    }, DISPLAY_DURATION);
    return () => clearInterval(timer);
  }, [status, queue.length, doRotate]);

  /* ── Load posts ───────────────────────────────────────────── */
  const loadPosts = useCallback(async () => {
    try {
      const all = await db.posts.list();
      const trending = all
        .filter(p => p.category === 'posts')
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, MAX_POSTS);
      setQueue([...trending]);
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    loadPosts();
    window.addEventListener('wu:storage-changed', loadPosts);
    return () => {
      window.removeEventListener('wu:storage-changed', loadPosts);
      clearTimeout(cleanupRef.current);
    };
  }, [loadPosts]);

  /* ── Manual hover activation ──────────────────────────────── */
  const activatePost = useCallback((postId) => {
    const q = queueRef.current;
    if (!q.length || q[0]?.id === postId) return;
    doRotate(prev => {
      const idx = prev.findIndex(p => p.id === postId);
      return idx <= 0 ? prev : [...prev.slice(idx), ...prev.slice(0, idx)];
    });
  }, [doRotate]);

  const featured   = queue[0];
  const rightPosts = queue.slice(1);
  const hasOverlay = Boolean(prevFeatured); // crossfade is in progress

  return (
    <section className="relative py-10 md:py-14" style={{ background: 'var(--color-bg)' }}>
      <Container>
        {/* HEADER */}
        <div className="mb-10 flex items-end justify-between gap-4"
          style={{ animation: 'wu-fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-primary)' }}
            >
              <Flame className="h-3 w-3" />
              Most Popular
            </span>
            <h2 className="font-display text-3xl font-black leading-none tracking-tight sm:text-4xl"
              style={{ color: 'var(--color-fg)' }}
            >
              Trending Now
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-fg-soft)' }}>
              Most popular stories on Wildlife Universe
            </p>
          </div>
          <Link
            href="/posts"
            className="group/link mb-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300"
            style={{ border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}
          >
            View All
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
          </Link>
        </div>

        {/* BODY */}
        {status === 'loading' ? (
          <Skeleton />
        ) : queue.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6"
            style={{ animation: 'wu-fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both', animationDelay: '80ms' }}
          >
            {/* ── FEATURED PANEL ──────────────────── */}
            <Link
              href={`/posts/${featured?.slug ?? '#'}`}
              className="group relative block overflow-hidden rounded-2xl lg:flex-1"
              style={{ minHeight: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }}
            >
              {/* Stacked backgrounds — always crossfade smoothly */}
              {queue.map((post, i) => (
                <BgLayer key={post.id} post={post} active={i === 0} />
              ))}

              {/* Cinematic gradient */}
              <div className="pointer-events-none absolute inset-0"
                style={{
                  zIndex: 2,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.44) 45%, rgba(0,0,0,0.08) 100%)',
                }}
              />
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ zIndex: 2, background: 'rgba(0,0,0,0.16)' }}
              />

              {/* Static badges */}
              {featured && isVideo(featured.cover) && (
                <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                  <Play className="h-3 w-3 fill-white text-white" />
                  <span className="text-[10px] font-semibold text-white">Video</span>
                </div>
              )}
              <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/90 px-3 py-1.5 backdrop-blur-sm">
                <TrendingUp className="h-3 w-3 text-white" />
                <span className="text-[10px] font-semibold text-white">Trending</span>
              </div>

              {/*
                Content crossfade:
                - Outgoing: slides up + fades out  (absolute, behind)
                - Incoming: rises from below + fades in  (relative, in front)
                Both mounted simultaneously → opacity never hits 0
              */}
              <div className="absolute inset-x-0 bottom-0" style={{ zIndex: 3 }}>
                {/* Outgoing content */}
                {prevFeatured && (
                  <div
                    className="absolute inset-x-0 bottom-0 p-6 md:p-8"
                    style={{ ...layerStyle(true, crossfading, hasOverlay), zIndex: 1, pointerEvents: 'none' }}
                  >
                    <FeaturedContent post={prevFeatured} />
                  </div>
                )}
                {/* Incoming content */}
                <div
                  className="p-6 md:p-8"
                  style={{ ...layerStyle(false, crossfading, hasOverlay), position: 'relative', zIndex: 2 }}
                >
                  <FeaturedContent post={featured} />
                </div>
              </div>
            </Link>

            {/* ── RIGHT STACK ─────────────────────── */}
            <div className="flex flex-col gap-1 lg:w-[38%] lg:shrink-0">
              <p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase tracking-widest lg:block"
                style={{ color: 'var(--color-fg-soft)', opacity: 0.6 }}
              >
                Top Stories
              </p>

              {/*
                Cards crossfade:
                - Outgoing stack: absolute overlay, slides up + fades out
                - Incoming stack: in flow, rises + fades in
                Same technique as featured panel
              */}
              <div style={{ position: 'relative' }}>
                {/* Outgoing cards */}
                {prevRight && prevRight.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0,
                      zIndex: 1,
                      pointerEvents: 'none',
                      ...layerStyle(true, crossfading, hasOverlay),
                    }}
                  >
                    {prevRight.map((post, i) => (
                      <TrendingCard key={i} post={post} rank={i + 1} />
                    ))}
                  </div>
                )}
                {/* Incoming cards */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    ...layerStyle(false, crossfading, hasOverlay),
                  }}
                >
                  {rightPosts.map((post, i) => (
                    <TrendingCard
                      key={i}
                      post={post}
                      rank={i + 1}
                      onActivate={() => activatePost(post.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-2 hidden text-center lg:block">
                <Link href="/posts" className="text-xs font-medium transition-colors duration-200"
                  style={{ color: 'var(--color-primary)' }}
                >
                  View all trending posts →
                </Link>
              </div>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}

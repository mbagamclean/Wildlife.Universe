'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, MousePointerClick, HelpCircle } from 'lucide-react';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';

function resolveCoverSrc(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  const sources = cover.sources;
  if (!sources?.length) return null;
  return sources[sources.length - 1]?.src || null;
}

export function WhyHowSection() {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const trackRef = useRef(null);

  const loadPosts = useCallback(async () => {
    try {
      const all = await db.posts.list();
      const filtered = all.filter((p) => {
        if (p.category !== 'posts' && p.category !== 'Posts') return false;
        const lbl = String(p.label || '').toLowerCase();
        const title = String(p.title || '').toLowerCase();
        return lbl.includes('how') || lbl.includes('why') || title.startsWith('how') || title.startsWith('why');
      });
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPosts(filtered);
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    loadPosts();
    window.addEventListener('wu:storage-changed', loadPosts);
    return () => window.removeEventListener('wu:storage-changed', loadPosts);
  }, [loadPosts]);

  const syncScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncScrollState();
    const ro = new ResizeObserver(syncScrollState);
    ro.observe(el);
    el.addEventListener('scroll', syncScrollState, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', syncScrollState);
    };
  }, [syncScrollState, posts]);

  const SCROLL_AMT = 360;

  if (status === 'ready' && posts.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-10 md:py-14" style={{ background: 'var(--color-bg)' }}>
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute left-0 top-0 h-80 w-80 opacity-[0.05] blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }} />

      <Container>
        {/* HEADER */}
        <div
          className="mb-10 flex items-end justify-between gap-4"
          style={{ animation: 'wu-fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              <HelpCircle className="h-3 w-3" />
              Insights
            </span>
            <h2 className="font-display text-3xl font-black leading-none tracking-tight text-[var(--color-fg)] sm:text-4xl">
              Why &amp; How
            </h2>
            <p className="mt-1 text-sm text-[var(--color-fg-soft)]">
              Explore answers to the most asked wildlife questions
            </p>
          </div>

          <Link
            href="/posts"
            className="group/link mb-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition-all duration-300 hover:bg-[var(--color-primary)] hover:text-white"
            style={{ border: '1.5px solid var(--color-primary)' }}
          >
            View Notes
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
          </Link>
        </div>

        {/* CAROUSEL */}
        <div className="relative">
          {/* Left edge fade */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 transition-opacity duration-300 rounded-l-[1.5rem]"
            style={{
              background: 'linear-gradient(to right, var(--color-bg), transparent)',
              opacity: canLeft ? 1 : 0,
            }}
          />
          {/* Right edge fade */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 transition-opacity duration-300 rounded-r-[1.5rem]"
            style={{
              background: 'linear-gradient(to left, var(--color-bg), transparent)',
              opacity: canRight ? 1 : 0,
            }}
          />

          {/* Left nav button */}
          <button
            onClick={() => trackRef.current?.scrollBy({ left: -SCROLL_AMT, behavior: 'smooth' })}
            className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
            style={{
              background: 'var(--color-bg-deep)',
              border: '1.5px solid var(--glass-border)',
              color: 'var(--color-fg)',
              backdropFilter: 'blur(12px)',
              opacity: canLeft ? 1 : 0,
              pointerEvents: canLeft ? 'auto' : 'none',
            }}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Right nav button */}
          <button
            onClick={() => trackRef.current?.scrollBy({ left: SCROLL_AMT, behavior: 'smooth' })}
            className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
            style={{
              background: 'var(--color-bg-deep)',
              border: '1.5px solid var(--glass-border)',
              color: 'var(--color-fg)',
              backdropFilter: 'blur(12px)',
              opacity: canRight ? 1 : 0,
              pointerEvents: canRight ? 'auto' : 'none',
            }}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Scrollable Container */}
          <div
            ref={trackRef}
            className="wu-no-scrollbar flex gap-4 overflow-x-auto py-3 md:gap-5"
          >
            {status === 'loading'
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="wu-skeleton shrink-0 rounded-[1.5rem]" style={{ width: 'clamp(260px, 45vw, 320px)', aspectRatio: '4/5' }} />
                ))
              : posts.map((post) => {
                  const coverSrc = resolveCoverSrc(post.cover);
                  const palette = post.coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' };

                  return (
                    <Link
                      key={post.id}
                      href={`/posts/${post.slug}`}
                      className="group/card relative flex shrink-0 flex-col overflow-hidden rounded-[1.5rem] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,128,0,0.08)]"
                      style={{
                        background: 'var(--color-bg-deep)',
                        border: '1px solid var(--glass-border)',
                        width: 'clamp(260px, 60vw, 320px)',
                      }}
                    >
                      {/* Image Block */}
                      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/10' }}>
                        {coverSrc ? (
                          <img
                            src={coverSrc}
                            alt={post.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover/card:scale-110"
                          />
                        ) : (
                          <div
                            className="h-full w-full transition-transform duration-[800ms] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover/card:scale-110"
                            style={{
                              background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 52%, ${palette.to} 100%)`,
                            }}
                          >
                            <div
                              className="absolute inset-0"
                              style={{
                                background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0%, transparent 60%)',
                              }}
                            />
                          </div>
                        )}
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />
                      </div>

                      {/* Text Block & Button */}
                      <div className="flex flex-1 flex-col justify-between p-5 md:p-6">
                        <div>
                          {post.label && (
                            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)]">
                              {post.label}
                            </span>
                          )}
                          <h3 className="line-clamp-2 min-h-[3rem] font-display text-[18px] font-bold leading-tight text-[var(--color-fg)]">
                            {post.title}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-fg-soft)]">
                            {post.description}
                          </p>
                        </div>
                        
                        <div className="mt-5 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/10 px-4 py-1.5 text-[13px] font-bold text-[var(--color-primary)] transition-colors duration-300 group-hover/card:bg-[var(--color-primary)] group-hover/card:text-white">
                            Read
                            <MousePointerClick className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </div>
      </Container>
    </section>
  );
}

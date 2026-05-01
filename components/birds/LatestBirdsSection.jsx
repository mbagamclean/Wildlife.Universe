'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Bird, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';
import { AnimalCircle } from '@/components/animals/AnimalCircle';

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-3xl py-20 text-center"
      style={{ border: '2px dashed var(--glass-border)' }}
    >
      <Bird className="h-8 w-8 text-[var(--color-primary)] opacity-40" />
      <p className="text-sm text-[var(--color-fg-soft)]">
        No bird profiles yet — add them via the admin panel.
      </p>
    </div>
  );
}

export function LatestBirdsSection() {
  const [birds,  setBirds]  = useState([]);
  const [status, setStatus] = useState('loading');
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);
  const trackRef = useRef(null);

  const loadBirds = useCallback(async () => {
    try {
      const all    = await db.posts.listByCategory('birds');
      const sorted = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBirds(sorted);
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    loadBirds();
    window.addEventListener('wu:storage-changed', loadBirds);
    return () => window.removeEventListener('wu:storage-changed', loadBirds);
  }, [loadBirds]);

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
  }, [syncScrollState, birds]);

  const SCROLL_AMT = 340;

  return (
    <section
      className="relative overflow-hidden py-10 md:py-14"
      style={{
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(56,88,148,0.06) 0%, transparent 55%),
          radial-gradient(ellipse at 80% 75%, rgba(0,128,0,0.04) 0%, transparent 50%),
          var(--color-bg)
        `,
      }}
    >
      <div className="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full opacity-[0.05] blur-3xl"
        style={{ background: 'radial-gradient(circle, #385894, transparent)' }} />
      <div className="pointer-events-none absolute -left-16 bottom-1/4 h-56 w-56 rounded-full opacity-[0.04] blur-3xl"
        style={{ background: 'radial-gradient(circle, #008000, transparent)' }} />

      <Container>
        {/* HEADER */}
        <div
          className="mb-10 flex items-end justify-between gap-4"
          style={{ animation: 'wu-fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              <Bird className="h-3 w-3" />
              Avian Kingdom
            </span>
            <h2 className="font-display text-3xl font-black leading-none tracking-tight text-[var(--color-fg)] sm:text-4xl">
              Explore Latest Birds
            </h2>
            <p className="mt-1 text-sm text-[var(--color-fg-soft)]">
              Discover remarkable avian species from across the globe
            </p>
          </div>
          <Link
            href="/birds"
            className="group/link mb-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition-all duration-300 hover:bg-[var(--color-primary)] hover:text-white"
            style={{ border: '1.5px solid var(--color-primary)' }}
          >
            View All
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
          </Link>
        </div>

        {/* CAROUSEL */}
        {status === 'ready' && birds.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="relative">
            {/* Edge fades */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to right, var(--color-bg), transparent)', opacity: canLeft ? 1 : 0 }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to left, var(--color-bg), transparent)', opacity: canRight ? 1 : 0 }}
            />

            {/* Left nav button */}
            <button
              onClick={() => trackRef.current?.scrollBy({ left: -SCROLL_AMT, behavior: 'smooth' })}
              className="absolute left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
              style={{
                background: 'var(--color-bg)',
                border: '1.5px solid var(--glass-border)',
                color: 'var(--color-fg)',
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
              className="absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
              style={{
                background: 'var(--color-bg)',
                border: '1.5px solid var(--glass-border)',
                color: 'var(--color-fg)',
                opacity: canRight ? 1 : 0,
                pointerEvents: canRight ? 'auto' : 'none',
              }}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Scrollable track */}
            <div
              ref={trackRef}
              className="wu-no-scrollbar flex gap-4 overflow-x-auto py-2 md:gap-5"
            >
              {status === 'loading'
                ? Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="wu-skeleton shrink-0 rounded-full"
                      style={{ width: 128, height: 128 }}
                    />
                  ))
                : birds.map((post, i) => (
                    <div key={post.id} className="w-28 shrink-0 sm:w-32 lg:w-36">
                      <AnimalCircle post={post} size="fluid" index={i} />
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Sprout, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';
import { PlantCard } from './PlantCard';

function SkeletonCard() {
  return (
    <div
      className="wu-skeleton shrink-0 rounded-2xl"
      style={{ width: 'clamp(220px, 30vw, 300px)', aspectRatio: '3 / 4' }}
    />
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-3xl py-20 text-center w-full"
      style={{ border: '2px dashed var(--glass-border)' }}
    >
      <Sprout className="h-8 w-8 text-[var(--color-primary)] opacity-40" />
      <p className="text-sm text-[var(--color-fg-soft)]">
        No plant species yet — add them via the admin panel.
      </p>
    </div>
  );
}

export function LatestPlantsSection() {
  const [plants,   setPlants]   = useState([]);
  const [status,   setStatus]   = useState('loading');
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);
  const trackRef = useRef(null);

  const loadPlants = useCallback(async () => {
    try {
      const all    = await db.posts.listByCategory('plants');
      const sorted = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPlants(sorted); // no cap — infinite as species grow
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    loadPlants();
    window.addEventListener('wu:storage-changed', loadPlants);
    return () => window.removeEventListener('wu:storage-changed', loadPlants);
  }, [loadPlants]);

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
  }, [syncScrollState, plants]);

  const SCROLL_AMT = 360;

  return (
    <section
      className="relative overflow-hidden py-10 md:py-14"
      style={{
        background: `
          radial-gradient(ellipse at 80% 20%, rgba(0,128,0,0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 20% 80%, rgba(58,113,90,0.05) 0%, transparent 50%),
          var(--color-bg-deep)
        `,
      }}
    >
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 opacity-[0.06] blur-3xl"
        style={{ background: 'radial-gradient(circle, #3aa15a, transparent)' }} />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 opacity-[0.04] blur-3xl"
        style={{ background: 'radial-gradient(circle, #d4af37, transparent)' }} />

      <Container>
        {/* HEADER */}
        <div
          className="mb-10 flex items-end justify-between gap-4"
          style={{ animation: 'wu-fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              <Sprout className="h-3 w-3" />
              Plant Kingdom
            </span>
            <h2 className="font-display text-3xl font-black leading-none tracking-tight text-[var(--color-fg)] sm:text-4xl">
              Flora &amp; Species
            </h2>
            <p className="mt-1 text-sm text-[var(--color-fg-soft)]">
              Discover remarkable plants from across the natural world
            </p>
          </div>

          <Link
            href="/plants"
            className="group/link mb-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition-all duration-300 hover:bg-[var(--color-primary)] hover:text-white"
            style={{ border: '1.5px solid var(--color-primary)' }}
          >
            View All
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
          </Link>
        </div>

        {/* CAROUSEL */}
        {status === 'ready' && plants.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="relative">
            {/* Left edge fade */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(to right, var(--color-bg-deep), transparent)',
                opacity: canLeft ? 1 : 0,
              }}
            />
            {/* Right edge fade */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(to left, var(--color-bg-deep), transparent)',
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

            {/* Scrollable track — py-3 gives vertical room so hover shadows aren't clipped */}
            <div
              ref={trackRef}
              className="wu-no-scrollbar flex gap-4 overflow-x-auto py-3 md:gap-5"
            >
              {status === 'loading'
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : plants.map((post, i) => (
                    <PlantCard key={post.id} post={post} index={i} />
                  ))
              }
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}

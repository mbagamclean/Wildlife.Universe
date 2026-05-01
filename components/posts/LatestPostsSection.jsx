'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, Rss } from 'lucide-react';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';
import { LatestPostCard } from './LatestPostCard';

const MAX_POSTS = 6;

function SkeletonCard({ index }) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: 'var(--color-bg-deep)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px var(--glass-border)',
        opacity: 1 - index * 0.12,
      }}
    >
      <div className="wu-skeleton" style={{ aspectRatio: '16/9' }} />
      <div className="flex flex-col gap-3 px-5 pb-5 pt-4">
        <div className="wu-skeleton h-5 w-4/5 rounded-lg" />
        <div className="wu-skeleton h-4 w-full rounded-lg" />
        <div className="wu-skeleton h-4 w-11/12 rounded-lg" />
        <div className="wu-skeleton h-4 w-2/3 rounded-lg" />
        <div
          className="mt-2 flex justify-between pt-3.5"
          style={{ borderTop: '1px solid var(--glass-border)' }}
        >
          <div className="wu-skeleton h-3.5 w-20 rounded-full" />
          <div className="wu-skeleton h-3.5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-2xl py-20 text-center"
      style={{
        border: '2px dashed var(--glass-border)',
      }}
    >
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'var(--color-primary)', opacity: 0.12 }}
      />
      <p className="text-sm text-[var(--color-fg-soft)]">
        No posts published yet — check back soon.
      </p>
    </div>
  );
}

export function LatestPostsSection() {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready'

  const loadPosts = useCallback(async () => {
    try {
      const all = await db.posts.list();
      const sorted = [...all].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setPosts(sorted.slice(0, MAX_POSTS));
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    loadPosts();
    window.addEventListener('wu:storage-changed', loadPosts);
    return () => window.removeEventListener('wu:storage-changed', loadPosts);
  }, [loadPosts]);

  return (
    <section
      className="relative py-10 md:py-14"
      style={{ background: 'var(--color-bg)' }}
    >

      <Container>
        {/* ─── SECTION HEADER ───────────────────── */}
        <div
          className="mb-10 flex items-end justify-between gap-4"
          style={{
            animation: 'wu-fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          <div className="flex flex-col gap-1.5">
            {/* Eyebrow */}
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              <Rss className="h-3 w-3" />
              Wildlife Universe
            </span>

            {/* Title */}
            <h2 className="font-display text-3xl font-black leading-none tracking-tight text-[var(--color-fg)] sm:text-4xl">
              Latest Posts
            </h2>
          </div>

          {/* View All link */}
          <Link
            href="/posts"
            className="group/link mb-0.5 inline-flex shrink-0 items-center gap-1.5
                       rounded-full px-4 py-2 text-sm font-semibold
                       text-[var(--color-primary)] transition-all duration-300
                       hover:bg-[var(--color-primary)] hover:text-white
                       focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-[var(--color-primary)]"
            style={{ border: '1.5px solid var(--color-primary)' }}
          >
            View All
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300
                         group-hover/link:translate-x-0.5"
            />
          </Link>
        </div>

        {/* ─── GRID ─────────────────────────────── */}
        {status === 'loading' ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: MAX_POSTS }, (_, i) => (
              <div key={i} className={`h-full ${i >= 4 ? 'hidden lg:block' : i >= 2 ? 'hidden sm:block' : 'block'}`}>
                <SkeletonCard index={i} />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <div key={post.id} className={`h-full ${i >= 4 ? 'hidden lg:block' : i >= 2 ? 'hidden sm:block' : 'block'}`}>
                <LatestPostCard post={post} index={i} />
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

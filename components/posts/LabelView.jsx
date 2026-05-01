'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { db } from '@/lib/storage/db';
import { PostGrid } from './PostGrid';
import { labelSlug } from '@/lib/mock/categories';

export function LabelView({ category, categoryName, label, allLabels }) {
  const [posts, setPosts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const all = await db.posts.listByCategory(category);
      if (!cancelled) {
        setPosts(all.filter((p) => p.label === label));
        setLoaded(true);
      }
    };
    load();
    const onChange = () => load();
    window.addEventListener('wu:storage-changed', onChange);
    return () => {
      cancelled = true;
      window.removeEventListener('wu:storage-changed', onChange);
    };
  }, [category, label]);

  return (
    <>
      {/* ── Hero banner ── */}
      <section className="relative flex h-[88vh] min-h-[640px] items-center justify-center overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-[#031a0d] via-[#0c4a1a] to-[#3aa15a]"
        />
        <div aria-hidden className="absolute inset-0 dark-overlay" />
        <Container className="relative z-10 py-12 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest hero-sub-on-dark backdrop-blur">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#008000]" />
            {categoryName}
          </p>
          <h1 className="font-display text-5xl font-black hero-on-dark sm:text-6xl md:text-7xl text-balance">
            {label}
          </h1>
          <p className="mt-3 mx-auto max-w-xl text-base hero-sub-on-dark sm:text-lg">
            Discover curated content and insights in {label}
          </p>
        </Container>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 gradient-fade-down"
        />
      </section>

      {/* ── Label tabs row (same category, different label) ── */}
      <section className="py-6 border-b border-[var(--glass-border)]">
        <Container>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${category}`}
              className="rounded-full bg-[var(--color-bg-deep)] border border-[var(--glass-border)] px-5 py-2 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--glass-border)]"
            >
              All Posts
            </Link>
            {allLabels.map((l) => {
              const active = l === label;
              return (
                <Link
                  key={l}
                  href={`/${category}/${labelSlug(l)}`}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#008000] text-white pointer-events-none'
                      : 'bg-[var(--color-bg-deep)] border border-[var(--glass-border)] text-[var(--color-fg)] hover:bg-[var(--glass-border)]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {l}
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ── Posts grid ── */}
      <section className="pb-24">
        <Container>
          {!loaded ? (
            <p className="text-center text-sm text-[var(--color-fg-soft)]">Loading…</p>
          ) : (
            <PostGrid
              posts={posts}
              emptyTitle={`No ${label} posts yet`}
              emptyMessage="Sign in as the CEO and create posts in the admin panel — they will appear here immediately."
            />
          )}
        </Container>
      </section>
    </>
  );
}

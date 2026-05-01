'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { db } from '@/lib/storage/db';
import { PostGrid } from './PostGrid';
import { labelSlug } from '@/lib/mock/categories';

export function CategoryView({ category, name, blurb, labels }) {
  const [posts, setPosts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const list = await db.posts.listByCategory(category);
      if (!cancelled) {
        setPosts(list);
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
  }, [category]);

  return (
    <>
      <section className="relative flex h-[88vh] min-h-[640px] items-center justify-center overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-[#031a0d] via-[#0c4a1a] to-[#3aa15a]"
        />
        <div aria-hidden className="absolute inset-0 dark-overlay" />
        <Container className="relative z-10 py-12 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest hero-sub-on-dark backdrop-blur">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#008000]" />
            Category
          </p>
          <h1 className="font-display text-5xl font-black hero-on-dark sm:text-6xl md:text-7xl text-balance">
            {name}
          </h1>
          <p className="mt-3 mx-auto max-w-xl text-base hero-sub-on-dark sm:text-lg">
            {blurb || `Discover curated content and insights in ${name}`}
          </p>
        </Container>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 gradient-fade-down"
        />
      </section>

      <section className="py-6 border-b border-[var(--glass-border)]">
        <Container>
          <div className="flex flex-wrap gap-2">
            <span className="cursor-default rounded-full bg-[#008000] px-5 py-2 text-sm font-semibold text-white">
              All Posts
            </span>
            {labels.map((label) => (
              <Link
                key={label}
                href={`/${category}/${labelSlug(label)}`}
                className="rounded-full bg-[var(--color-bg-deep)] border border-[var(--glass-border)] px-5 py-2 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--glass-border)] hover:text-[var(--color-fg)]"
              >
                {label}
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          {!loaded ? (
            <p className="text-center text-sm text-[var(--color-fg-soft)]">Loading…</p>
          ) : (
            <PostGrid
              posts={posts}
              emptyTitle={`No ${name.toLowerCase()} posts yet`}
              emptyMessage="Sign in as the CEO and create one in the admin panel — it will show up here right away."
            />
          )}
        </Container>
      </section>
    </>
  );
}

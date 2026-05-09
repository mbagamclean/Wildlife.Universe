'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Rss, ChevronRight, ChevronsRight } from 'lucide-react';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';
import { LatestPostCard } from './LatestPostCard';

const POSTS_PER_PAGE = 8;

function SkeletonCard({ index }) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: 'var(--color-bg-deep)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px var(--glass-border)',
        opacity: 1 - index * 0.08,
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
      style={{ border: '2px dashed var(--glass-border)' }}
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
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);

  const loadPosts = useCallback(async () => {
    try {
      const all = await db.posts.list();
      const live = (all || []).filter((p) => p?.status !== 'draft');
      const sorted = live.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPosts(sorted);
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    loadPosts();
    window.addEventListener('wu:storage-changed', loadPosts);
    return () => window.removeEventListener('wu:storage-changed', loadPosts);
  }, [loadPosts]);

  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  // Clamp page if posts shrink (e.g., admin deletes a post on the last page)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visiblePosts = useMemo(() => {
    const start = (page - 1) * POSTS_PER_PAGE;
    return posts.slice(start, start + POSTS_PER_PAGE);
  }, [posts, page]);

  const handlePageChange = useCallback((next) => {
    setPage(next);
    // Optional: scroll the grid into view so the user sees the new page
    if (typeof window !== 'undefined') {
      const el = document.getElementById('latest-posts-grid');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <section className="relative py-10 md:py-14" style={{ background: 'var(--color-bg)' }}>
      <Container>
        {/* ─── SECTION HEADER ───────────────────── */}
        <div
          className="mb-10 flex items-end justify-between gap-4"
          style={{ animation: 'wu-fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              <Rss className="h-3 w-3" />
              Wildlife Universe
            </span>
            <h2 className="font-display text-3xl font-black leading-none tracking-tight text-[var(--color-fg)] sm:text-4xl">
              Latest Posts
            </h2>
          </div>
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
        <div id="latest-posts-grid" className="scroll-mt-24">
          {status === 'loading' ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: POSTS_PER_PAGE }, (_, i) => (
                <SkeletonCard key={i} index={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {visiblePosts.map((post, i) => (
                  <LatestPostCard key={post.id} post={post} index={i} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* ─── PAGINATION ────────────────────────── */}
        <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </Container>
    </section>
  );
}

// ── Pagination ──────────────────────────────────────────────────────────────

/**
 * Build a list of page tokens — page numbers and ellipses — that fits in
 * a single row without overflowing on a phone. Always shows page 1, the
 * last page, and a window around the current page.
 *
 *   1, 2, 3, 4, 5, 6, 7         (totalPages ≤ 7)
 *   1, 2, 3, …, 12              (current near start, totalPages > 7)
 *   1, …, 5, 6, 7, …, 12        (current in middle)
 *   1, …, 10, 11, 12            (current near end)
 */
function buildPageTokens(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const tokens = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) tokens.push('…');
  for (let p = left; p <= right; p++) tokens.push(p);
  if (right < total - 1) tokens.push('…');
  tokens.push(total);
  return tokens;
}

function Pagination({ page, totalPages, onPageChange }) {
  // Adaptive: hide entirely while there's only one page-worth of posts —
  // it pops into existence the moment the cron drips post #9.
  const tokens = useMemo(() => buildPageTokens(page, totalPages), [page, totalPages]);
  const onLastPage = page >= totalPages;

  return (
    <AnimatePresence>
      {totalPages > 1 && (
        <motion.nav
          aria-label="Latest posts pagination"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
        >
          {tokens.map((t, i) =>
            t === '…' ? (
              <span
                key={`ellipsis-${i}`}
                aria-hidden
                className="px-1 text-sm text-[var(--color-fg-soft)] sm:px-2"
              >
                …
              </span>
            ) : (
              <PageButton
                key={t}
                label={String(t)}
                active={t === page}
                onClick={() => onPageChange(t)}
                aria-label={`Go to page ${t}`}
                aria-current={t === page ? 'page' : undefined}
              />
            ),
          )}

          {/* Visual divider between numbers and the action buttons */}
          <span
            aria-hidden
            className="mx-1 h-5 w-px bg-[var(--glass-border)] sm:mx-2"
          />

          <PageButton
            label="Next"
            icon={ChevronRight}
            disabled={onLastPage}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            aria-label="Next page"
          />
          <PageButton
            label="Last"
            icon={ChevronsRight}
            disabled={onLastPage}
            onClick={() => onPageChange(totalPages)}
            aria-label="Last page"
          />
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

function PageButton({ label, icon: Icon, active, disabled, onClick, ...rest }) {
  const base =
    'inline-flex h-9 min-w-[2.25rem] items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold transition-all duration-200 sm:h-10 sm:min-w-[2.5rem] sm:px-3.5 sm:text-sm';
  const cls = active
    ? `${base} bg-[var(--color-primary)] text-white shadow-sm pointer-events-none`
    : disabled
      ? `${base} text-[var(--color-fg-soft)] opacity-40 pointer-events-none`
      : `${base} text-[var(--color-fg)] hover:bg-[var(--color-primary)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cls}
      style={!active && !disabled ? { border: '1px solid var(--glass-border)' } : undefined}
      {...rest}
    >
      <span>{label}</span>
      {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />}
    </button>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Loader2, SearchX, Tag } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function pickCoverThumb(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  if (cover?.type === 'video') return null;
  const src = cover?.sources?.[cover?.sources?.length - 1]?.src;
  return src || null;
}

export function SearchResults({ query }) {
  const [state, setState] = useState({
    loading: true,
    results: [],
    count: 0,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    if (!query) {
      setState({ loading: false, results: [], count: 0, error: null });
      return () => {};
    }
    setState((s) => ({ ...s, loading: true, error: null }));

    fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.success) {
          setState({
            loading: false,
            results: [],
            count: 0,
            error: data?.error || 'Search failed',
          });
          return;
        }
        setState({
          loading: false,
          results: data.results || [],
          count: data.count || 0,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          loading: false,
          results: [],
          count: 0,
          error: err?.message || 'Search failed',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!query) return null;

  if (state.loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-[var(--color-fg-soft)]">
        <Loader2 className="h-5 w-5 animate-spin text-[#008000]" />
        <span className="text-sm">Searching for &ldquo;{query}&rdquo;…</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <GlassPanel className="p-8 text-center">
        <SearchX className="mx-auto mb-3 h-8 w-8 text-[var(--color-fg-soft)]" />
        <p className="text-sm text-[var(--color-fg-soft)]">{state.error}</p>
      </GlassPanel>
    );
  }

  if (state.count === 0) {
    return (
      <GlassPanel className="p-10 text-center">
        <SearchX className="mx-auto mb-4 h-10 w-10 text-[var(--color-fg-soft)]" />
        <h2 className="font-display text-xl font-bold text-[var(--color-fg)]">
          No results for &ldquo;{query}&rdquo;
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-fg-soft)]">
          Try a different keyword, a species name, or a broader term like
          &ldquo;raptors&rdquo; or &ldquo;conservation&rdquo;.
        </p>
      </GlassPanel>
    );
  }

  return (
    <div>
      <div className="mb-6 text-sm text-[var(--color-fg-soft)]">
        <span className="font-semibold text-[var(--color-fg)]">{state.count}</span>{' '}
        {state.count === 1 ? 'result' : 'results'} for{' '}
        <span className="font-semibold text-[var(--color-fg)]">
          &ldquo;{query}&rdquo;
        </span>
      </div>

      <ul className="grid gap-4">
        {state.results.map((r) => {
          const thumb = pickCoverThumb(r.cover);
          return (
            <li key={r.id || r.slug}>
              <Link
                href={`/posts/${r.slug}`}
                className="group flex flex-col gap-4 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 transition-all duration-200 hover:border-[#008000]/40 hover:bg-[#008000]/5 sm:flex-row sm:p-5"
              >
                {thumb && (
                  // Decorative thumbnail; intentionally <img> (cover URLs come
                  // from various external/Supabase storage hosts not configured
                  // in next/image domains).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    loading="lazy"
                    className="h-40 w-full flex-shrink-0 rounded-xl object-cover sm:h-28 sm:w-44"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                    {r.category && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#008000]/12 px-2.5 py-0.5 text-[#008000]">
                        {r.category}
                      </span>
                    )}
                    {r.label && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] px-2.5 py-0.5 text-[var(--color-fg-soft)]">
                        <Tag className="h-2.5 w-2.5" />
                        {r.label}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-bold leading-snug text-[var(--color-fg)] transition-colors duration-200 group-hover:text-[#008000] sm:text-xl">
                    {r.title}
                  </h3>
                  {r.excerpt && (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[var(--color-fg-soft)]">
                      {r.excerpt}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-[var(--color-fg-soft)]">
                    {r.createdAt && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(r.createdAt)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 font-semibold text-[#008000] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      Read more
                      <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, X, Folder, Tag, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { categories, allLabels, labelSlug } from '@/lib/mock/categories';

export function SearchToggle() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const seqRef = useRef(0);

  // Edge-cached, title-only suggest endpoint — scales without loading all posts.
  useEffect(() => {
    if (!open) return undefined;
    const q = query.trim();
    clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    debounceRef.current = setTimeout(async () => {
      const seq = ++seqRef.current;
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}&limit=8`);
        const json = await res.json();
        if (seq === seqRef.current) {
          setResults(json.success ? (json.suggestions || []) : []);
        }
      } catch {
        if (seq === seqRef.current) setResults([]);
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  // Static (in-bundle) filters — no network call needed.
  const categoryResults = query.length > 1
    ? categories.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : [];
  const labelResults = query.length > 1
    ? allLabels.filter((l) => l.label.toLowerCase().includes(query.toLowerCase())).slice(0, 4)
    : [];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKey);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const goToFullResults = () => {
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setOpen(false);
    setQuery('');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    goToFullResults();
  };

  const close = () => { setOpen(false); setQuery(''); };
  const hasInput = query.length > 1;
  const hasResults = results.length > 0 || categoryResults.length > 0 || labelResults.length > 0;

  return (
    <>
      <button
        aria-label="Open search"
        onClick={() => setOpen(true)}
        className="glass flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 hover:border-[var(--color-primary)]"
      >
        <Search className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 pt-24 backdrop-blur-md sm:pt-32"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={onSubmit} className="glass overflow-hidden rounded-2xl">
                <div className="flex items-center gap-3 px-5 py-4">
                  <Search className="h-5 w-5 text-[var(--color-primary)]" />
                  <input
                    autoFocus
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search animals, plants, birds, posts…"
                    className="flex-1 bg-transparent text-base outline-none placeholder:text-[var(--color-fg-soft)]"
                    enterKeyHint="search"
                  />
                  {loading && (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-fg-soft)]" />
                  )}
                  <button
                    type="button"
                    aria-label="Close search"
                    onClick={close}
                    className="rounded-full p-1.5 transition-colors hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="border-t border-[var(--glass-border)] px-5 py-6 text-sm text-[var(--color-fg-soft)] max-h-[60vh] overflow-y-auto wu-no-scrollbar">
                  {!hasInput && (
                    <div className="py-8 text-center">
                      <p>Start typing to search across the platform.</p>
                    </div>
                  )}

                  {hasInput && !loading && !hasResults && (
                    <div className="py-8 text-center">
                      <p>No results found for &ldquo;{query}&rdquo;.</p>
                    </div>
                  )}

                  {hasInput && hasResults && (
                    <div className="flex flex-col gap-6">

                      {/* Categories */}
                      {categoryResults.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-soft)] opacity-60">
                            Categories
                          </span>
                          {categoryResults.map((c) => (
                            <Link
                              key={c.slug}
                              href={`/${c.slug}`}
                              onClick={close}
                              className="group flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            >
                              <span className="flex items-center gap-2.5 font-bold text-[var(--color-primary)]">
                                <Folder className="h-4 w-4 opacity-80" /> {c.name} Content
                              </span>
                              <span className="text-xs uppercase tracking-wide opacity-50">View Category</span>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Labels */}
                      {labelResults.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-soft)] opacity-60">
                            Specific Labels
                          </span>
                          {labelResults.map((l) => (
                            <Link
                              key={labelSlug(l.label) + l.slug}
                              href={`/${l.slug}/${labelSlug(l.label)}`}
                              onClick={close}
                              className="group flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            >
                              <span className="flex items-center gap-2.5 font-bold text-[var(--color-fg)]">
                                <Tag className="h-4 w-4 opacity-70 text-[var(--color-primary)]" /> {l.label}
                              </span>
                              <span className="text-xs tracking-wide opacity-60">in {l.category}</span>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Articles (from /api/search/suggest) */}
                      <div className="flex flex-col gap-2">
                        <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-soft)] opacity-60">
                          Published Articles
                        </span>
                        {results.length > 0 ? results.map((post) => (
                          <Link
                            key={post.id}
                            href={`/posts/${post.slug}`}
                            onClick={close}
                            className="group flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            <span className="font-semibold text-[var(--color-fg)] group-hover:text-[var(--color-primary)] truncate">
                              {post.title}
                            </span>
                            {post.category && (
                              <span className="ml-3 flex-shrink-0 rounded-full bg-[var(--glass-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-fg-soft)]">
                                {post.category}
                              </span>
                            )}
                          </Link>
                        )) : (
                          <div className="px-3 py-2 text-[13px] opacity-70">
                            {loading ? 'Searching…' : `No exact article titles match "${query}".`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* View all results footer */}
                {hasInput && (
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 border-t border-[var(--glass-border)] px-5 py-3 text-sm font-bold uppercase tracking-wider text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/5"
                  >
                    View all results for &ldquo;{query}&rdquo; <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Search, X, Folder, Tag, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { db } from '@/lib/storage/db';
import { categories, allLabels, labelSlug } from '@/lib/mock/categories';

function resolveCoverSrc(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  const sources = cover.sources;
  if (!sources?.length) return null;
  return sources[sources.length - 1]?.src || null;
}

export function SearchToggle() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [allPosts, setAllPosts] = useState([]);

  useEffect(() => {
    if (open && allPosts.length === 0) {
      db.posts.list().then((posts) => setAllPosts(posts));
    }
  }, [open, allPosts.length]);

  const results = query.length > 1 
    ? allPosts.filter(p => 
        (p.title || '').toLowerCase().includes(query.toLowerCase()) || 
        (p.description || '').toLowerCase().includes(query.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(query.toLowerCase()) ||
        (p.label || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const categoryResults = query.length > 1
    ? categories.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : [];

  const labelResults = query.length > 1
    ? allLabels.filter(l => l.label.toLowerCase().includes(query.toLowerCase())).slice(0, 4)
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
              <div className="glass overflow-hidden rounded-2xl">
                <div className="flex items-center gap-3 px-5 py-4">
                  <Search className="h-5 w-5 text-[var(--color-primary)]" />
                  <input
                    autoFocus
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search animals, plants, birds, posts…"
                    className="flex-1 bg-transparent text-base outline-none placeholder:text-[var(--color-fg-soft)]"
                  />
                  <button
                    aria-label="Close search"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-1.5 transition-colors hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="border-t border-[var(--glass-border)] px-5 py-6 text-sm text-[var(--color-fg-soft)] max-h-[60vh] overflow-y-auto wu-no-scrollbar">
                  {query.length > 1 ? (
                    (results.length > 0 || categoryResults.length > 0 || labelResults.length > 0) ? (
                      <div className="flex flex-col gap-6">
                        
                        {/* Categories List */}
                        {categoryResults.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-soft)] opacity-60">
                              Categories
                            </span>
                            {categoryResults.map((c) => (
                              <Link 
                                key={c.slug} 
                                href={`/${c.slug}`}
                                onClick={() => { setOpen(false); setQuery(''); }}
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

                        {/* Labels List */}
                        {labelResults.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-soft)] opacity-60">
                              Specific Labels
                            </span>
                            {labelResults.map((l) => (
                              <Link 
                                key={labelSlug(l.label) + l.slug} 
                                href={`/${l.slug}/${labelSlug(l.label)}`}
                                onClick={() => { setOpen(false); setQuery(''); }}
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

                        {/* Articles List */}
                        <div className="flex flex-col gap-2">
                          <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-soft)] opacity-60">
                            Published Articles
                          </span>
                          {results.length > 0 ? results.map((post) => {
                            const coverSrc = resolveCoverSrc(post.cover);
                            const palette = post.coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' };
                            return (
                              <Link 
                                key={post.id} 
                                href={`/posts/${post.slug}`}
                                onClick={() => { setOpen(false); setQuery(''); }}
                                className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              >
                                {/* Thumbnail */}
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg shadow-sm" style={{ background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)` }}>
                                  {coverSrc && (
                                    <img src={coverSrc} alt={post.title} className="h-full w-full object-cover" loading="lazy" />
                                  )}
                                </div>
                                {/* Content info */}
                                <div className="flex flex-col gap-1 min-w-0">
                                  <span className="flex items-center gap-2 font-bold leading-tight text-[var(--color-fg)] transition-colors group-hover:text-[var(--color-primary)] truncate">
                                    {post.title}
                                  </span>
                                  <span className="line-clamp-1 text-[12px] opacity-80 leading-snug">
                                    {post.description}
                                  </span>
                                </div>
                              </Link>
                            )
                          }) : (
                            <div className="px-3 py-2 text-[13px] opacity-70">No exact article titles match "{query}".</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <p>No results found for "{query}".</p>
                      </div>
                    )
                  ) : (
                    <div className="py-8 text-center">
                      <p>Start typing to search across the platform.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

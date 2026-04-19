'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SearchToggle() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

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
                <div className="border-t border-[var(--glass-border)] px-5 py-6 text-sm text-[var(--color-fg-soft)]">
                  {query ? (
                    <p>
                      No results yet — search will be live in the next round.
                    </p>
                  ) : (
                    <p>Start typing to search across the platform.</p>
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

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export function SearchBox({
  initialQuery = '',
  placeholder = 'Search wildlife stories, species, conservation…',
  size = 'md',
  autoFocus = false,
  className = '',
  enableSuggestions = true,
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const fetchSeqRef = useRef(0);

  useEffect(() => { setValue(initialQuery); }, [initialQuery]);

  useEffect(() => {
    if (!enableSuggestions) return undefined;
    const q = value.trim();
    clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }
    debounceRef.current = setTimeout(async () => {
      const seq = ++fetchSeqRef.current;
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (seq === fetchSeqRef.current) {
          setSuggestions(json.success ? (json.suggestions || []) : []);
        }
      } catch {
        if (seq === fetchSeqRef.current) setSuggestions([]);
      } finally {
        if (seq === fetchSeqRef.current) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [value, enableSuggestions]);

  useEffect(() => {
    if (!open) return undefined;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const navigateToResults = useCallback((q) => {
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setOpen(false);
  }, [router]);

  function onSubmit(e) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      router.push(`/posts/${suggestions[activeIdx].slug}`);
      setOpen(false);
      return;
    }
    navigateToResults(q);
  }

  function onKeyDown(e) {
    if (!open || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && enableSuggestions && value.trim().length >= 2) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  function clear() {
    setValue('');
    setSuggestions([]);
    setActiveIdx(-1);
  }

  const showDropdown = enableSuggestions && open && value.trim().length >= 2;

  const sizing =
    size === 'lg'
      ? 'h-14 pl-14 pr-12 text-base sm:text-lg'
      : size === 'sm'
        ? 'h-10 pl-10 pr-9 text-sm'
        : 'h-12 pl-12 pr-10 text-sm sm:text-base';

  const iconSize =
    size === 'lg' ? 'h-5 w-5 left-5' : size === 'sm' ? 'h-4 w-4 left-3.5' : 'h-4.5 w-4.5 left-4';

  const rightPos = size === 'lg' ? 'right-4' : size === 'sm' ? 'right-3' : 'right-3.5';

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`}>
      <form role="search" onSubmit={onSubmit} className="relative w-full">
        <Search
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--color-fg-soft)] ${iconSize}`}
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => { if (value.trim().length >= 2) setOpen(true); }}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Search"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          className={`w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-soft)] outline-none transition-all duration-200 focus:border-[#008000]/60 focus:ring-2 focus:ring-[#008000]/20 ${sizing}`}
          autoComplete="off"
          spellCheck="false"
          enterKeyHint="search"
        />
        <div className={`absolute top-1/2 -translate-y-1/2 ${rightPos} flex items-center gap-1.5`}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-fg-soft)]" />}
          {value && !loading && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="inline-flex items-center justify-center rounded-full p-1 text-[var(--color-fg-soft)] transition-colors hover:text-[var(--color-fg)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div
          className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border bg-[var(--color-bg,white)] shadow-2xl"
          style={{ borderColor: 'var(--glass-border)' }}
          role="listbox"
        >
          {suggestions.length === 0 && !loading && (
            <div className="px-4 py-3 text-sm text-[var(--color-fg-soft)]">No matches.</div>
          )}
          {suggestions.map((s, i) => (
            <Link
              key={s.id}
              href={`/posts/${s.slug}`}
              onClick={() => setOpen(false)}
              onMouseEnter={() => setActiveIdx(i)}
              role="option"
              aria-selected={activeIdx === i}
              className={`flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors ${
                activeIdx === i ? 'bg-[#008000]/10' : ''
              }`}
            >
              <span className="truncate font-medium text-[var(--color-fg)]">{s.title}</span>
              {s.category && (
                <span className="flex-shrink-0 rounded-full bg-[var(--glass-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-fg-soft)]">
                  {s.category}
                </span>
              )}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => navigateToResults(value.trim())}
            className="block w-full border-t px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[#008000] transition-colors hover:bg-[#008000]/5"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            View all results for &ldquo;{value.trim()}&rdquo; →
          </button>
        </div>
      )}
    </div>
  );
}

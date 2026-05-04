'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export function SearchBox({
  initialQuery = '',
  placeholder = 'Search wildlife stories, species, conservation…',
  size = 'md',
  autoFocus = false,
  className = '',
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  // Keep the input in sync if a parent re-renders with a different query
  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  function onSubmit(e) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function clear() {
    setValue('');
  }

  const sizing =
    size === 'lg'
      ? 'h-14 pl-14 pr-12 text-base sm:text-lg'
      : size === 'sm'
        ? 'h-10 pl-10 pr-9 text-sm'
        : 'h-12 pl-12 pr-10 text-sm sm:text-base';

  const iconSize =
    size === 'lg' ? 'h-5 w-5 left-5' : size === 'sm' ? 'h-4 w-4 left-3.5' : 'h-4.5 w-4.5 left-4';

  const clearSize =
    size === 'lg' ? 'h-5 w-5 right-4' : size === 'sm' ? 'h-3.5 w-3.5 right-3' : 'h-4 w-4 right-3.5';

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={`relative w-full ${className}`}
    >
      <Search
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--color-fg-soft)] ${iconSize}`}
        aria-hidden="true"
      />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label="Search"
        className={`w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-soft)] outline-none transition-all duration-200 focus:border-[#008000]/60 focus:ring-2 focus:ring-[#008000]/20 ${sizing}`}
        autoComplete="off"
        spellCheck="false"
        enterKeyHint="search"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className={`absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full p-1 text-[var(--color-fg-soft)] transition-colors hover:text-[var(--color-fg)] ${clearSize}`}
        >
          <X className="h-full w-full" />
        </button>
      )}
    </form>
  );
}

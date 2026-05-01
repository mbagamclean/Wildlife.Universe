'use client';

import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function PostError({ error, reset }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] p-10 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#008000]">Something went wrong</p>
        <h1 className="mb-3 font-display text-2xl font-black text-[var(--color-fg)]">
          Could not load this post
        </h1>
        <p className="mb-6 text-sm text-[var(--color-fg-soft)]">
          {error?.message || 'An unexpected error occurred while loading the article.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-full bg-[#008000] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#006400]"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <Link
            href="/posts"
            className="flex items-center gap-2 rounded-full border border-[var(--glass-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-bg)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to posts
          </Link>
        </div>
      </div>
    </div>
  );
}

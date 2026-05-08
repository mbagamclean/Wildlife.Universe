import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function buildHref(basePath, page) {
  if (page <= 1) return basePath;
  const sep = basePath.includes('?') ? '&' : '?';
  return `${basePath}${sep}page=${page}`;
}

export function Pagination({ basePath, page, totalPages }) {
  if (totalPages <= 1) return null;

  const prev = page > 1 ? buildHref(basePath, page - 1) : null;
  const next = page < totalPages ? buildHref(basePath, page + 1) : null;

  const numbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const baseLink =
    'inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-4 py-2 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--glass-border)]';
  const activeLink =
    'inline-flex items-center justify-center rounded-full bg-[#008000] px-4 py-2 text-sm font-semibold text-white pointer-events-none';
  const disabledLink =
    'inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-4 py-2 text-sm font-medium text-[var(--color-fg-soft)] opacity-50 pointer-events-none';

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {prev ? (
        <Link href={prev} rel="prev" className={baseLink} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="ml-1">Prev</span>
        </Link>
      ) : (
        <span className={disabledLink} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="ml-1">Prev</span>
        </span>
      )}

      {numbers.map((n) =>
        n === page ? (
          <span key={n} className={activeLink} aria-current="page">
            {n}
          </span>
        ) : (
          <Link key={n} href={buildHref(basePath, n)} className={baseLink}>
            {n}
          </Link>
        ),
      )}

      {next ? (
        <Link href={next} rel="next" className={baseLink} aria-label="Next page">
          <span className="mr-1">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className={disabledLink} aria-disabled="true">
          <span className="mr-1">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}

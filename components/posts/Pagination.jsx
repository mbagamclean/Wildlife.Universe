import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

/**
 * Server-rendered pagination — every control is a real <Link> so
 * crawlers (and JS-disabled users) can navigate. No client state.
 *
 * The `basePath` prop is the listing URL without the `?page=` query —
 * e.g. "/animals" or "/animals/mammals". Page 1 hrefs to the bare
 * basePath (no `?page=1`) so the canonical URL doesn't fragment.
 */
function buildHref(basePath, page) {
  if (page <= 1) return basePath;
  const sep = basePath.includes('?') ? '&' : '?';
  return `${basePath}${sep}page=${page}`;
}

/**
 * Token list for the page-number row.
 *
 *   total ≤ 7 → render every page (no ellipsis needed).
 *   else      → render [1, current-1, current, current+1, total]
 *               de-duplicated and sorted, with "…" between any two
 *               numbers that aren't adjacent.
 *
 * Examples:
 *   buildPageTokens(5, 50)  → [1, "…", 4, 5, 6, "…", 50]
 *   buildPageTokens(1, 50)  → [1, 2, "…", 50]
 *   buildPageTokens(50, 50) → [1, "…", 49, 50]
 *   buildPageTokens(3, 5)   → [1, 2, 3, 4, 5]
 */
function buildPageTokens(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const wanted = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const tokens = [];
  for (let i = 0; i < wanted.length; i++) {
    if (i > 0 && wanted[i] - wanted[i - 1] > 1) tokens.push('…');
    tokens.push(wanted[i]);
  }
  return tokens;
}

const baseBtn =
  'inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-3 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--glass-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]';
const activeBtn =
  'inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-3 text-sm font-semibold text-white shadow-sm pointer-events-none';
const disabledBtn =
  'inline-flex h-11 min-w-11 cursor-not-allowed items-center justify-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-3 text-sm font-medium text-[var(--color-fg-soft)] opacity-40';

function NavButton({
  href,
  label,
  icon: Icon,
  iconPosition = 'left',
  rel,
  ariaLabel,
}) {
  const labelEl = label ? <span className="hidden sm:inline">{label}</span> : null;
  const iconEl = Icon ? <Icon className="h-4 w-4" aria-hidden /> : null;
  const inner =
    iconPosition === 'right' ? (
      <>
        {labelEl}
        {iconEl}
      </>
    ) : (
      <>
        {iconEl}
        {labelEl}
      </>
    );

  if (!href) {
    return (
      <span className={disabledBtn} aria-disabled="true" aria-label={ariaLabel || label}>
        {inner}
      </span>
    );
  }
  return (
    <Link href={href} rel={rel} className={baseBtn} aria-label={ariaLabel || label}>
      {inner}
    </Link>
  );
}

export function Pagination({ basePath, page, totalPages }) {
  if (totalPages <= 1) return null;

  const isFirst = page <= 1;
  const isLast = page >= totalPages;
  const tokens = buildPageTokens(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
    >
      <NavButton
        href={isFirst ? null : buildHref(basePath, 1)}
        label="First"
        icon={ChevronsLeft}
        ariaLabel="First page"
      />
      <NavButton
        href={isFirst ? null : buildHref(basePath, page - 1)}
        label="Prev"
        icon={ChevronLeft}
        rel="prev"
        ariaLabel="Previous page"
      />

      {tokens.map((t, i) =>
        t === '…' ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            className="px-1 text-sm text-[var(--color-fg-soft)] sm:px-2"
          >
            …
          </span>
        ) : t === page ? (
          <span key={t} className={activeBtn} aria-current="page">
            {t}
          </span>
        ) : (
          <Link
            key={t}
            href={buildHref(basePath, t)}
            className={baseBtn}
            aria-label={`Go to page ${t}`}
          >
            {t}
          </Link>
        ),
      )}

      <NavButton
        href={isLast ? null : buildHref(basePath, page + 1)}
        label="Next"
        icon={ChevronRight}
        iconPosition="right"
        rel="next"
        ariaLabel="Next page"
      />
      <NavButton
        href={isLast ? null : buildHref(basePath, totalPages)}
        label="Last"
        icon={ChevronsRight}
        iconPosition="right"
        ariaLabel={`Last page (${totalPages})`}
      />
    </nav>
  );
}

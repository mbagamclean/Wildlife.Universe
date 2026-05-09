import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { PostGrid } from './PostGrid';
import { Pagination } from './Pagination';
import { labelSlug } from '@/lib/mock/categories';

/**
 * CategoryView accepts the rich admin-edited metadata when present:
 *   heroImage / heroImageMobile  → if either is supplied, the section
 *                                  paints the image as a full-bleed
 *                                  background. Mobile picture is used
 *                                  on phones (≤ 640px), desktop on
 *                                  larger viewports. Falls back to the
 *                                  green gradient when neither is set.
 *   shortDescription             → preferred subtitle (overrides blurb).
 *   imageAlt                     → reserved for future <img> tag if we
 *                                  switch to a foreground image.
 */
export function CategoryView({
  category,
  name,
  blurb,
  labels,
  posts,
  page = 1,
  totalPages = 1,
  heroImage = null,
  heroImageMobile = null,
  shortDescription = '',
}) {
  const basePath = `/${category}`;
  const subtitle = shortDescription?.trim() || blurb || `Discover curated content and insights in ${name}`;
  const hasHero = Boolean(heroImage || heroImageMobile);

  return (
    <>
      <section className="relative flex h-[88vh] min-h-[640px] items-center justify-center overflow-hidden">
        {hasHero ? (
          <>
            {/* Mobile portrait/tuned image (≤ 640px). When no mobile
                upload exists, the desktop one fills both via the same
                <img> below. */}
            {heroImageMobile && (
              <img
                aria-hidden
                src={heroImageMobile}
                alt=""
                className="absolute inset-0 h-full w-full object-cover sm:hidden"
                loading="eager"
              />
            )}
            {(heroImage || heroImageMobile) && (
              <img
                aria-hidden
                src={heroImage || heroImageMobile}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover ${heroImageMobile ? 'hidden sm:block' : ''}`}
                loading="eager"
              />
            )}
            {/* Readable overlay so the eyebrow + title pop on any image. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.7) 100%)',
              }}
            />
          </>
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-[#031a0d] via-[#0c4a1a] to-[#3aa15a]"
          />
        )}
        <div aria-hidden className="absolute inset-0 dark-overlay" />
        <Container className="relative z-10 py-12 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest hero-sub-on-dark backdrop-blur">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#008000]" />
            Category
          </p>
          <h1 className="font-display text-5xl font-black hero-on-dark sm:text-6xl md:text-7xl text-balance">
            {name}
          </h1>
          <p className="mt-3 mx-auto max-w-xl text-base hero-sub-on-dark sm:text-lg">
            {subtitle}
          </p>
        </Container>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 gradient-fade-down"
        />
      </section>

      <section className="py-6 border-b border-[var(--glass-border)]">
        <Container>
          <div className="flex flex-wrap gap-2">
            <span className="cursor-default rounded-full bg-[#008000] px-5 py-2 text-sm font-semibold text-white">
              All Posts
            </span>
            {labels.map((label) => (
              <Link
                key={label}
                href={`/${category}/${labelSlug(label)}`}
                className="rounded-full bg-[var(--color-bg-deep)] border border-[var(--glass-border)] px-5 py-2 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--glass-border)] hover:text-[var(--color-fg)]"
              >
                {label}
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <PostGrid
            posts={posts}
            emptyTitle={`No ${name.toLowerCase()} posts yet`}
            emptyMessage="Sign in as the CEO and create one in the admin panel — it will show up here right away."
          />
          <Pagination basePath={basePath} page={page} totalPages={totalPages} />
        </Container>
      </section>
    </>
  );
}

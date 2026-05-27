/**
 * /wildlife-content — every published post across every category +
 * label, mixed and paginated. The "view-all" page footer links here
 * so readers can browse the whole catalog without picking a category.
 *
 * Page size: 115 per page (the design ceiling). On mobile each card
 * occupies a full row so the practical "above-the-fold" cap is closer
 * to 100; on desktop the 3-column grid surfaces ~115 cleanly without
 * overwhelming the viewport. Pagination uses ?page=N — page links are
 * plain anchors so crawlers walk the whole archive.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { PostGrid } from '@/components/posts/PostGrid';
import { Pagination } from '@/components/posts/Pagination';
import { fetchAllPostsPaginated } from '@/lib/seo-data';
import {
  buildBreadcrumbJsonLd,
  buildStaticMetadata,
  JsonLd,
  SITE_NAME,
} from '@/lib/seo';
import { Library } from 'lucide-react';

const PAGE_SIZE = 115;

function readPage(sp) {
  const n = Number.parseInt(sp?.page, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const page = readPage(sp);
  const title = page > 1
    ? `Wildlife Content — Page ${page}`
    : 'Wildlife Content — Every Story Across Every Category';
  const description =
    'Browse the entire Wildlife Universe archive — every animal, plant, bird, '
    + 'insect, conservation story, and IUCN-tracked species in one paginated feed.';
  return buildStaticMetadata({
    title,
    description,
    path: page > 1 ? `/wildlife-content?page=${page}` : '/wildlife-content',
  });
}

// ISR — refresh every 5 min so newly published posts surface promptly.
export const revalidate = 300;

export default async function WildlifeContentPage({ searchParams }) {
  const sp = await searchParams;
  const page = readPage(sp);

  const { posts, totalPages, total } = await fetchAllPostsPaginated({
    page,
    pageSize: PAGE_SIZE,
    slim: true,
  });

  // Out-of-range pages 404 so crawlers don't follow infinite pagination
  // (everyone past the last real page is treated as missing).
  if (page > 1 && page > totalPages) notFound();

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Wildlife Content', url: '/wildlife-content' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      {/* ── Cinematic header ────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-[var(--glass-border)] py-16 sm:py-20 md:py-24"
        style={{
          background:
            'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(0,128,0,0.12) 0%, var(--color-bg) 60%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-12 h-80 w-80 rounded-full opacity-[0.08] blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full opacity-[0.06] blur-3xl"
          style={{ background: 'radial-gradient(circle, #d4af37, transparent)' }}
        />
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">
              <Library className="h-3 w-3" />
              The Whole Archive
            </span>
            <h1
              className="font-display text-4xl font-black leading-[1.05] tracking-tight text-[var(--color-fg)] sm:text-5xl md:text-6xl"
            >
              Wildlife Content
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-fg-soft)] sm:text-lg">
              Every story across every category, mixed together. From the
              addax to the zebra finch, from baobabs to bee orchids —
              {total > 0 ? ` ${total.toLocaleString()} published articles` : ' the full Wildlife Universe library'},
              alphabetized newest-first.
            </p>

            {/* Anchor quick-links — categories at a glance */}
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {[
                { href: '/animals', name: 'Animals' },
                { href: '/birds',   name: 'Birds' },
                { href: '/insects', name: 'Insects' },
                { href: '/plants',  name: 'Plants' },
                { href: '/posts',   name: 'Articles' },
              ].map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className="inline-flex items-center rounded-full border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--color-fg-soft)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── Grid + pagination ───────────────────────────── */}
      <section className="py-12 md:py-16" style={{ background: 'var(--color-bg)' }}>
        <Container>
          {totalPages > 1 && (
            <p className="mb-6 text-center text-[12px] font-medium uppercase tracking-widest text-[var(--color-fg-soft)]">
              Page {page} of {totalPages} &middot; {posts.length} stories on this page
            </p>
          )}
          <PostGrid
            posts={posts}
            emptyTitle="No content published yet"
            emptyMessage="Check back soon — the autopilot is generating new stories every day."
          />
          {totalPages > 1 && (
            <div className="mt-12">
              <Pagination
                basePath="/wildlife-content"
                page={page}
                totalPages={totalPages}
              />
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

import { Search as SearchIcon } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { SearchBox } from '@/components/search/SearchBox';
import { SearchResults } from '@/components/search/SearchResults';
import {
  buildStaticMetadata,
  SITE_NAME,
  JsonLd,
  buildBreadcrumbJsonLd,
} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = buildStaticMetadata({
  title: 'Search',
  description: `Search ${SITE_NAME} — find wildlife stories, species profiles, conservation reporting, and field photography across animals, plants, birds, and insects.`,
  path: '/search',
});

export default async function SearchPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const rawQ = sp.q;
  const query = (Array.isArray(rawQ) ? rawQ[0] : rawQ || '').trim();

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Search', url: '/search' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <div
        className="min-h-screen pt-24 pb-20"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(0,128,0,0.12) 0%, var(--color-bg) 55%, var(--color-bg) 100%)',
        }}
      >
        <Container>
          <header className="mb-10 text-center">
            <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008000]/15 ring-1 ring-[#008000]/30">
              <SearchIcon className="h-7 w-7 text-[#008000]" />
            </div>
            <h1 className="font-display text-4xl font-black leading-tight tracking-tight text-[var(--color-fg)] sm:text-5xl md:text-6xl">
              Search
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--color-fg-soft)] sm:text-lg">
              Hunt across the {SITE_NAME} archive — species, ecosystems, conservation,
              and field reports.
            </p>
          </header>

          <GlassPanel className="mb-10 p-4 sm:p-6">
            <SearchBox initialQuery={query} size="lg" autoFocus={!query} />
          </GlassPanel>

          {!query ? (
            <div className="mx-auto max-w-2xl text-center text-sm text-[var(--color-fg-soft)]">
              <p>
                Try searching for a species (&ldquo;leopard&rdquo;), a region
                (&ldquo;serengeti&rdquo;), or a topic (&ldquo;conservation&rdquo;).
              </p>
            </div>
          ) : (
            <SearchResults query={query} />
          )}
        </Container>
      </div>
    </>
  );
}

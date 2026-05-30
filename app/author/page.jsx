import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { User, GraduationCap, Briefcase } from 'lucide-react';
import {
  buildStaticMetadata,
  SITE_NAME,
  SITE_URL,
  JsonLd,
  buildBreadcrumbJsonLd,
} from '@/lib/seo';
import { allAuthors } from '@/lib/seo/authors';
import { fetchAllAuthorsLive } from '@/lib/seo/authors-runtime';

// Keep allAuthors imported for the synchronous generateMetadata count below.

export const revalidate = 3600;

export async function generateMetadata() {
  return buildStaticMetadata({
    title: `Contributors — ${SITE_NAME}`,
    description: `Meet the ${allAuthors().length} wildlife biologists, ornithologists, botanists, and reporters writing for ${SITE_NAME}.`,
    path: '/author',
  });
}

function initials(name) {
  if (!name) return '?';
  const parts = name.replace(/^(Dr|Prof|Mr|Mrs|Ms|Miss)\.?\s+/i, '').split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '');
}

export default async function AuthorsIndexPage() {
  const authors = await fetchAllAuthorsLive();

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Contributors', url: '/author' },
  ]);

  // ItemList JSON-LD listing every author profile — gives Google a
  // single page enumerating the site's authorship surface.
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${SITE_NAME} contributors`,
    url: `${SITE_URL}/author`,
    numberOfItems: authors.length,
    itemListElement: authors.map((a, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${SITE_URL}/author/${a.slug}`,
      name: a.name,
    })),
  };

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={itemList} />
      <div
        className="min-h-screen pt-24 pb-20"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(0,128,0,0.12) 0%, var(--color-bg) 55%, var(--color-bg) 100%)',
        }}
      >
        <Container>
          <header className="mb-12 text-center">
            <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008000]/15 ring-1 ring-[#008000]/30">
              <User className="h-7 w-7 text-[#008000]" />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#008000]">
              Contributors
            </p>
            <h1 className="font-display text-4xl font-black leading-tight tracking-tight text-[var(--color-fg)] sm:text-5xl">
              The wildlife team behind {SITE_NAME}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--color-fg-soft)] sm:text-lg">
              Biologists, ornithologists, botanists, and conservation reporters writing the species
              profiles, field stories, and IUCN-tracked conservation coverage on this site.
            </p>
          </header>

          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => (
              <li key={author.slug}>
                <Link
                  href={`/author/${author.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 transition-all duration-200 hover:border-[#008000]/40 hover:bg-[#008000]/5"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#008000]/15 text-xl font-black text-[#008000] ring-1 ring-[#008000]/30">
                      {author.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={author.photoUrl}
                          alt={author.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span>{initials(author.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-black leading-tight text-[var(--color-fg)] transition-colors duration-200 group-hover:text-[#008000]">
                        {author.name}
                      </h2>
                      {author.title && (
                        <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-[var(--color-fg-soft)]">
                          {author.title}
                        </p>
                      )}
                    </div>
                  </div>
                  {author.bio && (
                    <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--color-fg-soft)]">
                      {author.bio}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {author.affiliation && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--color-fg-soft)]">
                        <Briefcase className="h-2.5 w-2.5" />
                        {author.affiliation.split('—')[0].trim()}
                      </span>
                    )}
                    {(author.expertise || '').split(',').slice(0, 2).map((tag) => {
                      const t = tag.trim();
                      if (!t) return null;
                      return (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-full bg-[#008000]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#008000]"
                        >
                          <GraduationCap className="h-2.5 w-2.5" />
                          {t}
                        </span>
                      );
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </>
  );
}

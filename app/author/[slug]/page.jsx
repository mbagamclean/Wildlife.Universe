import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Rss, User, Briefcase, GraduationCap } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PostGrid } from '@/components/posts/PostGrid';
import {
  buildStaticMetadata,
  SITE_NAME,
  SITE_URL,
  JsonLd,
  buildBreadcrumbJsonLd,
} from '@/lib/seo';
import { getAuthorBySlug } from '@/lib/seo/authors';
import { fetchPostsByAuthor } from '@/lib/seo-data';

export const revalidate = 1800;

function initials(name) {
  if (!name) return '?';
  const parts = name.replace(/^(Dr|Prof|Mr|Mrs|Ms|Miss)\.?\s+/i, '').split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '');
}

/**
 * Build a Person + ProfilePage JSON-LD pair. Profile pages are a
 * documented Google structured-data type that surfaces author identity
 * directly to the SERP and ties this URL to every Article whose author
 * field references it.
 */
function buildAuthorJsonLd(author) {
  const url = `${SITE_URL}/author/${author.slug}`;
  const person = {
    '@type': 'Person',
    '@id': `${url}#person`,
    name: author.name,
    url,
    ...(author.title ? { jobTitle: author.title } : {}),
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.expertise
      ? { knowsAbout: author.expertise.split(',').map((s) => s.trim()).filter(Boolean) }
      : {}),
    ...(author.affiliation
      ? { alumniOf: { '@type': 'Organization', name: author.affiliation } }
      : {}),
    ...(author.photoUrl ? { image: `${SITE_URL}${author.photoUrl}` } : {}),
    ...(author.website || author.twitter
      ? { sameAs: [author.website, author.twitter].filter(Boolean) }
      : {}),
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${url}#profile`,
    mainEntity: person,
    dateModified: new Date().toISOString().slice(0, 10),
  };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author || author.slug !== slug) {
    return { title: 'Author not found', robots: { index: false, follow: false } };
  }
  const description = author.bio
    ? author.bio.length > 160
      ? author.bio.slice(0, 157).trimEnd() + '…'
      : author.bio
    : `Wildlife stories by ${author.name} on ${SITE_NAME}.`;
  return buildStaticMetadata({
    title: `${author.name} — ${author.title || 'Author'}`,
    description,
    path: `/author/${slug}`,
  });
}

export default async function AuthorPage({ params }) {
  const { slug } = await params;
  if (!slug) notFound();
  const author = getAuthorBySlug(slug);
  if (!author || author.slug !== slug) notFound();

  const posts = await fetchPostsByAuthor(slug, { limit: 30 });

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Authors', url: '/author' },
    { name: author.name, url: `/author/${slug}` },
  ]);
  const profile = buildAuthorJsonLd(author);

  const expertiseTags = (author.expertise || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={profile} />
      <div
        className="min-h-screen pt-24 pb-20"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(0,128,0,0.12) 0%, var(--color-bg) 55%, var(--color-bg) 100%)',
        }}
      >
        <Container>
          {/* Header */}
          <header className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#008000]/15 text-3xl font-black text-[#008000] ring-2 ring-[#008000]/30">
              {author.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={author.photoUrl}
                  alt={author.name}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              ) : (
                <span>{initials(author.name)}</span>
              )}
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#008000]">
              {author.title || 'Contributor'}
            </p>
            <h1 className="font-display text-4xl font-black leading-tight tracking-tight text-[var(--color-fg)] sm:text-5xl md:text-6xl">
              {author.name}
            </h1>
            {author.bio && (
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-fg-soft)] sm:text-lg">
                {author.bio}
              </p>
            )}

            {/* Expertise + affiliation chips */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {author.affiliation && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-fg-soft)]">
                  <Briefcase className="h-3 w-3" />
                  {author.affiliation}
                </span>
              )}
              {expertiseTags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#008000]/10 px-3 py-1 text-xs font-semibold text-[#008000]"
                >
                  <GraduationCap className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                href={`/author/${slug}/rss.xml`}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm font-medium text-[var(--color-fg)] transition-all duration-200 hover:border-[#008000]/40 hover:text-[#008000]"
              >
                <Rss className="h-4 w-4" />
                RSS feed
              </Link>
              <Link
                href="/author"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm font-medium text-[var(--color-fg)] transition-all duration-200 hover:border-[#008000]/40 hover:text-[#008000]"
              >
                <User className="h-4 w-4" />
                All contributors
              </Link>
            </div>
          </header>

          {/* Posts — rendered as the same PostCard grid that category /
              label pages use, so the visual identity is consistent across
              every "browse posts by X" surface on the site. */}
          {posts.length === 0 ? (
            <GlassPanel className="p-10 text-center">
              <p className="text-sm text-[var(--color-fg-soft)]">
                No posts found by {author.name} yet.
              </p>
            </GlassPanel>
          ) : (
            <section>
              <div className="mb-6 flex items-end justify-between">
                <h2 className="font-display text-2xl font-black tracking-tight text-[var(--color-fg)] sm:text-3xl">
                  Latest stories by {author.name}
                </h2>
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-fg-soft)]">
                  {posts.length} article{posts.length === 1 ? '' : 's'}
                </span>
              </div>
              <PostGrid
                posts={posts}
                emptyTitle={`No stories yet by ${author.name}`}
                emptyMessage="Check back soon — articles are added regularly."
              />
            </section>
          )}
        </Container>
      </div>
    </>
  );
}

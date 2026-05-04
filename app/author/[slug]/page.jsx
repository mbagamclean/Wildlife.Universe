import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Rss, User, Calendar, Tag } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { GlassPanel } from '@/components/ui/GlassPanel';
import {
  buildStaticMetadata,
  SITE_NAME,
  JsonLd,
  buildBreadcrumbJsonLd,
} from '@/lib/seo';
import { fetchPostsByAuthor, fetchAuthorDisplayName } from '@/lib/seo-data';

export const revalidate = 1800;

function deslug(slug) {
  if (!slug) return '';
  return slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function pickCoverThumb(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  if (cover?.type === 'video') return null;
  const src = cover?.sources?.[cover?.sources?.length - 1]?.src;
  return src || null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!slug) return { title: 'Author' };
  const display = (await fetchAuthorDisplayName(slug)) || deslug(slug);
  return buildStaticMetadata({
    title: `${display} — Author`,
    description: `Wildlife stories by ${display} on ${SITE_NAME} — field reports, conservation, and species profiles.`,
    path: `/author/${slug}`,
  });
}

export default async function AuthorPage({ params }) {
  const { slug } = await params;
  if (!slug) notFound();

  const posts = await fetchPostsByAuthor(slug, { limit: 30 });
  const displayName = (await fetchAuthorDisplayName(slug)) || deslug(slug);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Authors', url: '/' },
    { name: displayName, url: `/author/${slug}` },
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
          {/* Header */}
          <header className="mb-10 text-center">
            <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008000]/15 ring-1 ring-[#008000]/30">
              <User className="h-7 w-7 text-[#008000]" />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#008000]">
              Contributor
            </p>
            <h1 className="font-display text-4xl font-black leading-tight tracking-tight text-[var(--color-fg)] sm:text-5xl md:text-6xl">
              {displayName}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--color-fg-soft)] sm:text-lg">
              Wildlife journalist contributing to {SITE_NAME}.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link
                href={`/author/${slug}/rss.xml`}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm font-medium text-[var(--color-fg)] transition-all duration-200 hover:border-[#008000]/40 hover:text-[#008000]"
              >
                <Rss className="h-4 w-4" />
                RSS feed
              </Link>
            </div>
          </header>

          {/* Posts */}
          {posts.length === 0 ? (
            <GlassPanel className="p-10 text-center">
              <p className="text-sm text-[var(--color-fg-soft)]">
                No posts found by this author yet.
              </p>
            </GlassPanel>
          ) : (
            <section>
              <h2 className="mb-5 font-display text-2xl font-black tracking-tight text-[var(--color-fg)]">
                Latest stories
              </h2>
              <ul className="grid gap-4">
                {posts.map((post) => {
                  const thumb = pickCoverThumb(post.cover);
                  return (
                    <li key={post.id || post.slug}>
                      <Link
                        href={`/posts/${post.slug}`}
                        className="group flex flex-col gap-4 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 transition-all duration-200 hover:border-[#008000]/40 hover:bg-[#008000]/5 sm:flex-row sm:p-5"
                      >
                        {thumb && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt=""
                            loading="lazy"
                            className="h-40 w-full flex-shrink-0 rounded-xl object-cover sm:h-28 sm:w-44"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            {post.category && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#008000]/12 px-2.5 py-0.5 text-[#008000]">
                                {post.category}
                              </span>
                            )}
                            {post.label && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] px-2.5 py-0.5 text-[var(--color-fg-soft)]">
                                <Tag className="h-2.5 w-2.5" />
                                {post.label}
                              </span>
                            )}
                          </div>
                          <h3 className="font-display text-lg font-bold leading-snug text-[var(--color-fg)] transition-colors duration-200 group-hover:text-[#008000] sm:text-xl">
                            {post.title}
                          </h3>
                          {post.description && (
                            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[var(--color-fg-soft)]">
                              {post.description}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-4 text-xs text-[var(--color-fg-soft)]">
                            {post.createdAt && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(post.createdAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </Container>
      </div>
    </>
  );
}

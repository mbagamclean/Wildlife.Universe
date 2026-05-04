import Link from 'next/link';
import { Rss, ExternalLink, BookOpen, Calendar } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { fetchPublishedPosts } from '@/lib/seo-data';
import { buildStaticMetadata, SITE_URL, SITE_NAME, JsonLd, buildBreadcrumbJsonLd } from '@/lib/seo';
import { CopyFeedButton } from './CopyFeedButton';

export const revalidate = 1800;

const FEED_URL = `${SITE_URL}/rss.xml`;

export const metadata = buildStaticMetadata({
  title: 'RSS Feed',
  description: `Subscribe to the ${SITE_NAME} RSS feed — the latest wildlife stories, species profiles, and conservation reporting delivered to your reader of choice.`,
  path: '/rss',
});

const READERS = [
  { name: 'Feedly', url: 'https://feedly.com/i/subscription/feed%2F', appendFeed: true },
  { name: 'Inoreader', url: 'https://www.inoreader.com/?add_feed=', appendFeed: true },
  { name: 'NewsBlur', url: 'https://newsblur.com/?url=', appendFeed: true },
  { name: 'Reeder', url: 'reeder://subscribe/', appendFeed: true },
  { name: 'NetNewsWire', url: 'feed:', appendFeed: true },
];

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

export default async function RssPage() {
  const posts = await fetchPublishedPosts({ limit: 20 });

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'RSS', url: '/rss' },
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
          {/* Hero */}
          <header className="mb-10 text-center">
            <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008000]/15 ring-1 ring-[#008000]/30">
              <Rss className="h-7 w-7 text-[#008000]" />
            </div>
            <h1 className="font-display text-4xl font-black leading-tight tracking-tight text-[var(--color-fg)] sm:text-5xl md:text-6xl">
              RSS Feed
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--color-fg-soft)] sm:text-lg">
              Get the latest {SITE_NAME} stories delivered to your favorite reader —
              no algorithms, no ads, just signal.
            </p>
          </header>

          {/* Feed URL block */}
          <GlassPanel className="mb-10 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#008000]">
                  Feed URL
                </div>
                <code className="block truncate font-mono text-sm text-[var(--color-fg)] sm:text-base">
                  {FEED_URL}
                </code>
              </div>
              <CopyFeedButton url={FEED_URL} />
            </div>
          </GlassPanel>

          {/* What is RSS */}
          <section className="mb-10 grid gap-6 md:grid-cols-2">
            <GlassPanel className="p-6">
              <div className="mb-3 flex items-center gap-2 text-[#008000]">
                <BookOpen className="h-5 w-5" />
                <h2 className="font-display text-lg font-bold">What is RSS?</h2>
              </div>
              <p className="text-sm leading-relaxed text-[var(--color-fg-soft)]">
                RSS (Really Simple Syndication) is an open web standard that lets you
                subscribe to updates from any site without giving up your email or
                getting tracked. Add the feed URL above to any RSS reader and new
                {' '}{SITE_NAME} stories will appear automatically.
              </p>
            </GlassPanel>

            <GlassPanel className="p-6">
              <div className="mb-3 flex items-center gap-2 text-[#008000]">
                <Rss className="h-5 w-5" />
                <h2 className="font-display text-lg font-bold">Popular readers</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {READERS.map((r) => (
                  <a
                    key={r.name}
                    href={r.appendFeed ? `${r.url}${encodeURIComponent(FEED_URL)}` : r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-fg)] transition-all duration-200 hover:border-[#008000]/40 hover:text-[#008000]"
                  >
                    {r.name}
                    <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                  </a>
                ))}
              </div>
            </GlassPanel>
          </section>

          {/* Latest posts */}
          {posts.length > 0 && (
            <section>
              <h2 className="mb-5 font-display text-2xl font-black tracking-tight text-[var(--color-fg)]">
                Latest in the feed
              </h2>
              <ul className="grid gap-3">
                {posts.map((post) => (
                  <li key={post.id || post.slug}>
                    <Link
                      href={`/posts/${post.slug}`}
                      className="group flex items-start justify-between gap-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 transition-all duration-200 hover:border-[#008000]/30 hover:bg-[#008000]/5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[var(--color-fg)] transition-colors duration-200 group-hover:text-[#008000]">
                          {post.title}
                        </div>
                        {post.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-fg-soft)]">
                            {post.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-fg-soft)]">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(post.createdAt)}
                          </span>
                          {post.category && (
                            <span className="rounded-full bg-[#008000]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#008000]">
                              {post.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </Container>
      </div>
    </>
  );
}

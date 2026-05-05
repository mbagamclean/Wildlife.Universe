/**
 * /sitemap — public, human-readable site map.
 *
 * Server-rendered, so every link is visible to search engines on first
 * request. Auto-includes:
 *   - the XML sitemaps (index + 5 specialized children)
 *   - static + legal pages from lib/seo/static-pages.js
 *   - all categories + labels from lib/mock/categories.js
 *   - every published post from Supabase (via lib/seo-data)
 *
 * Visual identity matches the Wildlife Universe dark + gold theme used
 * throughout the site (Footer, posts).
 */

import Link from 'next/link';
import {
  Map,
  Globe,
  ChevronRight,
  Folder,
  Tag,
  FileText,
  Info,
  ExternalLink,
  Scale,
  Newspaper,
  ImageIcon,
  Video,
  ArrowLeft,
} from 'lucide-react';
import { categories, labelSlug } from '@/lib/mock/categories';
import { fetchPublishedPosts } from '@/lib/seo-data';
import { staticPagesByGroup } from '@/lib/seo/static-pages';
import { buildStaticMetadata, SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = buildStaticMetadata({
  title: 'Sitemap',
  description:
    'A complete index of every page, post, category, image, and video on Wildlife Universe — auto-updated as new content is published.',
  path: '/sitemap',
});

const XML_SITEMAPS = [
  {
    label: 'Sitemap Index',
    href: '/sitemap.xml',
    desc: 'Master index of every sitemap',
    icon: Globe,
  },
  {
    label: 'Pages Sitemap',
    href: '/authoritative-sitemap.xml',
    desc: 'Home, legal, marketing pages',
    icon: FileText,
  },
  {
    label: 'Posts Sitemap',
    href: '/posts-sitemap.xml',
    desc: 'Every published article',
    icon: Newspaper,
  },
  {
    label: 'Categories Sitemap',
    href: '/category-sitemap.xml',
    desc: 'Categories &amp; topic labels',
    icon: Folder,
  },
  {
    label: 'Image Sitemap',
    href: '/image-sitemap.xml',
    desc: 'Every image on the site',
    icon: ImageIcon,
  },
  {
    label: 'Video Sitemap',
    href: '/video-sitemap.xml',
    desc: 'Hero &amp; embedded videos',
    icon: Video,
  },
];

const SECTION_GROUPS = [
  { id: 'main', label: 'Main Pages', icon: Info },
  { id: 'company', label: 'Company', icon: Info },
  { id: 'legal', label: 'Legal &amp; Editorial', icon: Scale },
];

/* ── tiny presentational helpers ─────────────────────────── */

function SectionHeading({ icon: Icon, title, count, accent = '#d4af37' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.1rem' }}>
      <span
        style={{
          width: '2rem',
          height: '2rem',
          borderRadius: '0.6rem',
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.25)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          flexShrink: 0,
        }}
      >
        <Icon size={15} />
      </span>
      <h2
        style={{
          fontSize: '1.15rem',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: '#fff',
          margin: 0,
        }}
      >
        {title}
      </h2>
      {count != null && (
        <span
          style={{
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '0.15rem 0.55rem',
            borderRadius: '9999px',
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function LinkCard({ href, label, sub, icon: Icon, external, accent = '#d4af37' }) {
  const Component = external ? 'a' : Link;
  const extProps = external
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { href };
  return (
    <Component
      {...extProps}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.7rem',
        padding: '0.85rem 1rem',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '0.85rem',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 0.18s, border-color 0.18s, transform 0.18s',
      }}
      className="wu-sitemap-card"
    >
      {Icon && (
        <Icon
          size={15}
          style={{ color: accent, flexShrink: 0, marginTop: '0.18rem' }}
          aria-hidden="true"
        />
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            color: 'rgba(255,255,255,0.92)',
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}
        >
          {label}
        </span>
        {sub && (
          <span
            style={{
              display: 'block',
              color: 'rgba(255,255,255,0.45)',
              fontSize: '0.72rem',
              marginTop: '0.2rem',
            }}
          >
            {sub}
          </span>
        )}
      </span>
      {external && (
        <ExternalLink
          size={12}
          style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0, marginTop: '0.25rem' }}
          aria-hidden="true"
        />
      )}
    </Component>
  );
}

/* ── main page ─────────────────────────────────────────── */

export default async function SitemapPage() {
  const posts = await fetchPublishedPosts();
  const groups = staticPagesByGroup();

  // Bucket posts by category slug for the per-category lists below.
  const postsByCategory = {};
  for (const p of posts) {
    if (!p?.slug || !p?.category) continue;
    if (!postsByCategory[p.category]) postsByCategory[p.category] = [];
    postsByCategory[p.category].push(p);
  }

  const totalLabels = categories.reduce((n, c) => n + c.labels.length, 0);

  return (
    <main style={{ background: '#0d1210', color: 'rgba(255,255,255,0.85)', minHeight: '100vh' }}>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        style={{
          background:
            'linear-gradient(135deg, #0c4a1a 0%, #143a23 50%, #1f2a20 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.18)',
          padding: '4rem 1.5rem 3rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Soft gold glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 75% 20%, rgba(212,175,55,0.18), transparent 50%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ maxWidth: '1180px', margin: '0 auto', position: 'relative' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.8rem',
              textDecoration: 'none',
              marginBottom: '1.4rem',
              transition: 'color 0.18s',
            }}
            className="wu-back-link"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.7rem' }}>
            <span
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '0.85rem',
                background: 'rgba(212,175,55,0.15)',
                border: '1px solid rgba(212,175,55,0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d4af37',
              }}
            >
              <Map size={22} />
            </span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#d4af37',
                }}
              >
                Wildlife Universe
              </p>
              <h1
                style={{
                  fontSize: 'clamp(1.85rem, 3.2vw, 2.6rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  color: '#fff',
                  margin: '0.15rem 0 0',
                  lineHeight: 1.1,
                }}
              >
                Sitemap
              </h1>
            </div>
          </div>

          <p
            style={{
              maxWidth: '640px',
              color: 'rgba(255,255,255,0.62)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            A complete index of every page, post, category, image, and video on Wildlife
            Universe. Auto-updated whenever new content is published — and submitted to
            search engines as soon as it&apos;s live.
          </p>

          {/* Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.7rem',
              marginTop: '2rem',
              maxWidth: '720px',
            }}
          >
            {[
              { num: posts.length, label: 'Posts' },
              { num: categories.length, label: 'Categories' },
              { num: totalLabels, label: 'Topic Labels' },
              {
                num:
                  (groups.main?.length || 0) +
                  (groups.company?.length || 0) +
                  (groups.legal?.length || 0),
                label: 'Static Pages',
              },
              { num: XML_SITEMAPS.length, label: 'XML Sitemaps' },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(212,175,55,0.22)',
                  borderRadius: '0.75rem',
                  padding: '0.7rem 0.95rem',
                }}
              >
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#d4af37', lineHeight: 1 }}>
                  {s.num}
                </div>
                <div
                  style={{
                    fontSize: '0.66rem',
                    color: 'rgba(255,255,255,0.55)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginTop: '0.3rem',
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BODY ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
        {/* XML Sitemaps */}
        <section style={{ marginBottom: '3rem' }}>
          <SectionHeading icon={Globe} title="XML Sitemaps" count={XML_SITEMAPS.length} />
          <p style={{ marginTop: '-0.6rem', marginBottom: '1.1rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
            Submit <code style={{ color: '#d4af37' }}>{SITE_URL}/sitemap.xml</code> to Google Search Console and Bing Webmaster Tools.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '0.6rem',
            }}
          >
            {XML_SITEMAPS.map(({ label, href, desc, icon }) => (
              <LinkCard
                key={href}
                href={href}
                label={label}
                sub={desc}
                icon={icon}
                external
              />
            ))}
          </div>
        </section>

        {/* Static page groups */}
        {SECTION_GROUPS.map(({ id, label, icon }) => {
          const items = groups[id] || [];
          if (!items.length) return null;
          return (
            <section key={id} style={{ marginBottom: '3rem' }}>
              <SectionHeading icon={icon} title={label} count={items.length} />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '0.55rem',
                }}
              >
                {items.map((p) => (
                  <LinkCard
                    key={p.path}
                    href={p.path}
                    label={p.label}
                    sub={p.description}
                    icon={ChevronRight}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {/* Categories + labels + posts */}
        {categories.map((cat) => {
          const catPosts = postsByCategory[cat.slug] || [];
          return (
            <section key={cat.slug} style={{ marginBottom: '3rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '0.6rem',
                    background: 'rgba(212,175,55,0.1)',
                    border: '1px solid rgba(212,175,55,0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d4af37',
                  }}
                >
                  <Folder size={15} />
                </span>
                <Link
                  href={`/${cat.slug}`}
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    color: '#fff',
                    textDecoration: 'none',
                  }}
                  className="wu-cat-title"
                >
                  {cat.name}
                </Link>
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.5)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                  }}
                >
                  {catPosts.length} post{catPosts.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Labels as gold chips */}
              {cat.labels.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                  {cat.labels.map((label) => (
                    <Link
                      key={`${cat.slug}-${label}`}
                      href={`/${cat.slug}/${labelSlug(label)}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.3rem 0.7rem',
                        background: 'rgba(212,175,55,0.08)',
                        border: '1px solid rgba(212,175,55,0.28)',
                        borderRadius: '9999px',
                        color: '#e9c66a',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background 0.18s, border-color 0.18s',
                      }}
                      className="wu-label-chip"
                    >
                      <Tag size={10} />
                      {label}
                    </Link>
                  ))}
                </div>
              )}

              {catPosts.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '0.55rem',
                  }}
                >
                  {catPosts.slice(0, 100).map((post) => (
                    <LinkCard
                      key={post.id || post.slug}
                      href={`/posts/${post.slug}`}
                      label={post.title || 'Untitled'}
                      icon={FileText}
                    />
                  ))}
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No published posts in this category yet.
                </p>
              )}
            </section>
          );
        })}

        {posts.length === 0 && categories.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '3rem 0' }}>
            Nothing published yet.
          </p>
        )}
      </div>

      {/* Hover styles (server component-friendly) */}
      <style>{`
        .wu-sitemap-card:hover {
          background: rgba(212,175,55,0.06) !important;
          border-color: rgba(212,175,55,0.35) !important;
          transform: translateY(-1px);
        }
        .wu-back-link:hover { color: #fff !important; }
        .wu-cat-title:hover { color: #d4af37 !important; }
        .wu-label-chip:hover {
          background: rgba(212,175,55,0.18) !important;
          border-color: rgba(212,175,55,0.55) !important;
        }
      `}</style>
    </main>
  );
}

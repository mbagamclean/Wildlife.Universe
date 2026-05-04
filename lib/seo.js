/**
 * SEO foundation for Wildlife Universe.
 *
 * Provides:
 *   - Site-wide constants (SITE_NAME, SITE_URL, defaults)
 *   - Next.js metadata builders (post, category, home, static)
 *   - schema.org JSON-LD generators (Article, BreadcrumbList,
 *     WebSite, Organization, ItemList)
 *   - <JsonLd /> server component for embedding JSON-LD in pages
 *
 * TODO(env): set NEXT_PUBLIC_SITE_URL in .env.local and Vercel.
 *   Until then we fall back to the production domain placeholder
 *   below, which means OG/canonical URLs will be wrong in preview.
 */

import React from 'react';

export const SITE_NAME = 'Wildlife Universe';

// Setting NEXT_PUBLIC_SITE_URL overrides this. Used as the metadataBase
// and canonical root. Should match the domain you publish under.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wildlifeuniverse.org'
).replace(/\/$/, '');

export const DEFAULT_OG_IMAGE_PATH = '/og-default.jpg';
export const DEFAULT_OG_IMAGE = `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`;
export const DEFAULT_LOGO_PATH = '/logo.png';
export const DEFAULT_LOGO = `${SITE_URL}${DEFAULT_LOGO_PATH}`;

export const DEFAULT_DESCRIPTION =
  'A modern luxury wildlife platform exploring animals, plants, birds, insects, and the living world — cinematic field reporting, conservation, and IUCN-tracked species.';

export const DEFAULT_KEYWORDS = [
  'wildlife',
  'conservation',
  'nature',
  'animals',
  'plants',
  'birds',
  'insects',
  'biodiversity',
  'IUCN',
  'ecology',
  'species',
];

const SUPPORTED_LOCALE = 'en_US';

// ───────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────

function absoluteUrl(path = '/') {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s, max = 160) {
  if (!s) return '';
  const t = String(s).trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function pickDescription(post) {
  if (post?.description) return truncate(post.description, 160);
  const stripped = stripHtml(post?.body || '');
  if (stripped) return truncate(stripped, 160);
  return DEFAULT_DESCRIPTION;
}

function pickCoverImage(post) {
  const cover = post?.cover;
  if (!cover) return DEFAULT_OG_IMAGE;
  if (typeof cover === 'string') return absoluteUrl(cover);
  if (cover?.type === 'video') return DEFAULT_OG_IMAGE;
  const src = cover?.sources?.[cover?.sources?.length - 1]?.src;
  return src ? absoluteUrl(src) : DEFAULT_OG_IMAGE;
}

function pickAuthorName(post) {
  return post?.author?.name || SITE_NAME;
}

function pickPublishedTime(post) {
  return post?.createdAt || post?.created_at || new Date().toISOString();
}

function pickModifiedTime(post) {
  return post?.updatedAt || post?.updated_at || pickPublishedTime(post);
}

function pickKeywords(post) {
  const out = new Set(DEFAULT_KEYWORDS);
  if (post?.category) out.add(String(post.category));
  if (post?.label) out.add(String(post.label));
  if (Array.isArray(post?.tags)) post.tags.forEach((t) => t && out.add(String(t)));
  return Array.from(out);
}

// ───────────────────────────────────────────────────────────────────
// Metadata builders (Next.js App Router)
// ───────────────────────────────────────────────────────────────────

export function buildHomeMetadata() {
  const url = `${SITE_URL}/`;
  return {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      locale: SUPPORTED_LOCALE,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
    robots: { index: true, follow: true },
  };
}

export function buildStaticMetadata({ title, description, path = '/' } = {}) {
  const desc = description || DEFAULT_DESCRIPTION;
  const url = absoluteUrl(path);
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title: title ? `${title} — ${SITE_NAME}` : SITE_NAME,
      description: desc,
      locale: SUPPORTED_LOCALE,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title || SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: title || SITE_NAME,
      description: desc,
      images: [DEFAULT_OG_IMAGE],
    },
    robots: { index: true, follow: true },
  };
}

export function buildPostMetadata(post) {
  if (!post) {
    return {
      title: 'Post not found',
      robots: { index: false, follow: false },
    };
  }

  const title = post.title || 'Untitled';
  const description = pickDescription(post);
  const image = pickCoverImage(post);
  const url = absoluteUrl(`/posts/${post.slug}`);
  const isDraft = post.status === 'draft';
  const publishedTime = pickPublishedTime(post);
  const modifiedTime = pickModifiedTime(post);
  const author = pickAuthorName(post);

  return {
    title,
    description,
    keywords: pickKeywords(post),
    authors: [{ name: author }],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: SUPPORTED_LOCALE,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      publishedTime,
      modifiedTime,
      authors: [author],
      section: post.category || undefined,
      tags: post.label ? [post.label] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: author,
    },
    robots: isDraft
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export function buildCategoryMetadata(category, label) {
  const catName = category?.name || category?.slug || 'Category';
  const slug = category?.slug || '';
  const path = label ? `/${slug}/${label.slug || label}` : `/${slug}`;
  const url = absoluteUrl(path);

  const title = label
    ? `${label.label || label} · ${catName}`
    : `${catName}`;
  const description = label
    ? `Explore ${label.label || label} stories in ${catName} — wildlife reporting, conservation, and species profiles on ${SITE_NAME}.`
    : `Explore ${catName} on ${SITE_NAME} — cinematic field reports, species profiles, and conservation stories.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title: `${title} — ${SITE_NAME}`,
      description,
      locale: SUPPORTED_LOCALE,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
    robots: { index: true, follow: true },
  };
}

// ───────────────────────────────────────────────────────────────────
// JSON-LD generators
// ───────────────────────────────────────────────────────────────────

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: DEFAULT_LOGO,
      width: 512,
      height: 512,
    },
    foundingDate: '2026',
    description: DEFAULT_DESCRIPTION,
    knowsAbout: [
      'Wildlife',
      'Conservation',
      'Biodiversity',
      'Ecology',
      'Animals',
      'Plants',
      'Birds',
      'Insects',
      'IUCN Red List',
      'Nature photography',
      'Field biology',
    ],
    // TODO: add social profiles once accounts are created
    sameAs: [],
  };
}

export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en-US',
    publisher: { '@id': `${SITE_URL}#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildArticleJsonLd(post) {
  if (!post) return null;
  const url = absoluteUrl(`/posts/${post.slug}`);
  const image = pickCoverImage(post);
  const description = pickDescription(post);
  const author = pickAuthorName(post);
  const published = pickPublishedTime(post);
  const modified = pickModifiedTime(post);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: truncate(post.title || 'Untitled', 110),
    description,
    image: [image],
    datePublished: published,
    dateModified: modified,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_LOGO,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    articleSection: post.category || undefined,
    keywords: pickKeywords(post).join(', '),
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    url,
  };
}

/**
 * items: array of { name, url } — order matters (root → leaf).
 */
export function buildBreadcrumbJsonLd(items) {
  const list = (items || []).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: list.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function buildItemListJsonLd(posts, listName, listUrl) {
  const items = (posts || []).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    url: absoluteUrl(listUrl || '/'),
    numberOfItems: items.length,
    itemListElement: items.map((post, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: absoluteUrl(`/posts/${post.slug}`),
      name: post.title,
    })),
  };
}

// ───────────────────────────────────────────────────────────────────
// <JsonLd /> server component
// ───────────────────────────────────────────────────────────────────

export function JsonLd({ data }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

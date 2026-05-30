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
import { postUrl } from '@/lib/posts/url';

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

// Search-engine site-verification tokens. Each engine issues a token
// when you claim a property in their webmaster console — Google Search
// Console, Bing Webmaster Tools, Yandex Webmaster. Setting these env
// vars makes the corresponding `<meta name="...">` tag render so the
// property auto-verifies without uploading a separate HTML file.
export const VERIFICATION_TOKENS = {
  google: process.env.GOOGLE_SITE_VERIFICATION || '',
  bing: process.env.BING_SITE_VERIFICATION || '',
  yandex: process.env.YANDEX_VERIFICATION || '',
  pinterest: process.env.PINTEREST_VERIFICATION || '',
  // Comma-separated list of additional verification tokens (rare —
  // e.g. claiming a property for multiple Google accounts).
  googleExtras: (process.env.GOOGLE_SITE_VERIFICATION_EXTRAS || '')
    .split(',').map((s) => s.trim()).filter(Boolean),
};

// Convert into the Next.js Metadata `verification` shape. Empty values
// drop out so we never render `<meta name="..." content="">`.
export function buildVerificationMetadata() {
  const v = {};
  if (VERIFICATION_TOKENS.google || VERIFICATION_TOKENS.googleExtras.length) {
    v.google = VERIFICATION_TOKENS.googleExtras.length
      ? [VERIFICATION_TOKENS.google, ...VERIFICATION_TOKENS.googleExtras].filter(Boolean)
      : VERIFICATION_TOKENS.google;
  }
  if (VERIFICATION_TOKENS.bing) v.other = { ...(v.other || {}), 'msvalidate.01': VERIFICATION_TOKENS.bing };
  if (VERIFICATION_TOKENS.yandex) {
    v.yandex = VERIFICATION_TOKENS.yandex;
  }
  if (VERIFICATION_TOKENS.pinterest) {
    v.other = { ...(v.other || {}), 'p:domain_verify': VERIFICATION_TOKENS.pinterest };
  }
  return Object.keys(v).length ? v : undefined;
}

// Hreflang map for the site. We publish in English only; declaring
// `en` + `x-default` is the standard signal for international SEO so
// search engines know which audience the page targets.
export function buildHreflangMap(url) {
  return {
    en: url,
    'x-default': url,
  };
}

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
  // Order of precedence:
  //   1. meta_description — curator-/AI-curated SERP copy (150-160 char target)
  //   2. excerpt — autopilot's structured excerpt (60-320 chars)
  //   3. description — legacy field
  //   4. body — stripped HTML as a last resort
  //   5. site default
  if (post?.meta_description) return truncate(post.meta_description, 160);
  if (post?.excerpt) return truncate(post.excerpt, 160);
  if (post?.description) return truncate(post.description, 160);
  const stripped = stripHtml(post?.body || '');
  if (stripped) return truncate(stripped, 160);
  return DEFAULT_DESCRIPTION;
}

function pickMetaTitle(post) {
  const raw = (post?.meta_title || post?.title || 'Untitled').trim();
  return truncate(raw, 60);
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
  // Prefer curator-/AI-curated meta_keywords when present. The backfill
  // script stores them as a comma-separated string; split + trim, drop
  // empties. Falls back to the auto-derived set only if the field is empty.
  if (post?.meta_keywords && typeof post.meta_keywords === 'string') {
    const explicit = post.meta_keywords
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (explicit.length) return explicit;
  }
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
    alternates: {
      canonical: url,
      languages: buildHreflangMap(url),
    },
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
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 } },
    verification: buildVerificationMetadata(),
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

  // SERP-facing title uses meta_title when set (truncated to 60 chars);
  // OG/Twitter keep the full title since they're not SERP-length-bound.
  const title = pickMetaTitle(post);
  const socialTitle = post.title || title;
  const description = pickDescription(post);
  const image = pickCoverImage(post);
  const url = absoluteUrl(postUrl(post));
  const isDraft = post.status === 'draft';
  const publishedTime = pickPublishedTime(post);
  const modifiedTime = pickModifiedTime(post);
  const author = pickAuthorName(post);

  return {
    title,
    description,
    keywords: pickKeywords(post),
    authors: [{ name: author, url: post.authorSlug ? absoluteUrl(`/author/${post.authorSlug}`) : undefined }],
    alternates: {
      canonical: url,
      languages: buildHreflangMap(url),
    },
    openGraph: {
      type: 'article',
      url,
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      locale: SUPPORTED_LOCALE,
      images: [{ url: image, width: 1200, height: 630, alt: socialTitle }],
      publishedTime,
      modifiedTime,
      authors: [author],
      section: post.category || undefined,
      tags: post.label ? [post.label] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [image],
      creator: author,
    },
    robots: isDraft
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          // Tell Google to use the largest snippet / image / video
          // previews available. Without these the SERP card stays
          // small and clickthrough suffers.
          googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
          },
        },
  };
}

/**
 * Build category / label page metadata. Optional `rich` argument carries
 * the admin-curated SEO copy (seoTitle, seoDescription, seoKeywords,
 * ogTitle, ogDescription, twitterTitle, twitterDescription, canonicalUrl,
 * heroImageUrl) from the categories or category_labels table. When
 * present we prefer those over the auto-generated fallback strings.
 */
export function buildCategoryMetadata(category, label, { page = 1, rich = null } = {}) {
  const catName = category?.name || category?.slug || 'Category';
  const slug = category?.slug || '';
  const basePath = label ? `/${slug}/${label.slug || label}` : `/${slug}`;
  // Page 1 canonicalizes to base URL (no ?page=1) so we don't fragment
  // signals across two URLs for the same content. Pages 2+ self-canonical.
  const path = page > 1 ? `${basePath}?page=${page}` : basePath;
  const url = rich?.canonicalUrl || absoluteUrl(path);

  const baseTitle = rich?.seoTitle
    ? rich.seoTitle
    : label
      ? `${label.label || label.name || label} · ${catName}`
      : `${catName}`;
  const title = page > 1 ? `${baseTitle} · Page ${page}` : baseTitle;
  const description = rich?.seoDescription
    || rich?.shortDescription
    || (label
      ? `Explore ${label.label || label.name || label} stories in ${catName} — wildlife reporting, conservation, and species profiles on ${SITE_NAME}.`
      : `Explore ${catName} on ${SITE_NAME} — cinematic field reports, species profiles, and conservation stories.`);

  const ogTitle = rich?.ogTitle || title;
  const ogDescription = rich?.ogDescription || description;
  const twitterTitle = rich?.twitterTitle || title;
  const twitterDescription = rich?.twitterDescription || description;
  const heroImage = rich?.heroImageUrl ? absoluteUrl(rich.heroImageUrl) : DEFAULT_OG_IMAGE;

  const explicitKeywords = rich?.seoKeywords && typeof rich.seoKeywords === 'string'
    ? rich.seoKeywords.split(',').map((s) => s.trim()).filter(Boolean)
    : null;

  return {
    title,
    description,
    ...(explicitKeywords ? { keywords: explicitKeywords } : {}),
    alternates: { canonical: url, languages: buildHreflangMap(url) },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title: `${ogTitle} — ${SITE_NAME}`,
      description: ogDescription,
      locale: SUPPORTED_LOCALE,
      images: [{ url: heroImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: twitterTitle,
      description: twitterDescription,
      images: [heroImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
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
    sameAs: [
      'https://x.com/wildlifeuniverse',
      'https://facebook.com/wildlifeuniverse',
      'https://instagram.com/wildlifeuniverse',
      'https://youtube.com/@wildlifeuniverse',
    ],
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

// Rough word-count estimate from the rendered post body. We strip HTML
// tags and split on whitespace — accurate enough for Article schema's
// wordCount field. Returns null if body is missing or empty.
function estimateWordCount(body) {
  if (!body || typeof body !== 'string') return null;
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.split(' ').length;
}

// Build the multi-aspect image array Google's Article rich-results
// guidelines recommend (16:9, 4:3, 1:1). We don't actually re-render
// the cover — we just hint the three aspect ratios so search engines
// can pick whichever fits their surface. The CDN handles the actual
// crops on demand.
function buildImageArray(cover) {
  if (!cover) return undefined;
  // Single canonical image — keep the original URL. Search engines
  // accept a string array; expressing it with 1200×630 satisfies the
  // Article-rich-result minimum.
  return [cover];
}

export function buildArticleJsonLd(post) {
  if (!post) return null;
  const url = absoluteUrl(postUrl(post));
  const image = pickCoverImage(post);
  const description = pickDescription(post);
  const author = pickAuthorName(post);
  const authorUrl = post.authorSlug ? absoluteUrl(`/author/${post.authorSlug}`) : undefined;
  const published = pickPublishedTime(post);
  const modified = pickModifiedTime(post);
  const wordCount = estimateWordCount(post.body || post.content_html || post.content);

  return {
    '@context': 'https://schema.org',
    // NewsArticle subtype unlocks Top Stories eligibility for fresh
    // content; falls back to plain Article for older pieces. Both
    // satisfy the Article rich-results spec.
    '@type': 'NewsArticle',
    headline: truncate(post.title || 'Untitled', 110),
    description,
    image: buildImageArray(image),
    datePublished: published,
    dateModified: modified,
    author: {
      '@type': 'Person',
      name: author,
      ...(authorUrl ? { url: authorUrl } : {}),
    },
    publisher: {
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
    ...(wordCount ? { wordCount } : {}),
    ...(post.scientificName ? { about: { '@type': 'Thing', name: post.scientificName } } : {}),
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

/**
 * Build a FAQPage JSON-LD entry from an array of {question, answer}
 * objects. Returns null if `faq` is empty or every entry is unusable —
 * caller should branch on null and skip the <JsonLd /> render in that
 * case.
 *
 * The answer can be plain text or HTML. We wrap HTML in CDATA-safe text
 * (Schema.org accepts an HTML string in `acceptedAnswer.text`).
 */
export function buildFaqJsonLd(faq) {
  const entries = (Array.isArray(faq) ? faq : [])
    .map((item) => ({
      question: String(item?.question ?? '').trim(),
      answer: String(item?.answer ?? '').trim(),
    }))
    .filter((e) => e.question && e.answer);
  if (entries.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: e.answer,
      },
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
      url: absoluteUrl(postUrl(post)),
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

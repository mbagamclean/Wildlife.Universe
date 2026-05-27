/**
 * Shared per-category sitemap builder. Used by the dynamic route at
 * /sitemaps/[category]/[page]; legacy /posts-sitemap/[page] also
 * delegates here for backwards compatibility.
 *
 * Pagination cap matches Google's hard limit (50k URLs / 50 MB per
 * sitemap) with plenty of headroom — 200/page is small enough that
 * even all-images-attached pages stay under 50 MB.
 */

import { SITE_URL } from '@/lib/seo';
import { fetchPublishedPosts, fetchPublishedPostsByCategory } from '@/lib/seo-data';
import { postUrl } from '@/lib/posts/url';

export const URLS_PER_SITEMAP = 200;
export const POSTS_CATEGORY = 'posts';

function escapeXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absolutize(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function pickCoverUrl(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return absolutize(cover);
  if (cover?.type === 'video') return null;
  const src = cover?.sources?.[cover?.sources?.length - 1]?.src;
  return src ? absolutize(src) : null;
}

/**
 * Build a leaf sitemap response for one category + page. Returns the
 * Response object (200 with XML, or 404 if out of range).
 */
export async function buildCategorySitemapResponse(category, page) {
  if (!category) return new Response('Not found', { status: 404 });
  const pageNum = Number.parseInt(page, 10);
  if (!Number.isFinite(pageNum) || pageNum < 1) {
    return new Response('Not found', { status: 404 });
  }

  const posts = await fetchPublishedPostsByCategory(category, { slim: true });
  const start = (pageNum - 1) * URLS_PER_SITEMAP;
  const slice = posts.slice(start, start + URLS_PER_SITEMAP);
  if (slice.length === 0) {
    return new Response('Not found', { status: 404 });
  }

  const xml = renderUrlset(slice);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, s-maxage=900',
      'X-Robots-Tag': 'noindex',
    },
  });
}

/**
 * Build a leaf sitemap for the legacy `/posts-sitemap/<page>` route.
 * Returns ALL posts (every category) so old Search Console submissions
 * still see the full catalog. The sitemap index has switched to
 * per-category sitemaps; this route is preserved only so engines that
 * cached the old URL continue to find content while they re-crawl.
 */
export async function buildLegacyAllPostsSitemapResponse(page) {
  const pageNum = Number.parseInt(page, 10);
  if (!Number.isFinite(pageNum) || pageNum < 1) {
    return new Response('Not found', { status: 404 });
  }
  const posts = await fetchPublishedPosts();
  const start = (pageNum - 1) * URLS_PER_SITEMAP;
  const slice = posts.slice(start, start + URLS_PER_SITEMAP);
  if (slice.length === 0) {
    return new Response('Not found', { status: 404 });
  }
  const xml = renderUrlset(slice);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, s-maxage=900',
      'X-Robots-Tag': 'noindex',
    },
  });
}

function renderUrlset(slice) {
  const items = slice
    .filter((p) => p?.slug)
    .map((post) => {
      const url = `${SITE_URL}${postUrl(post)}`;
      const lastmod = (post.updatedAt || post.createdAt || new Date()).toString();
      const lastmodIso = new Date(lastmod).toISOString();
      const cover = pickCoverUrl(post.cover);

      const imageBlock = cover
        ? `\n    <image:image>\n` +
          `      <image:loc>${escapeXml(cover)}</image:loc>\n` +
          `      <image:title>${escapeXml(post.title || '')}</image:title>\n` +
          `    </image:image>`
        : '';

      return (
        `  <url>\n` +
        `    <loc>${escapeXml(url)}</loc>\n` +
        `    <lastmod>${lastmodIso}</lastmod>\n` +
        `    <changefreq>weekly</changefreq>\n` +
        `    <priority>0.8</priority>` +
        imageBlock +
        `\n  </url>`
      );
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${items}
</urlset>`;
}

/**
 * Return the total page count for a given category (1+). Useful for
 * the sitemap index to enumerate /sitemaps/<cat>/1 ... /N.
 */
export async function categoryPageCount(category) {
  const posts = await fetchPublishedPostsByCategory(category, { slim: true });
  return Math.max(1, Math.ceil(posts.length / URLS_PER_SITEMAP));
}

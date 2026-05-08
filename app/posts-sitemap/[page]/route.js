/**
 * /posts-sitemap/[page] — leaf sitemap for one page of posts.
 *
 * Returns up to URLS_PER_SITEMAP <url> entries (200), each with the
 * post URL, lastmod, and the cover image so Google Image Search picks
 * it up. Linked from /posts-sitemap.xml. Crawlers don't require .xml
 * in the URL — Content-Type tells them what they're looking at.
 *
 * Pages are 1-indexed. Out-of-range pages 404 to keep crawler signals
 * honest (don't emit empty <urlset>s).
 */

import { SITE_URL } from '@/lib/seo';
import { fetchPublishedPosts } from '@/lib/seo-data';
import { URLS_PER_SITEMAP } from '../../posts-sitemap.xml/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function GET(_request, { params }) {
  const { page: pageParam } = await params;
  const page = Number.parseInt(pageParam, 10);
  if (!Number.isFinite(page) || page < 1) {
    return new Response('Not found', { status: 404 });
  }

  const posts = await fetchPublishedPosts();
  const start = (page - 1) * URLS_PER_SITEMAP;
  const slice = posts.slice(start, start + URLS_PER_SITEMAP);
  if (slice.length === 0) {
    return new Response('Not found', { status: 404 });
  }

  const items = slice
    .filter((p) => p?.slug)
    .map((post) => {
      const url = `${SITE_URL}/posts/${post.slug}`;
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

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${items}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, s-maxage=900',
      'X-Robots-Tag': 'noindex',
    },
  });
}

/**
 * /sitemap.xml — sitemap INDEX.
 *
 * Lists every leaf sitemap directly. Submit only this URL to Google
 * Search Console / Bing Webmaster Tools — they'll discover the children
 * and crawl new content as it lands.
 *
 * Children:
 *   /authoritative-sitemap.xml   — home, legal, marketing pages
 *   /posts-sitemap/1, /2, ...    — published articles (200 per page,
 *                                   computed from current post count)
 *   /category-sitemap.xml        — categories + label pages
 *   /image-sitemap.xml           — every image (Google Image Search)
 *   /video-sitemap.xml           — every video (Google Video Search)
 *
 * The post pages are listed inline (not under a sub-index) because
 * Google does not follow nested sitemap indexes.
 */

import { SITE_URL } from '@/lib/seo';
import { fetchPublishedPosts } from '@/lib/seo-data';
import { URLS_PER_SITEMAP } from '../posts-sitemap.xml/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATIC_CHILDREN = [
  'authoritative-sitemap.xml',
  'category-sitemap.xml',
  'image-sitemap.xml',
  'video-sitemap.xml',
];

function escapeXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await fetchPublishedPosts();
  const totalPostPages = Math.max(1, Math.ceil(posts.length / URLS_PER_SITEMAP));
  const now = new Date().toISOString();

  const postSitemaps = Array.from({ length: totalPostPages }, (_, idx) => {
    const page = idx + 1;
    const start = idx * URLS_PER_SITEMAP;
    const slice = posts.slice(start, start + URLS_PER_SITEMAP);
    const newest = slice.reduce((acc, p) => {
      const ts = new Date(p.updatedAt || p.createdAt || 0).getTime();
      return ts > acc ? ts : acc;
    }, 0);
    const lastmod = newest ? new Date(newest).toISOString() : now;
    return (
      `  <sitemap>\n` +
      `    <loc>${escapeXml(`${SITE_URL}/posts-sitemap/${page}`)}</loc>\n` +
      `    <lastmod>${lastmod}</lastmod>\n` +
      `  </sitemap>`
    );
  });

  const staticSitemaps = STATIC_CHILDREN.map(
    (name) =>
      `  <sitemap>\n    <loc>${SITE_URL}/${name}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`,
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...postSitemaps, ...staticSitemaps].join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}

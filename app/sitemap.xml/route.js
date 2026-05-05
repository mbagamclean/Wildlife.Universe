/**
 * /sitemap.xml — sitemap INDEX.
 *
 * Lists all specialized sitemaps. Submit only this URL to Google Search
 * Console / Bing Webmaster Tools — they'll discover the children and
 * crawl new content as it lands.
 *
 * Children:
 *   /authoritative-sitemap.xml — home, legal, marketing pages
 *   /posts-sitemap.xml         — every published article
 *   /category-sitemap.xml      — categories + label pages
 *   /image-sitemap.xml         — every image (Google Image Search)
 *   /video-sitemap.xml         — every video (Google Video Search)
 */

import { SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHILDREN = [
  'authoritative-sitemap.xml',
  'posts-sitemap.xml',
  'category-sitemap.xml',
  'image-sitemap.xml',
  'video-sitemap.xml',
];

export async function GET() {
  const lastmod = new Date().toISOString();
  const items = CHILDREN.map(
    (name) =>
      `  <sitemap>\n    <loc>${SITE_URL}/${name}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`,
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}

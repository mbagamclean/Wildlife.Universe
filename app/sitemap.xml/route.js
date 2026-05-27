/**
 * /sitemap.xml — sitemap INDEX.
 *
 * Lists every leaf sitemap directly. Submit only this URL to Google
 * Search Console / Bing Webmaster Tools — they'll discover the children
 * and crawl new content as it lands.
 *
 * Children:
 *   /authoritative-sitemap.xml      — home, legal, marketing pages
 *   /category-sitemap.xml           — categories + label pages
 *   /image-sitemap.xml              — every image (Google Image Search)
 *   /video-sitemap.xml              — every video (Google Video Search)
 *   /news-sitemap.xml               — fresh posts (last 48h, for News)
 *   /sitemaps/<category>/1, /2, ... — paginated per-category posts
 *
 * Adding a new category to lib/mock/categories.js auto-adds its
 * sitemap here — no extra route file needed. Each category sitemap
 * splits at 200 URLs/page; high-volume categories get /1, /2, /3, ...
 *
 * The pages are listed inline (not under sub-indexes) because Google
 * does not follow nested sitemap indexes.
 */

import { SITE_URL } from '@/lib/seo';
import { categories } from '@/lib/mock/categories';
import { fetchPublishedPostsByCategory } from '@/lib/seo-data';
import { URLS_PER_SITEMAP } from '@/lib/seo/sitemap-builder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATIC_CHILDREN = [
  'authoritative-sitemap.xml',
  'category-sitemap.xml',
  'image-sitemap.xml',
  'video-sitemap.xml',
  'news-sitemap.xml',
];

function escapeXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function buildCategorySitemapsXml() {
  const now = new Date().toISOString();
  const blocks = [];

  for (const cat of categories) {
    const posts = await fetchPublishedPostsByCategory(cat.slug, { slim: true });
    if (posts.length === 0) {
      // Even empty categories emit a /1 entry so engines can discover
      // the path the moment a post is published — saves a re-crawl of
      // the index when the first post in a new category goes live.
      blocks.push(
        `  <sitemap>\n` +
        `    <loc>${escapeXml(`${SITE_URL}/sitemaps/${cat.slug}/1`)}</loc>\n` +
        `    <lastmod>${now}</lastmod>\n` +
        `  </sitemap>`
      );
      continue;
    }
    const totalPages = Math.max(1, Math.ceil(posts.length / URLS_PER_SITEMAP));
    for (let i = 0; i < totalPages; i++) {
      const page = i + 1;
      const slice = posts.slice(i * URLS_PER_SITEMAP, (i + 1) * URLS_PER_SITEMAP);
      const newest = slice.reduce((acc, p) => {
        const ts = new Date(p.updatedAt || p.createdAt || 0).getTime();
        return ts > acc ? ts : acc;
      }, 0);
      const lastmod = newest ? new Date(newest).toISOString() : now;
      blocks.push(
        `  <sitemap>\n` +
        `    <loc>${escapeXml(`${SITE_URL}/sitemaps/${cat.slug}/${page}`)}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `  </sitemap>`
      );
    }
  }

  return blocks.join('\n');
}

export async function GET() {
  const now = new Date().toISOString();
  const categorySitemapsXml = await buildCategorySitemapsXml();

  const staticSitemaps = STATIC_CHILDREN.map(
    (name) =>
      `  <sitemap>\n    <loc>${SITE_URL}/${name}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`,
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${categorySitemapsXml}
${staticSitemaps}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}

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
 *   /sitemaps/<category>/<page>     — paginated per-category posts
 *
 * Adding a new category to lib/mock/categories.js auto-adds its
 * sitemap here — no extra route file needed. Each category sitemap
 * splits at 200 URLs/page; high-volume categories get /1, /2, /3, ...
 *
 * The pages are listed inline (not under sub-indexes) because Google
 * does not follow nested sitemap indexes.
 *
 * Notes:
 *   - news-sitemap.xml intentionally omitted — Google News is for fresh
 *     reporting in the last ~2 days; an evergreen wildlife site doesn't
 *     belong there and an empty news sitemap is treated as a sitemap
 *     parse warning by Search Console.
 *   - <lastmod> on every entry reflects MAX(posts.updated_at) for the
 *     URLs that sitemap actually covers — not request time — because
 *     Google deprioritises the field on sites that lie with it.
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
  const blocks = [];
  let globalNewest = 0;

  for (const cat of categories) {
    const posts = await fetchPublishedPostsByCategory(cat.slug, { slim: true });
    if (posts.length === 0) continue; // skip empty categories — emitting a /1 entry that 404s wastes crawl budget

    const totalPages = Math.max(1, Math.ceil(posts.length / URLS_PER_SITEMAP));
    for (let i = 0; i < totalPages; i++) {
      const page = i + 1;
      const slice = posts.slice(i * URLS_PER_SITEMAP, (i + 1) * URLS_PER_SITEMAP);
      const newest = slice.reduce((acc, p) => {
        const ts = new Date(p.updatedAt || p.createdAt || 0).getTime();
        return ts > acc ? ts : acc;
      }, 0);
      if (newest > globalNewest) globalNewest = newest;
      const lastmod = newest ? new Date(newest).toISOString() : null;
      blocks.push(
        `  <sitemap>\n` +
        `    <loc>${escapeXml(`${SITE_URL}/sitemaps/${cat.slug}/${page}`)}</loc>\n` +
        (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '') +
        `  </sitemap>`
      );
    }
  }

  return { xml: blocks.join('\n'), globalNewest };
}

export async function GET() {
  const { xml: categorySitemapsXml, globalNewest } = await buildCategorySitemapsXml();
  // For the static children we use the catalog's most recent post-update
  // time as their <lastmod>. Image/video sitemaps derive from the post
  // catalogue and category sitemap reflects post churn; this is the
  // single most-recent honest signal we have for all of them.
  const staticLastmod = globalNewest
    ? new Date(globalNewest).toISOString()
    : null;

  const staticSitemaps = STATIC_CHILDREN.map(
    (name) =>
      `  <sitemap>\n    <loc>${SITE_URL}/${name}</loc>\n` +
      (staticLastmod ? `    <lastmod>${staticLastmod}</lastmod>\n` : '') +
      `  </sitemap>`,
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

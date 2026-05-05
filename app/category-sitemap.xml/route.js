/**
 * /category-sitemap.xml — categories + label pages.
 *
 * Pulls from lib/mock/categories.js. Driven by the same data the rest
 * of the site uses, so adding a label there auto-adds it here.
 */

import { SITE_URL } from '@/lib/seo';
import { categories, labelSlug } from '@/lib/mock/categories';

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

export async function GET() {
  const lastmod = new Date().toISOString();
  const items = [];

  for (const cat of categories) {
    items.push(
      `  <url>\n` +
        `    <loc>${escapeXml(`${SITE_URL}/${cat.slug}`)}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>daily</changefreq>\n` +
        `    <priority>0.7</priority>\n` +
        `  </url>`,
    );
    for (const label of cat.labels) {
      items.push(
        `  <url>\n` +
          `    <loc>${escapeXml(`${SITE_URL}/${cat.slug}/${labelSlug(label)}`)}</loc>\n` +
          `    <lastmod>${lastmod}</lastmod>\n` +
          `    <changefreq>weekly</changefreq>\n` +
          `    <priority>0.6</priority>\n` +
          `  </url>`,
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}

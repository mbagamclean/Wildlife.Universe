/**
 * /authoritative-sitemap.xml — static & legal pages.
 *
 * Sourced from lib/seo/static-pages.js. Add a new entry there and it
 * auto-appears here (and on the /sitemap UI page) on the next request.
 */

import { SITE_URL } from '@/lib/seo';
import { indexableStaticPages } from '@/lib/seo/static-pages';

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
  const pages = indexableStaticPages();

  const items = pages
    .map(
      (p) =>
        `  <url>\n` +
        `    <loc>${escapeXml(SITE_URL + p.path)}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>${p.changeFrequency}</changefreq>\n` +
        `    <priority>${p.priority}</priority>\n` +
        `  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}

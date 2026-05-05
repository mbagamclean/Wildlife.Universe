/**
 * /image-sitemap.xml — every image, in Google's image: namespace.
 *
 * Uses image:image extension so Google Image Search picks up uploads
 * regardless of where they appear (post covers, hero, AI-generated, etc).
 */

import { SITE_URL } from '@/lib/seo';
import { fetchSitemapImages } from '@/lib/seo/sitemap-data';

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
  const entries = await fetchSitemapImages();

  // Group by `loc` so a single page can carry many images (Google allows up
  // to ~1,000 image:image children per <url>).
  const byLoc = new Map();
  for (const e of entries) {
    if (!e?.loc || !e?.image?.url) continue;
    if (!byLoc.has(e.loc)) byLoc.set(e.loc, []);
    byLoc.get(e.loc).push(e.image);
  }

  const items = [...byLoc.entries()]
    .map(([loc, imgs]) => {
      const imgBlocks = imgs
        .map(
          (img) =>
            `    <image:image>\n` +
            `      <image:loc>${escapeXml(img.url)}</image:loc>\n` +
            (img.title ? `      <image:title>${escapeXml(img.title)}</image:title>\n` : '') +
            (img.caption ? `      <image:caption>${escapeXml(img.caption)}</image:caption>\n` : '') +
            `    </image:image>`,
        )
        .join('\n');
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(loc)}</loc>\n` +
        imgBlocks +
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

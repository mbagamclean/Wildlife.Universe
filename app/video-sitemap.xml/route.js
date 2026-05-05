/**
 * /video-sitemap.xml — every video, in Google's video: namespace.
 *
 * Combines hero videos, post-cover videos, and standalone uploads from
 * media_library. Each entry exposes the embed page (loc), thumbnail,
 * title, description, and content URL.
 */

import { SITE_URL } from '@/lib/seo';
import { fetchSitemapVideos } from '@/lib/seo/sitemap-data';

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
  const entries = await fetchSitemapVideos();

  const items = entries
    .filter((e) => e?.loc && e?.video?.content_loc)
    .map((e) => {
      const v = e.video;
      const dur = v.duration ? `      <video:duration>${Number(v.duration)}</video:duration>\n` : '';
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(e.loc)}</loc>\n` +
        `    <video:video>\n` +
        `      <video:thumbnail_loc>${escapeXml(v.thumbnail_loc)}</video:thumbnail_loc>\n` +
        `      <video:title>${escapeXml(v.title || 'Wildlife Universe')}</video:title>\n` +
        `      <video:description>${escapeXml(v.description || v.title || 'Wildlife Universe video')}</video:description>\n` +
        `      <video:content_loc>${escapeXml(v.content_loc)}</video:content_loc>\n` +
        dur +
        `    </video:video>\n` +
        `  </url>`
      );
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
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

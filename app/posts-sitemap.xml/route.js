/**
 * /posts-sitemap.xml — every published article.
 *
 * Includes the cover image as image:image so Google Image Search can
 * pick it up alongside the article URL. New posts appear here as soon
 * as they're saved with a non-draft status.
 */

import { SITE_URL } from '@/lib/seo';
import { fetchPublishedPosts } from '@/lib/seo-data';

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

export async function GET() {
  const posts = await fetchPublishedPosts();

  const items = posts
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

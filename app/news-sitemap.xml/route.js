// Google News sitemap — surfaces the most recent (last 48h) published
// posts for News indexing. Register this URL in robots.js Sitemap field
// if desired (Worker E owns robots.js — not modified here).

import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { fetchRecentPosts } from '@/lib/seo-data';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

function escapeXml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoDate(d) {
  try {
    return new Date(d).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function buildUrlXml(post) {
  const loc = `${SITE_URL}/posts/${post.slug}`;
  const title = escapeXml(post.title || 'Untitled');
  const pub = isoDate(post.createdAt);
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(SITE_NAME)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pub}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`;
}

export async function GET() {
  const posts = await fetchRecentPosts({ sinceHours: 48 });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${posts.map(buildUrlXml).join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=1800',
    },
  });
}

/**
 * /authoritative-sitemap.xml — static & legal pages.
 *
 * Sourced from lib/seo/static-pages.js. `<lastmod>` for content-aware
 * pages (home, /posts, /search) reflects MAX(posts.updated_at) so it
 * matches actual catalog churn; truly static pages (about, legal, ...)
 * use a stable build-time date so Google sees the field as honest.
 * `<changefreq>` and `<priority>` are omitted — Google ignores them.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/seo';
import { indexableStaticPages } from '@/lib/seo/static-pages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Build-time stamp for pages whose content doesn't change with post
// updates. Update this only when the underlying static copy is edited.
const STATIC_PAGES_LAST_REVISED = '2026-05-30';

function escapeXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

let _client = null;
function db() {
  if (!_client) {
    _client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
  }
  return _client;
}

const CONTENT_AWARE_PATHS = new Set(['/', '/posts', '/search', '/rss', '/subscribe']);

async function fetchLatestPostUpdate() {
  try {
    const { data } = await db()
      .from('posts')
      .select('updated_at, created_at')
      .neq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.updated_at || data?.created_at || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const dynamicLastmod = await fetchLatestPostUpdate();
  const pages = indexableStaticPages();

  const items = pages
    .map((p) => {
      const stamp = CONTENT_AWARE_PATHS.has(p.path) && dynamicLastmod
        ? new Date(dynamicLastmod).toISOString()
        : STATIC_PAGES_LAST_REVISED;
      return (
        `  <url>\n` +
        `    <loc>${escapeXml(SITE_URL + p.path)}</loc>\n` +
        `    <lastmod>${stamp}</lastmod>\n` +
        `  </url>`
      );
    })
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

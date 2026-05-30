/**
 * /category-sitemap.xml — categories + label pages.
 *
 * Pulls from lib/mock/categories.js. `<lastmod>` for each category and
 * label reflects the actual most-recent post update inside it — Google
 * deprecates `<lastmod>` signals from sites that stamp a fresh value on
 * every request, so we query MAX(updated_at) per (category, label) once
 * per response. `<changefreq>` and `<priority>` are intentionally omitted:
 * Google ignores them per Search Central docs.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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

// Build a lookup of MAX(updated_at) per (category, label) by fetching
// only the (updated_at, category, label) triples — keeps the payload
// small even on a 1k+ post catalog, and a Map keeps the merge O(N).
async function fetchLastmodMap() {
  const map = new Map(); // key = `${category}|${label||''}` → ISO date
  try {
    const { data } = await db()
      .from('posts')
      .select('category, label, updated_at, created_at')
      .neq('status', 'draft');
    for (const r of data || []) {
      const stamp = r.updated_at || r.created_at;
      if (!stamp) continue;
      const cat = r.category || '';
      const lbl = r.label || '';
      const keyCat = `${cat}|`;
      const keyLbl = `${cat}|${lbl}`;
      if (!map.has(keyCat) || stamp > map.get(keyCat)) map.set(keyCat, stamp);
      if (lbl && (!map.has(keyLbl) || stamp > map.get(keyLbl))) map.set(keyLbl, stamp);
    }
  } catch {
    // Supabase missing or transient — fall through with empty map; the
    // emitted urls will simply omit <lastmod> rather than lie.
  }
  return map;
}

export async function GET() {
  const lastmodMap = await fetchLastmodMap();
  const items = [];

  for (const cat of categories) {
    const catStamp = lastmodMap.get(`${cat.slug}|`);
    items.push(
      `  <url>\n` +
        `    <loc>${escapeXml(`${SITE_URL}/${cat.slug}`)}</loc>\n` +
        (catStamp ? `    <lastmod>${new Date(catStamp).toISOString()}</lastmod>\n` : '') +
        `  </url>`,
    );
    for (const label of cat.labels) {
      const lblStr = typeof label === 'string' ? label : (label?.label || label?.name || '');
      const lblSlug = labelSlug(label);
      if (!lblSlug) continue;
      const lblStamp = lastmodMap.get(`${cat.slug}|${lblStr}`);
      items.push(
        `  <url>\n` +
          `    <loc>${escapeXml(`${SITE_URL}/${cat.slug}/${lblSlug}`)}</loc>\n` +
          (lblStamp ? `    <lastmod>${new Date(lblStamp).toISOString()}</lastmod>\n` : '') +
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

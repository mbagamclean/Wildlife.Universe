import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let _client = null;
function reader() {
  if (!_client) {
    _client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
  }
  return _client;
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function makeExcerpt(post, max = 200) {
  const src = post.description || stripHtml(post.body) || '';
  if (src.length <= max) return src;
  return `${src.slice(0, max - 1).trimEnd()}…`;
}

// Escape characters that have meaning inside Postgres `ilike` patterns
// when used via PostgREST `or()` strings. Commas + parens would break the
// surrounding `or(...)` expression; %/_ are wildcards we don't want from
// user input.
function sanitizeForOr(q) {
  return String(q)
    .replace(/[%_]/g, ' ')
    .replace(/[,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(req) {
  const url = new URL(req.url);
  const rawQ = (url.searchParams.get('q') || '').trim();
  const limitParam = parseInt(url.searchParams.get('limit') || '30', 10);
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 30, 1), 100);

  if (!rawQ) {
    return NextResponse.json({
      success: true,
      query: '',
      results: [],
      count: 0,
    });
  }

  const safeQ = sanitizeForOr(rawQ);
  if (!safeQ) {
    return NextResponse.json({
      success: true,
      query: rawQ,
      results: [],
      count: 0,
    });
  }

  const pattern = `%${safeQ}%`;

  let { data, error } = await reader()
    .from('posts')
    .select('id, slug, title, body, category, label, cover, description, tags, created_at')
    .neq('status', 'draft')
    .or(`title.ilike.${pattern},body.ilike.${pattern},description.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[api/search] supabase error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Search temporarily unavailable', query: rawQ, results: [], count: 0 },
      { status: 200 },
    );
  }

  const rows = data || [];

  // Tag matching: posts.tags is typically a text[] column. PostgREST
  // doesn't expose ilike across array elements simply, so we do a second
  // pass with the `cs` (contains) operator on a lowercase variant of the
  // query — best-effort, won't fail if the column is missing or null.
  let tagRows = [];
  try {
    const tagPattern = safeQ.toLowerCase();
    const { data: tagData } = await reader()
      .from('posts')
      .select('id, slug, title, body, category, label, cover, description, tags, created_at')
      .neq('status', 'draft')
      .contains('tags', [tagPattern])
      .order('created_at', { ascending: false })
      .limit(limit);
    tagRows = tagData || [];
  } catch {
    tagRows = [];
  }

  // Merge + de-dup by id, preserving order (title/body matches first)
  const seen = new Set();
  const merged = [];
  for (const row of [...rows, ...tagRows]) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
    if (merged.length >= limit) break;
  }

  const results = merged.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title || 'Untitled',
    category: row.category || null,
    label: row.label || null,
    cover: row.cover || null,
    excerpt: makeExcerpt(row, 200),
    createdAt: row.created_at,
  }));

  return new NextResponse(
    JSON.stringify({
      success: true,
      query: rawQ,
      results,
      count: results.length,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}

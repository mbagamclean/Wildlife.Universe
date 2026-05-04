/**
 * Server-side data helpers for SEO surfaces (sitemap, RSS).
 *
 * Uses an anon-key Supabase client suitable for read-only public data.
 * Does NOT depend on cookies / request context, so it can run inside
 * sitemap.js, robots.js, and route handlers without `cookies()` warnings.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let _client = null;
function client() {
  if (!_client) {
    _client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
  }
  return _client;
}

function mapPost(row) {
  if (!row) return null;
  const { cover_palette, iucn_status, created_at, updated_at, ...rest } = row;
  return {
    ...rest,
    coverPalette: cover_palette,
    iucnStatus: iucn_status,
    createdAt: created_at,
    updatedAt: updated_at || created_at,
  };
}

export async function fetchPostBySlug(slug) {
  if (!slug) return null;
  const { data, error } = await client()
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.warn('[seo-data] fetchPostBySlug failed:', error.message);
    return null;
  }
  return mapPost(data);
}

export async function fetchPublishedPosts({ limit } = {}) {
  let query = client()
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  // Treat anything except 'draft' as published (admin uses same convention).
  query = query.neq('status', 'draft');
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    // Sitemap/RSS should never break the build — log + return empty.
    console.warn('[seo-data] fetchPublishedPosts failed:', error.message);
    return [];
  }
  return (data || []).map(mapPost);
}

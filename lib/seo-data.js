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

export async function fetchPublishedPostsByCategory(category, { limit } = {}) {
  if (!category) return [];
  let query = client()
    .from('posts')
    .select('*')
    .eq('category', category)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.warn('[seo-data] fetchPublishedPostsByCategory failed:', error.message);
    return [];
  }
  return (data || []).map(mapPost);
}

// ───────────────────────────────────────────────────────────────────
// Author + recency helpers
// ───────────────────────────────────────────────────────────────────

/**
 * URL-safe slug derived from any string. Mirrors the convention used in
 * lib/storage/db.js so author display names map deterministically to the
 * same slug used in /author/[slug] URLs.
 */
export function authorSlug(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

/**
 * List published posts whose author (post.author.name) slugifies to
 * the given slug. Filtering happens client-side because author lives
 * inside a JSON column and isn't readily indexed.
 */
export async function fetchPostsByAuthor(slug, { limit = 50 } = {}) {
  if (!slug) return [];
  const { data, error } = await client()
    .from('posts')
    .select('*')
    .neq('status', 'draft')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[seo-data] fetchPostsByAuthor failed:', error.message);
    return [];
  }
  const target = String(slug).toLowerCase();
  const matched = (data || []).filter((row) => {
    const name = row?.author?.name || row?.author || '';
    return authorSlug(name) === target;
  });
  return matched.slice(0, limit).map(mapPost);
}

/**
 * Distinct author display name for a slug, picked from the most-recent
 * post that matches. Returns null if no match exists.
 */
export async function fetchAuthorDisplayName(slug) {
  const posts = await fetchPostsByAuthor(slug, { limit: 1 });
  if (!posts.length) return null;
  const a = posts[0]?.author;
  if (!a) return null;
  if (typeof a === 'string') return a;
  return a.name || null;
}

/**
 * Posts published within the last `sinceHours` hours. Used by the
 * Google News sitemap (default 48h window).
 */
export async function fetchRecentPosts({ sinceHours = 48 } = {}) {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await client()
    .from('posts')
    .select('*')
    .neq('status', 'draft')
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[seo-data] fetchRecentPosts failed:', error.message);
    return [];
  }
  return (data || []).map(mapPost);
}

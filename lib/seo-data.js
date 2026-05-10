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
  const {
    cover_palette, iucn_status, created_at, updated_at,
    related_post_ids, reading_time_minutes, structured_data,
    ...rest
  } = row;
  return {
    ...rest,
    coverPalette:        cover_palette,
    iucnStatus:          iucn_status,
    createdAt:           created_at,
    updatedAt:           updated_at || created_at,
    relatedPostIds:      related_post_ids ?? [],
    readingTimeMinutes:  reading_time_minutes ?? null,
    structuredData:      structured_data ?? null,
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

// ───────────────────────────────────────────────────────────────────
// Rich category + label fetchers — read the metadata the new admin
// editor writes (hero/thumb URLs, descriptions, SEO copy) so public
// pages can render against the DB, not just the static mock.
// ───────────────────────────────────────────────────────────────────

const RICH_CATEGORY_FIELDS =
  'slug, name, labels, short_description, description, thumbnail_url, hero_image_url, hero_image_mobile_url, image_alt, image_caption, seo_title, seo_description, seo_keywords, canonical_url, og_title, og_description, twitter_title, twitter_description, featured, trending, position';

function mapRichCategory(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    labels: row.labels || [],
    shortDescription: row.short_description ?? '',
    description: row.description ?? '',
    thumbnailUrl: row.thumbnail_url ?? '',
    heroImageUrl: row.hero_image_url ?? '',
    heroImageMobileUrl: row.hero_image_mobile_url ?? '',
    imageAlt: row.image_alt ?? '',
    imageCaption: row.image_caption ?? '',
    seoTitle: row.seo_title ?? '',
    seoDescription: row.seo_description ?? '',
    seoKeywords: row.seo_keywords ?? '',
    canonicalUrl: row.canonical_url ?? '',
    ogTitle: row.og_title ?? '',
    ogDescription: row.og_description ?? '',
    twitterTitle: row.twitter_title ?? '',
    twitterDescription: row.twitter_description ?? '',
    featured: !!row.featured,
    trending: !!row.trending,
    position: row.position ?? 0,
  };
}

export async function fetchCategoryRichBySlug(slug) {
  if (!slug) return null;
  const { data, error } = await client()
    .from('categories')
    .select(RICH_CATEGORY_FIELDS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.warn('[seo-data] fetchCategoryRichBySlug failed:', error.message);
    return null;
  }
  return mapRichCategory(data);
}

// ───────────────────────────────────────────────────────────────────
// Hero slides — server-side fetch so the homepage can stream the first
// hero into the initial HTML payload instead of showing a green
// gradient placeholder until the client hydrates.
// ───────────────────────────────────────────────────────────────────

export async function fetchActiveHeroSlides() {
  const { data, error } = await client()
    .from('heroes')
    .select('*')
    .eq('active', true)
    .order('position', { ascending: true });
  if (error) {
    console.warn('[seo-data] fetchActiveHeroSlides failed:', error.message);
    return [];
  }
  return data || [];
}

export async function fetchHeroMode() {
  const { data, error } = await client()
    .from('hero_mode')
    .select('mode')
    .eq('id', 1)
    .maybeSingle();
  if (error) return 'default';
  return data?.mode || 'default';
}

export async function fetchAllCategoriesRich() {
  const { data, error } = await client()
    .from('categories')
    .select(RICH_CATEGORY_FIELDS)
    .order('position', { ascending: true })
    .order('slug', { ascending: true });
  if (error) {
    console.warn('[seo-data] fetchAllCategoriesRich failed:', error.message);
    return [];
  }
  return (data || []).map(mapRichCategory);
}

const RICH_LABEL_FIELDS =
  'category_slug, slug, name, short_description, description, thumbnail_url, hero_image_url, hero_image_mobile_url, image_alt, image_caption, seo_title, seo_description, seo_keywords, canonical_url, og_title, og_description, twitter_title, twitter_description, featured, position';

function mapRichLabel(row) {
  if (!row) return null;
  return {
    categorySlug: row.category_slug,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description ?? '',
    description: row.description ?? '',
    thumbnailUrl: row.thumbnail_url ?? '',
    heroImageUrl: row.hero_image_url ?? '',
    heroImageMobileUrl: row.hero_image_mobile_url ?? '',
    imageAlt: row.image_alt ?? '',
    imageCaption: row.image_caption ?? '',
    seoTitle: row.seo_title ?? '',
    seoDescription: row.seo_description ?? '',
    seoKeywords: row.seo_keywords ?? '',
    canonicalUrl: row.canonical_url ?? '',
    ogTitle: row.og_title ?? '',
    ogDescription: row.og_description ?? '',
    twitterTitle: row.twitter_title ?? '',
    twitterDescription: row.twitter_description ?? '',
    featured: !!row.featured,
    position: row.position ?? 0,
  };
}

export async function fetchLabelRichBySlug(categorySlug, slug) {
  if (!categorySlug || !slug) return null;
  const { data, error } = await client()
    .from('category_labels')
    .select(RICH_LABEL_FIELDS)
    .eq('category_slug', categorySlug)
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.warn('[seo-data] fetchLabelRichBySlug failed:', error.message);
    return null;
  }
  return mapRichLabel(data);
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
// Paginated server-side fetchers used by /<category> and
// /<category>/<label> listing pages. Returns { posts, total, totalPages,
// page } so the page can render pagination links inline in the SSR HTML.
// ───────────────────────────────────────────────────────────────────

// 100 posts per category / label listing page. Pagination only shows
// when there are more than this many posts in the category — server
// renders all 100 in a single response so crawlers see the full list
// per page and users get instant pagination via plain <Link> hrefs.
export const POSTS_PER_LISTING_PAGE = 100;

function clampPage(input) {
  const n = Number.parseInt(input, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function fetchPostsForCategoryPage(
  category,
  { page = 1, pageSize = POSTS_PER_LISTING_PAGE } = {},
) {
  if (!category) return { posts: [], total: 0, totalPages: 1, page: 1 };
  const safePage = clampPage(page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await client()
    .from('posts')
    .select('*', { count: 'exact' })
    .eq('category', category)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    console.warn('[seo-data] fetchPostsForCategoryPage failed:', error.message);
    return { posts: [], total: 0, totalPages: 1, page: safePage };
  }
  const total = count ?? 0;
  return {
    posts: (data || []).map(mapPost),
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page: safePage,
  };
}

export async function fetchPostsForLabelPage(
  category,
  label,
  { page = 1, pageSize = POSTS_PER_LISTING_PAGE } = {},
) {
  if (!category || !label) {
    return { posts: [], total: 0, totalPages: 1, page: 1 };
  }
  const safePage = clampPage(page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await client()
    .from('posts')
    .select('*', { count: 'exact' })
    .eq('category', category)
    .eq('label', label)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    console.warn('[seo-data] fetchPostsForLabelPage failed:', error.message);
    return { posts: [], total: 0, totalPages: 1, page: safePage };
  }
  const total = count ?? 0;
  return {
    posts: (data || []).map(mapPost),
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page: safePage,
  };
}

/**
 * Fetch posts whose `id` is in the provided list, preserving the order of
 * `ids` so editorial curation order survives. Drops drafts. Returns at
 * most `ids.length` posts.
 */
export async function fetchPostsByIds(ids = []) {
  const clean = (ids || []).filter((id) => typeof id === 'string' && id);
  if (clean.length === 0) return [];
  const { data, error } = await client()
    .from('posts')
    .select('*')
    .in('id', clean)
    .neq('status', 'draft');
  if (error) {
    console.warn('[seo-data] fetchPostsByIds failed:', error.message);
    return [];
  }
  const byId = new Map((data || []).map((row) => [row.id, mapPost(row)]));
  return clean.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Pick up to `limit` related posts for `post`. Priority order:
 *   1. Editorially curated list in `post.relatedPostIds`
 *   2. Same category + same label
 *   3. Same category (any label)
 *   4. Tag overlap across all categories
 *
 * Used to render a server-rendered `<nav>` of related posts on each
 * detail page so internal links land in the initial HTML for crawlers.
 */
export async function fetchRelatedPosts(post, { limit = 8 } = {}) {
  if (!post?.id) return [];
  const seen = new Set([post.id]);
  const out = [];

  const take = (rows) => {
    for (const r of rows) {
      if (out.length >= limit) break;
      if (!r || !r.id || seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
  };

  if (Array.isArray(post.relatedPostIds) && post.relatedPostIds.length > 0) {
    take(await fetchPostsByIds(post.relatedPostIds));
    if (out.length >= limit) return out.slice(0, limit);
  }

  if (post.category && post.label) {
    const { data } = await client()
      .from('posts')
      .select('*')
      .eq('category', post.category)
      .eq('label', post.label)
      .neq('status', 'draft')
      .neq('id', post.id)
      .order('created_at', { ascending: false })
      .limit(limit * 2);
    take((data || []).map(mapPost));
    if (out.length >= limit) return out.slice(0, limit);
  }

  if (post.category) {
    const { data } = await client()
      .from('posts')
      .select('*')
      .eq('category', post.category)
      .neq('status', 'draft')
      .neq('id', post.id)
      .order('created_at', { ascending: false })
      .limit(limit * 2);
    take((data || []).map(mapPost));
    if (out.length >= limit) return out.slice(0, limit);
  }

  if (Array.isArray(post.tags) && post.tags.length > 0) {
    const { data } = await client()
      .from('posts')
      .select('*')
      .overlaps('tags', post.tags)
      .neq('status', 'draft')
      .neq('id', post.id)
      .order('created_at', { ascending: false })
      .limit(limit * 2);
    take((data || []).map(mapPost));
  }

  return out.slice(0, limit);
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

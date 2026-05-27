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

// Server-only client for tables that still need a public-read RLS
// policy. Falls back to the anon client when the service-role key
// isn't available (e.g. preview deployments without the env). The
// service role never leaves the server — this module is imported by
// server components and route handlers only.
let _adminClient = null;
function adminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return client();
  if (!_adminClient) {
    _adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _adminClient;
}

// Only the columns the homepage card components actually consume. Keeps
// the SSR HTML payload bounded — selecting '*' pulls 100KB+ of body /
// content_html per row, which on the homepage multiplies across four
// sections into a multi-megabyte first paint.
const CARD_COLUMNS = [
  'id', 'slug', 'title', 'excerpt', 'description',
  'category', 'label',
  'cover', 'cover_palette',
  'scientific_name', 'iucn_status',
  'status', 'views',
  'created_at', 'updated_at',
  'reading_time_minutes',
].join(', ');

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

/**
 * Strict per-category post lookup used by the new `/<category>/<slug>`
 * route. Filters by both category AND slug so a cross-category slug
 * collision (rare but possible in the future) can't accidentally serve
 * the wrong post.
 */
export async function fetchPostByCategoryAndSlug(category, slug) {
  if (!category || !slug) return null;
  const { data, error } = await client()
    .from('posts')
    .select('*')
    .eq('category', category)
    .eq('slug', slug)
    .neq('status', 'draft')
    .maybeSingle();
  if (error) {
    console.warn('[seo-data] fetchPostByCategoryAndSlug failed:', error.message);
    return null;
  }
  return mapPost(data);
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

export async function fetchPublishedPosts({ limit, slim = false } = {}) {
  let query = client()
    .from('posts')
    .select(slim ? CARD_COLUMNS : '*')
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
  // category_labels lacks a public-read RLS policy (migration 016
  // adds one once a CEO runs it in the Supabase SQL editor). Until
  // then, use service-role so admin-uploaded hero images render on
  // public label pages. Once the migration lands this can revert to
  // client(); behaviour is identical either way.
  const { data, error } = await adminClient()
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

export async function fetchPublishedPostsByCategory(category, { limit, slim = false } = {}) {
  if (!category) return [];
  let query = client()
    .from('posts')
    .select(slim ? CARD_COLUMNS : '*')
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

// Slim title + slug catalog used to power the in-body internal-link
// injector on post detail pages. We pull every non-draft post's title
// + slug + scientific name (when present) and let the caller build a
// term→slug map. Cached aggressively by Next.js ISR since the catalog
// only changes when a post is published or renamed.
export async function fetchInternalLinkCatalog() {
  const { data, error } = await client()
    .from('posts')
    .select('slug, title, scientific_name, category, label')
    .neq('status', 'draft')
    .order('title', { ascending: true });
  if (error) {
    console.warn('[seo-data] fetchInternalLinkCatalog failed:', error.message);
    return [];
  }
  return (data || []).map((row) => ({
    slug: row.slug,
    title: row.title,
    scientificName: row.scientific_name || null,
    category: row.category || 'posts',
    label: row.label || null,
  }));
}

// Server-side equivalent of db.posts.listAllWithIUCN(), pre-grouped by
// iucn_status and sorted within each group by view count desc so the
// homepage IUCNSection can render against initial props with no client
// round-trip.
export async function fetchIUCNGrouped({ slim = false } = {}) {
  const { data, error } = await client()
    .from('posts')
    .select(slim ? CARD_COLUMNS : '*')
    .not('iucn_status', 'is', null)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[seo-data] fetchIUCNGrouped failed:', error.message);
    return {};
  }
  const posts = (data || []).map(mapPost);
  const grouped = {};
  for (const post of posts) {
    const s = post.iucnStatus;
    if (!s) continue;
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(post);
  }
  for (const s of Object.keys(grouped)) {
    grouped[s].sort((a, b) => (b.views || 0) - (a.views || 0));
  }
  return grouped;
}

// Top-N blog posts (category='posts'/'Posts') by view count desc. Used by
// the homepage Trending section to render against initial props.
export async function fetchTrendingPosts({ limit = 6, slim = false } = {}) {
  const { data, error } = await client()
    .from('posts')
    .select(slim ? CARD_COLUMNS : '*')
    .in('category', ['posts', 'Posts'])
    .neq('status', 'draft')
    .order('views', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[seo-data] fetchTrendingPosts failed:', error.message);
    return [];
  }
  return (data || []).map(mapPost);
}

// Posts within category='posts' whose label (case-insensitive) matches
// any of the supplied labels. Backs LatestArticles / LatestConservation /
// LatestTourism / WhyHow-style label-filtered carousels.
export async function fetchPublishedPostsByLabels(labels, { limit, slim = false } = {}) {
  const labelList = (Array.isArray(labels) ? labels : [labels])
    .filter(Boolean)
    .map((l) => String(l).toLowerCase());
  if (labelList.length === 0) return [];
  let query = client()
    .from('posts')
    .select(slim ? CARD_COLUMNS : '*')
    .in('category', ['posts', 'Posts'])
    .neq('status', 'draft')
    .order('created_at', { ascending: false });
  // PostgREST `or` filter with ilike for case-insensitive label match.
  const orFilter = labelList.map((l) => `label.ilike.${l}`).join(',');
  query = query.or(orFilter);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.warn('[seo-data] fetchPublishedPostsByLabels failed:', error.message);
    return [];
  }
  return (data || []).map(mapPost);
}

// Why/How posts: category='posts' with label OR title containing how/why.
// Mirrors the client-side filter in WhyHowSection — server-side we accept
// label OR title match. Drops the title prefix check (in-memory only) and
// trusts the label; the section already curates how/why posts by label.
export async function fetchHowWhyPosts({ limit, slim = false } = {}) {
  let query = client()
    .from('posts')
    .select(slim ? CARD_COLUMNS : '*')
    .in('category', ['posts', 'Posts'])
    .neq('status', 'draft')
    .or('label.ilike.%how%,label.ilike.%why%,title.ilike.how %,title.ilike.why %')
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.warn('[seo-data] fetchHowWhyPosts failed:', error.message);
    return [];
  }
  return (data || []).map(mapPost);
}

// CEO-curated books: any post with book_status set to 'free' or 'sold'.
// Used by the homepage BooksSection cover-flow carousel.
export async function fetchCuratedBooks({ slim = false } = {}) {
  // `price` is optional on this schema — BooksSection falls back to a
  // default when undefined, so don't ask for the column explicitly.
  const { data, error } = await client()
    .from('posts')
    .select(slim ? CARD_COLUMNS + ', book_status' : '*')
    .in('book_status', ['free', 'sold'])
    .neq('status', 'draft')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[seo-data] fetchCuratedBooks failed:', error.message);
    return [];
  }
  return (data || []).map(mapPost);
}

// Approved site reviews (mirror of the public /api/reviews GET handler).
// Used by the homepage ReviewsSection so the testimonial cards render
// in the SSR HTML instead of fetching after mount.
export async function fetchApprovedReviews({ limit = 20 } = {}) {
  const { data, error } = await client()
    .from('site_reviews')
    .select('id, user_name, user_avatar, rating, comment, is_verified, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[seo-data] fetchApprovedReviews failed:', error.message);
    return [];
  }
  return data || [];
}

// Curated homepage videos for a given section (featured / shorts /
// documentaries). Mirrors db.homepageVideos.list() so we can render the
// carousels server-side.
const VIDEO_COLUMNS =
  'id, section, position, active, title, description, thumbnail, source_url, source_type, duration_sec, created_at';

function mapVideo(row) {
  if (!row) return null;
  const { source_url, source_type, duration_sec, created_at, ...rest } = row;
  return {
    ...rest,
    sourceUrl: source_url,
    sourceType: source_type,
    durationSec: duration_sec,
    createdAt: created_at,
  };
}

export async function fetchHomepageVideos(section, { limit } = {}) {
  if (!section) return [];
  let query = client()
    .from('homepage_videos')
    .select(VIDEO_COLUMNS)
    .eq('section', section)
    .eq('active', true)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.warn('[seo-data] fetchHomepageVideos failed:', error.message);
    return [];
  }
  return (data || []).map(mapVideo);
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

/**
 * Site-wide paginated post list (all categories mixed). Backs the
 * /wildlife-content page: every published post, newest first, sliced
 * server-side via the Supabase range() operator so we never ship more
 * rows than the user can see on the current page.
 */
export async function fetchAllPostsPaginated(
  { page = 1, pageSize = 115, slim = true } = {},
) {
  const safePage = clampPage(page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await client()
    .from('posts')
    .select(slim ? CARD_COLUMNS : '*', { count: 'exact' })
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    console.warn('[seo-data] fetchAllPostsPaginated failed:', error.message);
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

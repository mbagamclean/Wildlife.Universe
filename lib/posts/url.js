/**
 * Canonical post URL builder.
 *
 * URL scheme (May 2026 restructure, amended for label segment):
 *   - Posts with a label  → /<category>/<label-slug>/<post-slug>
 *   - Posts without label → /<category>/<post-slug>
 *
 * Examples:
 *   { slug: 'african-elephant',           category: 'animals', label: 'Mammals' }
 *      → /animals/mammals/african-elephant
 *   { slug: 'superb-starling',            category: 'birds',   label: 'Song' }
 *      → /birds/song/superb-starling
 *   { slug: 'why-elephants-do-wallowing', category: 'posts',   label: 'Why Questions' }
 *      → /posts/why-questions/why-elephants-do-wallowing
 *   { slug: 'untagged-post',              category: 'animals' }   (no label)
 *      → /animals/untagged-post
 *
 * Every internal link uses this helper. Sitemaps, RSS, JSON-LD, share
 * URLs, admin previews, IndexNow submissions — single source of truth so
 * the URL pattern can evolve without hunting through dozens of files.
 *
 * Legacy URLs (`/posts/<slug>` and bare `/<category>/<slug>` for labeled
 * posts) are 301-redirected to the canonical form by the route handlers
 * so existing Google indexing, backlinks, and bookmarks don't break.
 */

import { SITE_URL } from '@/lib/seo';

const POSTS_CATEGORY = 'posts';

export function normalizeCategory(rawCategory) {
  if (!rawCategory) return POSTS_CATEGORY;
  return String(rawCategory).trim().toLowerCase();
}

export function isPostsCategory(category) {
  return normalizeCategory(category) === POSTS_CATEGORY;
}

/**
 * Slugify a label name the same way `lib/mock/categories.js#labelSlug`
 * does. Duplicated here so this module has zero coupling to UI mocks
 * (used by route handlers, sitemaps, RSS — all server-side).
 */
export function slugifyLabel(label) {
  if (!label) return null;
  return String(label).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || null;
}

/** Relative path for a post (e.g. `/animals/mammals/african-elephant`). */
export function postUrl(post) {
  if (!post || !post.slug) return null;
  const category = normalizeCategory(post.category);
  const labelSlug = slugifyLabel(post.label);
  if (labelSlug) {
    return `/${category}/${labelSlug}/${post.slug}`;
  }
  return `/${category}/${post.slug}`;
}

/** Absolute URL for a post (e.g. `https://www.wildlifeuniverse.org/animals/mammals/african-elephant`). */
export function postAbsoluteUrl(post) {
  const rel = postUrl(post);
  return rel ? `${SITE_URL}${rel}` : null;
}

/**
 * Build a post URL from raw fields. Useful at boundaries where we only
 * have `category` + `slug` (legacy analytics rows missing label).
 */
export function postUrlFromParts(category, slug, label) {
  return postUrl({ category, slug, label });
}

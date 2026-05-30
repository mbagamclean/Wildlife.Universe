/**
 * Server-side runtime author resolution.
 *
 * The 13 author personas ship as static defaults in lib/seo/authors.js.
 * lib/seo/author_overrides (Supabase table) stores per-author edits made
 * via /admin/content/authors. This module merges the override over the
 * default and returns the "live" author shape that the rest of the site
 * renders.
 *
 * Read path:
 *   server components → fetchAuthorBySlug(slug)
 *   client components → getAuthorBySlug(slug)  (still from JS module,
 *                       same data as the most recent build)
 *
 * Both functions return the same Author shape, so consumers don't have
 * to branch on which side they're on.
 *
 * If the author_overrides table doesn't exist yet (migration 021 not
 * run), this module silently falls back to the static defaults — no
 * crash, no error log, the site keeps working.
 */

import { createClient } from '@supabase/supabase-js';
import { allAuthors, getAuthorBySlug as staticGet, getDefaultAuthor } from './authors';

let _client = null;
function client() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
  }
  return _client;
}

function mergeAuthor(staticAuthor, override) {
  if (!staticAuthor) return null;
  if (!override) return staticAuthor;
  // Override fields are NULL when "keep default"; truthy when "use this
  // value instead". Empty string is treated as "keep default" too — admin
  // UI clears via NULL, not "".
  const pick = (k, snakeK) => {
    const v = override[snakeK || k];
    return v == null || v === '' ? staticAuthor[k] : v;
  };
  return {
    ...staticAuthor,
    name: pick('name'),
    title: pick('title'),
    bio: pick('bio'),
    photoUrl: pick('photoUrl', 'photo_url'),
    expertise: pick('expertise'),
    affiliation: pick('affiliation'),
    twitter: pick('twitter'),
    website: pick('website'),
  };
}

/**
 * Async resolver — fetches the override row for a single slug and
 * merges it over the static default. Use this in server components.
 */
export async function fetchAuthorBySlug(slug) {
  const base = staticGet(slug);
  if (!base) return null;
  try {
    const { data } = await client()
      .from('author_overrides')
      .select('*')
      .eq('slug', base.slug)
      .maybeSingle();
    return mergeAuthor(base, data);
  } catch {
    // Table missing or transient — fall back to static default.
    return base;
  }
}

/**
 * Async bulk resolver — returns every author with overrides merged.
 * Used by the /admin/content/authors index page and the public /author
 * index page.
 */
export async function fetchAllAuthorsLive() {
  const base = allAuthors();
  try {
    const { data } = await client()
      .from('author_overrides')
      .select('*');
    if (!data || data.length === 0) return base;
    const overridesBySlug = new Map(data.map((r) => [r.slug, r]));
    return base.map((a) => mergeAuthor(a, overridesBySlug.get(a.slug)));
  } catch {
    return base;
  }
}

export { staticGet as getAuthorBySlugStatic, getDefaultAuthor };

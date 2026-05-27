/**
 * /sitemaps/<category>/<page> — per-category leaf sitemap.
 *
 * One handler covers every category — add a new category to
 * lib/mock/categories.js and its sitemap auto-appears in the index
 * with no new route file. Pages are 1-indexed; out-of-range pages
 * 404 so crawlers stop walking.
 */

import { categories } from '@/lib/mock/categories';
import { buildCategorySitemapResponse } from '@/lib/seo/sitemap-builder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = new Set(categories.map((c) => c.slug));

export async function GET(_request, { params }) {
  const { category, page } = await params;
  if (!VALID_CATEGORIES.has(category)) {
    return new Response('Not found', { status: 404 });
  }
  return buildCategorySitemapResponse(category, page);
}

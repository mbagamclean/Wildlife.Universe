/**
 * /posts-sitemap.xml — backwards-compat redirect.
 *
 * Historically a leaf urlset of all published posts. The post sitemap
 * is now paginated per-category under /sitemaps/<category>/<page>, and
 * /sitemap.xml is the canonical index listing them all.
 *
 * Redirects to /sitemap.xml so any existing Search Console submission
 * of /posts-sitemap.xml lands on the real sitemap index that drives
 * indexing today. (Previously we 301'd to /posts-sitemap/1, but that
 * legacy paginated route is unreliable in production and can return 404
 * — better to send crawlers straight at the index.)
 */

import { SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const URLS_PER_SITEMAP = 200;

export async function GET() {
  return Response.redirect(`${SITE_URL}/sitemap.xml`, 301);
}

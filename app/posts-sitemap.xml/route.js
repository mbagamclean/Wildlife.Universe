/**
 * /posts-sitemap.xml — backwards-compat redirect to /posts-sitemap/1.
 *
 * Historically a leaf urlset of all published posts. The post sitemap
 * is now paginated under /posts-sitemap/[page] (200 URLs/page), and
 * /sitemap.xml lists those paginated children directly so crawlers
 * never have to traverse a nested sitemap index (Google doesn't follow
 * nested indexes).
 *
 * This route stays alive so existing GSC submissions of
 * /posts-sitemap.xml don't break — it permanently redirects to page 1.
 */

import { SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const URLS_PER_SITEMAP = 200;

export async function GET() {
  return Response.redirect(`${SITE_URL}/posts-sitemap/1`, 301);
}

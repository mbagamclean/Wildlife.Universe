/**
 * /posts-sitemap/[page] — legacy leaf sitemap.
 *
 * Pre-restructure (May 2026) the sitemap index pointed here for every
 * post regardless of category. The index now points at the per-category
 * route (/sitemaps/<category>/<page>) but this URL is preserved so any
 * Search Console submission, cached crawler queue, or external link
 * still finds content. Returns every published post — URLs already
 * reflect the new /<category>/<slug> pattern via the shared builder.
 */

import { buildLegacyAllPostsSitemapResponse } from '@/lib/seo/sitemap-builder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { page } = await params;
  return buildLegacyAllPostsSitemapResponse(page);
}

import { RefreshCw } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Cache Policy',
  description: `Why ${SITE_NAME} caches content, how the layered cache works, and how updates propagate to readers.`,
  path: '/legal/cache',
});

const sections = [
  {
    heading: 'Purpose of Website Caching',
    body: [
      'Caching is the practice of storing the result of an expensive operation so that the next request for the same result can be served faster, more reliably, and with less load on the underlying systems. For a publication that serves readers in every part of the world, caching is the difference between an article that loads in under a second and one that loads in five — between a homepage that holds steady under a sudden surge of attention and one that staggers.',
      'Wildlife Universe operates a layered cache that includes the reader\'s browser, our content delivery network (CDN), our application servers, and our database. Each layer stores something different and refreshes on a different schedule. This Cache Policy describes how the system works, what readers can expect when content is updated, and what controls are available to readers and editors.',
    ],
  },
  {
    heading: 'Browser Caching',
    body: [
      'When you visit Wildlife Universe, your browser stores copies of the resources that make up each page — HTML, CSS stylesheets, JavaScript bundles, fonts, images — so that the next time you load a page from the same site, the browser can reuse those resources without re-downloading them. We assign appropriate caching headers to each kind of resource: long lifetimes (typically one year) for content-addressed assets such as font files and image variants whose URLs change when the underlying file changes, and short lifetimes (typically a few minutes) for HTML pages whose content changes more frequently.',
      'Browser caching is what makes a second visit to the site feel instant. If a reader\'s browser has been on the site recently, most of the supporting assets are reused from local storage and only the article body needs to come down over the network.',
    ],
  },
  {
    heading: 'Server-Side Caching',
    body: [
      'On our application servers, we cache the rendered output of expensive pages — the homepage with its many sections, category landing pages with their listings of recent posts, individual article pages — so that the same page does not have to be re-rendered for every visitor. The rendered HTML is stored in memory for a short period, typically thirty to sixty seconds, and is served directly from cache to every reader who arrives during that window.',
      'Server-side caching has two benefits: it reduces the load on the database and the rendering pipeline, and it makes the site faster for readers. The trade-off is that an editor change can take up to a minute to propagate to readers. For most edits this is acceptable; for urgent corrections, we have an immediate-revalidation path that pushes the change through the cache instantly.',
    ],
  },
  {
    heading: 'CDN Caching',
    body: [
      'A content delivery network (CDN) is a global mesh of edge servers that hold copies of frequently-requested resources close to the readers who request them. When a reader in São Paulo visits Wildlife Universe, the page is served from a CDN node in or near São Paulo rather than from a single origin server thousands of kilometres away. The result is faster page-loads and a more reliable experience under traffic spikes.',
      'Our CDN caches the same kinds of resources that the browser caches — HTML pages, stylesheets, scripts, images, fonts — and applies the same general rule: short lifetimes for HTML, long lifetimes for content-addressed assets. The CDN respects the cache headers we set, and the CDN-level cache can be invalidated by our publishing system when an article is updated.',
    ],
  },
  {
    heading: 'Image Optimization and Caching',
    body: [
      'Images are the heaviest resources on any wildlife site, and we work hard to keep them fast. Every photograph and illustration is processed into multiple variants at different sizes and modern formats (AVIF, WebP, with JPEG as a fallback) so that each reader\'s browser downloads only the variant best suited to its screen size and connection. Each variant has a content-addressed URL — a URL that changes when the underlying file changes — which means image responses can be cached aggressively (often for a full year) without risk of serving stale content.',
      'When an image is replaced (for example, when an editor uploads a better photograph for a species profile), the new image gets a new URL. The old URL remains cacheable but is no longer referenced by any page, so it falls out of the cache naturally.',
    ],
  },
  {
    heading: 'Website Performance Benefits',
    body: [
      'The combined effect of browser, server-side, and CDN caching is that a typical Wildlife Universe page loads in under a second on a fast connection and in two to three seconds on a slower connection, including the time needed to display the cover image at high resolution. This matters for two reasons: readers stay engaged when pages are fast (slow pages drive readers away), and search engines favour faster sites in their ranking signals.',
      'Performance is not a one-time achievement. We monitor page-load times continuously and revisit our caching configuration whenever we add new features, change infrastructure providers, or notice a regression. Performance work is part of editorial work because the fastest article is the one a reader actually reads.',
    ],
  },
  {
    heading: 'Cache Refresh Procedures',
    body: [
      'For most edits, cache refresh is automatic and unattended. Server-side cache entries expire on their own; CDN entries expire on their own; browser entries expire on their own. The default behaviour means that within a minute or two of an editor publishing or updating an article, the change is visible to all readers without any manual intervention.',
      'For changes that need to be visible immediately — a correction to an inaccurate statement, a hot-fix to a broken layout — our publishing system can trigger explicit cache invalidation at the server-side and CDN layers, forcing the next request to re-render. We use this immediate-revalidation path sparingly, because it bypasses the performance benefits of caching, but it is available when timeliness matters.',
    ],
  },
  {
    heading: 'Content Update Propagation',
    body: [
      'When an editor updates an article, the chain of cache layers refreshes in a defined order: the database is updated first, then the application-server cache entry for the affected URL is invalidated, then the CDN edge nodes are notified to drop their cached copies. The next reader to request that URL will trigger a fresh render from the new database state, and the new render will populate the caches for the readers who follow.',
      'For most edits, this propagation completes within sixty seconds. Readers who already had the old version cached in their own browser will continue to see the old version until their local cache expires (typically within a few minutes) or until they reload the page. We accept this small lag as the cost of the performance benefits caching provides.',
    ],
  },
  {
    heading: 'User Cache Management',
    body: [
      'If you suspect you are seeing a stale version of an article — for example, if you read a correction in the newsletter but the article still shows the old text — you can usually resolve it by performing a hard reload in your browser. The keyboard shortcut is typically Ctrl+Shift+R (Windows / Linux) or Cmd+Shift+R (macOS). A hard reload forces the browser to bypass its local cache and request a fresh copy of the page.',
      'If a hard reload does not resolve the staleness, please let us know. It may indicate a problem with our cache invalidation that we should investigate.',
    ],
  },
  {
    heading: 'Security Considerations',
    body: [
      'Cache layers are configured to never cache private information. Pages that depend on the identity of the signed-in reader (such as account settings, saved-article lists, and the reader\'s comment history) bypass the public cache entirely and are rendered fresh on every request. Authentication tokens, session cookies, and other security-sensitive headers are excluded from cache keys so that a cached page cannot accidentally be served to the wrong reader.',
      'Cache poisoning attacks — where an attacker tries to put malicious content into the cache so that other readers receive it — are mitigated by our infrastructure providers\' standard protections and by application-level validation. We monitor for unusual cache hit patterns and investigate anomalies.',
    ],
  },
  {
    heading: 'Website Speed and Reliability Commitment',
    body: [
      'We commit to keeping Wildlife Universe fast and reliable. Specifically: most pages should load in under two seconds for readers on broadband or 4G connections; the site should remain available during traffic spikes that would overwhelm an un-cached site; and editorial updates should propagate to all readers within sixty seconds in normal operation and within minutes in the worst case.',
      'When performance regresses or when a cache misconfiguration causes readers to see stale content, we treat it as a serious editorial issue, not a back-office detail.',
    ],
  },
  {
    heading: 'Contact Information',
    body:
      'For any question about caching, page-load performance, or reports of stale content, write to Mclean Mbaga at mclean@wildlifeuniverse.org. Technical reports are particularly helpful when they include the URL in question, the time and date you observed the issue, your approximate geographic location (city or country is enough), and what you expected to see versus what you actually saw.',
  },
];

export default function CachePolicyPage() {
  return (
    <LegalPage
      title="Cache Policy"
      icon={RefreshCw}
      lead="Why Wildlife Universe caches content, how the layered cache works, and how updates propagate to readers."
      effectiveDate="2026-05-31"
      sections={sections}
    />
  );
}

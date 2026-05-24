import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  // Tree-shake the worst icon/animation barrels so a single icon import
  // doesn't pull the entire library into the route chunk. Saves real
  // First-Load JS on every public page.
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Long cache for transformed images — they're keyed by URL+w+q,
    // so a year is safe and standard.
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'msnllkjvhxzfoedgecva.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  serverExternalPackages: ['sharp', 'ffmpeg-static'],
  async headers() {
    return [
      {
        // Hashed bundle output — every chunk filename embeds a content
        // hash so a year is safe and standard.
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Static media in /public — opt into a year cache. Anything
        // that needs to change should ship under a versioned path.
        source: '/:all*(svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Sitemaps + RSS — short edge cache so search engines see
        // fresh updates while the origin isn't hit on every crawl.
        source: '/:path(sitemap.xml|rss.xml|posts-sitemap.xml|video-sitemap.xml|news-sitemap.xml|image-sitemap.xml|category-sitemap.xml|authoritative-sitemap.xml|robots.txt)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400' },
        ],
      },
      {
        // Public listing routes — these read searchParams (page=N)
        // which forces Next.js to dynamic-render and emit
        // Cache-Control: private. Google reads `private` as
        // "user-specific, do not index broadly" — the single biggest
        // indexing blocker. Override with public + s-maxage so the
        // Vercel edge can serve identical bytes to crawlers and users.
        // Listing pages: keep a short s-maxage so the edge can absorb
        // burst traffic, but DROP `stale-while-revalidate`. With SWR=300
        // the edge would serve stale HTML for 5 min after expiry while
        // it regenerated in the background — that's literally the
        // "refresh several times to see the new post" bug. On-demand
        // revalidation (POST /api/revalidate from the cron) purges this
        // immediately on publish, so the s-maxage is just a safety net.
        source: '/:cat(animals|birds|insects|plants|posts|redlist)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=30, must-revalidate' },
        ],
      },
      {
        source: '/:cat(animals|birds|insects|plants|posts)/:label',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=30, must-revalidate' },
        ],
      },
      {
        // Post detail — same problem, much worse SWR window (86400 =
        // 24 hours of stale serves). Drop SWR. New post content lands
        // immediately because the cron pings /api/revalidate after each
        // publish; edits land within s-maxage=60.
        source: '/posts/:slug',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=60, must-revalidate' },
        ],
      },
      {
        // Standard hardening + DNS prefetch on every response.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

export default nextConfig;

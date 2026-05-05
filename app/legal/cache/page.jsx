import { RefreshCw } from 'lucide-react';
import { LegalPage } from '@/components/legal/LegalPage';
import { buildStaticMetadata, SITE_NAME } from '@/lib/seo';

export const metadata = buildStaticMetadata({
  title: 'Cache Policy',
  description: `How ${SITE_NAME} caches articles and how quickly updates propagate.`,
  path: '/legal/cache',
});

const sections = [
  {
    heading: 'Why caching',
    body: `${SITE_NAME} serves content from a global edge network so articles load fast wherever you’re reading. To make this work, the site caches HTML, images, and video at edge locations close to readers. This page explains how that cache behaves so you know what to expect when content changes.`,
  },
  {
    heading: 'Cache lifetimes',
    list: [
      'Article HTML — revalidated on every change. New posts are reachable within seconds of publishing.',
      'Article images and video — cached for up to 1 year, identified by content-hashed URLs so updated media never gets the old version.',
      'Sitemaps — cached for 15 minutes (post / image / video) or 60 minutes (categories / static pages). Search engines refetch on their own schedule.',
      'RSS feeds — cached for 30 minutes.',
      'Static assets (CSS, JS, fonts) — cached for 1 year, fingerprinted by hash.',
    ],
  },
  {
    heading: 'Corrections and re-publication',
    body: 'When we publish a correction, the article HTML is purged from the edge cache immediately. Most readers see the corrected version on their next page load. CDN propagation can take up to a minute in remote regions.',
  },
  {
    heading: 'Search-engine indexing',
    body: 'Beyond our own cache, search engines (Google, Bing, Yandex) keep their own index. New posts are submitted to IndexNow on publish so Bing/Yandex/Naver see them within minutes. Google’s indexing schedule depends on its own crawl rules — we submit a fresh sitemap on every change to nudge it.',
  },
  {
    heading: 'Stale content',
    body: 'If you suspect you’re seeing an old version of an article (cached locally by your browser or by an upstream proxy), a hard refresh in the browser usually clears it. If a problem persists, email us with the URL and the date you noticed.',
  },
];

export default function CachePolicyPage() {
  return (
    <LegalPage
      icon={RefreshCw}
      title="Cache Policy"
      lead={`How long ${SITE_NAME} caches each kind of content, and what to expect when something changes.`}
      effectiveDate="May 5, 2026"
      sections={sections}
    />
  );
}

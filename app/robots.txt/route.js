import { SITE_URL } from '@/lib/seo';

// robots.txt as a route handler (not Next's robots.js) so we can emit
// directives Next's builder doesn't support — most importantly Yandex's
// `Clean-param` and a comprehensive per-engine bot allowlist.

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 86400;

const PRIVATE_PATHS = [
  '/admin/',
  '/api/',
  '/staff-login',
  '/set-password',
  '/login',
  '/signup',
  '/profile',
];

// Every legitimate search-engine crawler we want indexing the site, by
// vendor. Listing each variant explicitly gives the engine a direct
// match — anything we forget still hits the wildcard rule below.
const SEARCH_BOTS = [
  // Google
  'Googlebot',
  'Googlebot-Image',
  'Googlebot-News',
  'Googlebot-Video',
  'Googlebot-Mobile',
  'AdsBot-Google',
  'AdsBot-Google-Mobile',
  'Storebot-Google',
  'Mediapartners-Google',
  'APIs-Google',
  // Bing / Microsoft
  'Bingbot',
  'BingPreview',
  'MicrosoftPreview',
  'AdIdxBot',
  'MSNBot',
  'MSNBot-Media',
  // Yandex (verified via reverse DNS to *.yandex.ru/.net/.com)
  'YandexBot',
  'YandexImages',
  'YandexMobileBot',
  'YandexVideo',
  'YandexNews',
  'YandexMedia',
  'YandexFavicons',
  'YandexAccessibilityBot',
  'YandexCalendar',
  'YandexMetrika',
  'YandexDirect',
  'YandexMarket',
  'YandexBlogs',
  'YandexWebmaster',
  // DuckDuckGo
  'DuckDuckBot',
  'DuckDuckBot-Https',
  'DuckAssistBot',
  // Yahoo
  'Slurp',
  // Apple
  'Applebot',
  // Baidu (Chinese market)
  'Baiduspider',
  'Baiduspider-image',
  'Baiduspider-video',
  'Baiduspider-news',
  // Naver / Daum (Korean)
  'Yeti',
  'NaverBot',
  'Daum',
  // Seznam (Czech)
  'SeznamBot',
  // Mojeek (independent)
  'MojeekBot',
  // Brave Search
  'Bravebot',
  // Kagi
  'KagiBot',
  // Qwant
  'Qwantify',
  // Ecosia (uses Bing but ships its own bot too)
  'EcosiaBot',
];

// Social previews — not search bots, but they need access so shared
// links render the OG card. We explicitly allow them because some
// hardened robots configs forget these and lose social discovery.
const SOCIAL_BOTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'Pinterestbot',
  'WhatsApp',
  'TelegramBot',
  'Slackbot',
  'Discordbot',
  'Embedly',
  'redditbot',
];

// AI scrapers / LLM training crawlers — fully disallowed. We do not
// want our long-form wildlife articles harvested into model training
// data without consent. Adding new entrants is cheap; missing one is
// harmless because the wildcard rule above still indexes us.
const AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'CCBot',
  'anthropic-ai',
  'ClaudeBot',
  'Claude-Web',
  'Google-Extended',
  'PerplexityBot',
  'Perplexity-User',
  'Omgilibot',
  'Omgili',
  'FacebookBot',
  'Meta-ExternalAgent',
  'Bytespider',
  'cohere-ai',
  'Diffbot',
  'ImagesiftBot',
  'Applebot-Extended',
  'YouBot',
  'AwarioRssBot',
  'AwarioSmartBot',
  'PiplBot',
  'DataForSeoBot',
  'SemrushBot',
  'AhrefsBot',
  'MJ12bot',
];

function blockForUserAgent(ua) {
  return [
    `User-agent: ${ua}`,
    'Allow: /',
    ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`),
    '',
  ].join('\n');
}

function disallowAllForUserAgent(ua) {
  return `User-agent: ${ua}\nDisallow: /\n\n`;
}

function buildRobotsTxt() {
  const host = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const header = `# Wildlife.Universe robots.txt — last reviewed in code (lib/robots logic).
# Search engines: allowed everywhere except the private admin / auth paths.
# AI training crawlers: blocked. Social previews: allowed.
# Crawler verification — confirm by reverse DNS, not user-agent string alone.

`;

  const search = SEARCH_BOTS.map(blockForUserAgent).join('');
  const social = SOCIAL_BOTS.map(blockForUserAgent).join('');
  const wildcard = blockForUserAgent('*');
  const ai = AI_BOTS.map(disallowAllForUserAgent).join('');

  // Yandex-specific extension. `Clean-param` tells Yandex to treat
  // tracking-parameter variants as canonical to the bare URL — cuts
  // duplicate-URL waste from social/ad campaigns, frees crawl budget.
  // Syntax: `Clean-param: p1&p2&p3 /optional-path-prefix/`.
  const yandexExtras = `# Yandex-only directives — ignored by other engines
User-agent: Yandex
Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content&utm_id&utm_name /
Clean-param: ref&fbclid&gclid&yclid&msclkid&mc_cid&mc_eid /
Clean-param: page /posts/
Clean-param: source&campaign /

`;

  // Sitemap directives. List each individually so engines that don't
  // follow the sitemap index still find the per-vertical sitemaps.
  const sitemaps = [
    `${SITE_URL}/sitemap.xml`,
    `${SITE_URL}/posts-sitemap.xml`,
    `${SITE_URL}/category-sitemap.xml`,
    `${SITE_URL}/image-sitemap.xml`,
    `${SITE_URL}/video-sitemap.xml`,
    `${SITE_URL}/news-sitemap.xml`,
    `${SITE_URL}/authoritative-sitemap.xml`,
  ].map((u) => `Sitemap: ${u}`).join('\n');

  // Host directive — Yandex deprecated it in 2018 and replaced it
  // with 301 + rel=canonical, but Bing and a handful of others still
  // honour it as a canonical-host hint. Hostname only, no scheme.
  const hostLine = `\n\nHost: ${host}\n`;

  return header + search + social + wildcard + yandexExtras + ai + sitemaps + hostLine;
}

export function GET() {
  const body = buildRobotsTxt();
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Robots.txt is hit very frequently — cache aggressively at the
      // edge while still revalidating once a day for changes.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}

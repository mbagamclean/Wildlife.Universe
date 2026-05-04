import { SITE_URL } from '@/lib/seo';

const PRIVATE_PATHS = ['/admin/', '/api/', '/staff-login', '/set-password', '/login', '/signup', '/profile'];

// AI scrapers / LLM training crawlers — fully disallowed.
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
  'Omgilibot',
  'Omgili',
  'FacebookBot',
  'Meta-ExternalAgent',
  'Bytespider',
  'cohere-ai',
  'Diffbot',
  'ImagesiftBot',
];

export default function robots() {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      ...AI_BOTS.map((ua) => ({
        userAgent: ua,
        disallow: '/',
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

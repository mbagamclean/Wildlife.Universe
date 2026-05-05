/**
 * Single source of truth for static + legal pages on Wildlife Universe.
 *
 * Anything listed here will:
 *   - appear in the public sitemap UI at /sitemap
 *   - appear in /authoritative-sitemap.xml for search engines
 *   - be eligible for IndexNow auto-submission when added/changed
 *
 * To add a new legal page or static page, add one entry below and create
 * the matching `app/<path>/page.jsx` file. The sitemap will pick it up
 * automatically — no other changes needed.
 */

export const STATIC_PAGES = [
  // ── Top-level public pages ──────────────────────────────────────
  {
    path: '/',
    label: 'Home',
    group: 'main',
    description: 'Wildlife Universe homepage',
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    path: '/posts',
    label: 'All Posts',
    group: 'main',
    description: 'Every published article',
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    path: '/search',
    label: 'Search',
    group: 'main',
    description: 'Search the wildlife archive',
    changeFrequency: 'monthly',
    priority: 0.4,
  },
  {
    path: '/subscribe',
    label: 'Subscribe',
    group: 'main',
    description: 'Newsletter signup',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/rss',
    label: 'RSS Feed',
    group: 'main',
    description: 'Subscribe via RSS',
    changeFrequency: 'monthly',
    priority: 0.4,
  },

  // ── Auth ────────────────────────────────────────────────────────
  {
    path: '/login',
    label: 'Sign In',
    group: 'auth',
    description: 'Account login',
    changeFrequency: 'yearly',
    priority: 0.3,
    noindex: true,
  },
  {
    path: '/signup',
    label: 'Sign Up',
    group: 'auth',
    description: 'Create an account',
    changeFrequency: 'yearly',
    priority: 0.3,
    noindex: true,
  },

  // ── Legal / Editorial ───────────────────────────────────────────
  {
    path: '/legal/privacy',
    label: 'Privacy Policy',
    group: 'legal',
    description: 'How we handle your data',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    path: '/legal/terms',
    label: 'Terms of Service',
    group: 'legal',
    description: 'Conditions of using Wildlife Universe',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    path: '/legal/cookies',
    label: 'Cookie Policy',
    group: 'legal',
    description: 'Cookies and tracking we use',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    path: '/legal/eeat',
    label: 'Editorial Policy',
    group: 'legal',
    description: 'Our editorial standards',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    path: '/legal/fact-checking',
    label: 'Fact Checking Policy',
    group: 'legal',
    description: 'How we verify what we publish',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    path: '/legal/cache',
    label: 'Cache Policy',
    group: 'legal',
    description: 'How we cache and refresh content',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    path: '/legal/team',
    label: 'Wildlife Universe Team',
    group: 'legal',
    description: 'Editors, writers, and contributors',
    changeFrequency: 'monthly',
    priority: 0.5,
  },

  // ── Marketing ──────────────────────────────────────────────────
  {
    path: '/about',
    label: 'About Us',
    group: 'company',
    description: 'Who we are and why we publish',
    changeFrequency: 'monthly',
    priority: 0.6,
  },
  {
    path: '/contact',
    label: 'Contact',
    group: 'company',
    description: 'Get in touch with our team',
    changeFrequency: 'yearly',
    priority: 0.5,
  },
  {
    path: '/advertise',
    label: 'Advertise With Us',
    group: 'company',
    description: 'Sponsorship and partnership',
    changeFrequency: 'yearly',
    priority: 0.5,
  },
];

export function staticPagesByGroup() {
  const map = { main: [], auth: [], legal: [], company: [] };
  for (const p of STATIC_PAGES) {
    if (!map[p.group]) map[p.group] = [];
    map[p.group].push(p);
  }
  return map;
}

/** Pages search engines should crawl — excludes noindex/auth pages. */
export function indexableStaticPages() {
  return STATIC_PAGES.filter((p) => !p.noindex);
}

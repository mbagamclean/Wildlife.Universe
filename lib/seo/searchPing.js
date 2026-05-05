/**
 * Search-engine ping utility.
 *
 * Auto-submits new/updated URLs to:
 *   1. IndexNow (Bing, Yandex, Naver, Seznam) — fastest, single API call
 *   2. Google Indexing API — only if GOOGLE_INDEXING_SERVICE_ACCOUNT_KEY is set
 *
 * Note: Google retired its public sitemap-ping endpoint in June 2023 — there
 * is no general-purpose "tell Google about this URL" ping for articles.
 * IndexNow + Google Search Console (sitemap-based crawling) is the modern path.
 *
 * Result: each call returns a `pingResults` array describing what happened
 * for each engine. Errors are caught — pinging never throws, never blocks
 * the calling request. Best-effort logging into `indexing_events` table if
 * present (table is optional; missing table is silently tolerated).
 */

import { SITE_URL } from '@/lib/seo';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';
const GOOGLE_KEY_JSON = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_KEY || '';

const INDEXNOW_HOST = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

function asArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function absolutize(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${SITE_URL}${path}`;
}

// ── IndexNow ──────────────────────────────────────────────────────
async function pingIndexNow(urls) {
  if (!INDEXNOW_KEY) {
    return { engine: 'indexnow', ok: false, error: 'INDEXNOW_KEY not set' };
  }
  if (!urls.length) return { engine: 'indexnow', ok: false, error: 'no urls' };

  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
      signal: AbortSignal.timeout(8000),
    });
    return {
      engine: 'indexnow',
      ok: res.ok || res.status === 202,
      status: res.status,
      submitted: urls.length,
    };
  } catch (err) {
    return { engine: 'indexnow', ok: false, error: err.message || String(err) };
  }
}

// ── Google Indexing API (optional) ────────────────────────────────
//
// Officially Google's Indexing API is for JobPosting / BroadcastEvent. It
// still works for general URLs but with no guarantees. We only call it if
// the service-account key is configured.
let _googleAccessToken = { token: null, exp: 0 };

async function getGoogleAccessToken() {
  if (!GOOGLE_KEY_JSON) return null;
  if (_googleAccessToken.token && Date.now() < _googleAccessToken.exp) {
    return _googleAccessToken.token;
  }
  let credentials;
  try {
    credentials = JSON.parse(GOOGLE_KEY_JSON);
  } catch {
    return null;
  }
  if (!credentials?.client_email || !credentials?.private_key) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3500,
    }),
  ).toString('base64url');

  let signature;
  try {
    const { createSign } = await import('node:crypto');
    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    signer.end();
    signature = signer.sign(credentials.private_key).toString('base64url');
  } catch {
    return null;
  }

  const jwt = `${header}.${payload}.${signature}`;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    if (!json.access_token) return null;
    _googleAccessToken = {
      token: json.access_token,
      exp: Date.now() + (json.expires_in - 60) * 1000,
    };
    return json.access_token;
  } catch {
    return null;
  }
}

async function pingGoogleIndexingApi(urls, type = 'URL_UPDATED') {
  const token = await getGoogleAccessToken();
  if (!token) {
    return { engine: 'google_indexing_api', ok: false, error: 'service account not configured' };
  }
  const results = await Promise.allSettled(
    urls.map((url) =>
      fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url, type }),
        signal: AbortSignal.timeout(8000),
      }).then((r) => ({ ok: r.ok, status: r.status, url })),
    ),
  );
  const ok = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
  return {
    engine: 'google_indexing_api',
    ok: ok === urls.length,
    submitted: urls.length,
    succeeded: ok,
  };
}

// ── Logging (optional indexing_events table) ──────────────────────
async function logEvent(supabase, { url, slug, eventType, results }) {
  if (!supabase) return;
  try {
    await supabase.from('indexing_events').insert({
      post_url: url,
      post_slug: slug || null,
      event_type: eventType,
      ping_results: results,
    });
  } catch {
    // table missing or insert failed — non-fatal
  }
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Submit a URL (or array of URLs) to all configured search engines.
 *
 * @param {string|string[]} urlOrUrls Absolute URL(s) or paths.
 * @param {object} opts
 * @param {string} [opts.eventType='publish_ping'] Event type for logging.
 * @param {string} [opts.slug] Optional slug for log.
 * @param {object} [opts.supabase] Optional Supabase client for logging.
 * @returns {Promise<{urls: string[], results: object[]}>}
 */
export async function notifySearchEngines(urlOrUrls, opts = {}) {
  const urls = asArray(urlOrUrls).map(absolutize).filter(Boolean);
  if (!urls.length) return { urls: [], results: [] };

  const [indexNow, google] = await Promise.all([
    pingIndexNow(urls),
    pingGoogleIndexingApi(urls),
  ]);
  const results = [indexNow, google];

  if (opts.supabase) {
    await Promise.all(
      urls.map((u) =>
        logEvent(opts.supabase, {
          url: u,
          slug: opts.slug,
          eventType: opts.eventType || 'publish_ping',
          results,
        }),
      ),
    );
  }

  return { urls, results };
}

/**
 * Fire-and-forget version. Use from request handlers when you don't want
 * to block the response on the ping. Errors are swallowed.
 */
export function notifySearchEnginesAsync(urlOrUrls, opts = {}) {
  // Don't await; let it run in the background.
  notifySearchEngines(urlOrUrls, opts).catch(() => {});
}

/**
 * Search-engine ping utility.
 *
 * Auto-submits new/updated URLs to:
 *   1. IndexNow (Bing, Yandex, Naver, Seznam) — fastest, single API call
 *   2. Google Indexing API — if a CEO has connected Google via OAuth
 *      (see /api/auth/google-indexing/start)
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
import { getGoogleAccessToken } from '@/lib/seo/google-token-store';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';

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
//
// Spec reference: https://www.indexnow.org/documentation
//   - Endpoint:  POST https://api.indexnow.org/IndexNow
//   - Body:      { host, key, keyLocation, urlList }
//   - Limit:     up to 10,000 URLs per request
//   - Status:    200 OK · 202 Accepted (key pending) · 400 Bad Request ·
//                403 Forbidden (key file unreachable / key mismatch) ·
//                422 Unprocessable (URL not on host / bad schema) ·
//                429 Too Many Requests (treated as spam)
//
// IMPORTANT: urlList must contain only URLs whose host matches the `host`
// field — otherwise IndexNow rejects the whole batch with 422. We filter
// out cross-origin URLs (e.g. Supabase-hosted media) before submitting.

const INDEXNOW_STATUS_MEANINGS = {
  200: 'OK',
  202: 'accepted (key validation pending)',
  400: 'bad request — invalid JSON or missing field',
  403: 'forbidden — key file unreachable or key mismatch',
  422: "unprocessable — URL doesn't match host or key schema invalid",
  429: 'rate limited — slow down or back off',
};

function urlMatchesHost(url, host) {
  try {
    return new URL(url).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

async function pingIndexNow(urls) {
  if (!INDEXNOW_KEY) {
    return { engine: 'indexnow', ok: false, error: 'INDEXNOW_KEY not set' };
  }

  // Filter to same-host URLs only. IndexNow rejects the entire batch (422)
  // if any URL doesn't belong to the declared host.
  const eligible = urls.filter((u) => urlMatchesHost(u, INDEXNOW_HOST));
  const skipped = urls.length - eligible.length;

  if (!eligible.length) {
    return {
      engine: 'indexnow',
      ok: false,
      error: `no eligible urls for host ${INDEXNOW_HOST}`,
      skipped,
    };
  }

  // Stay under the 10,000-per-batch limit. Any caller already chunks at
  // 1,000 but be safe.
  const batch = eligible.slice(0, 10000);

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: batch,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const ok = res.status === 200 || res.status === 202;
    return {
      engine: 'indexnow',
      ok,
      status: res.status,
      meaning: INDEXNOW_STATUS_MEANINGS[res.status] || 'unknown',
      submitted: batch.length,
      skipped,
    };
  } catch (err) {
    return { engine: 'indexnow', ok: false, error: err.message || String(err) };
  }
}

// ── Google Indexing API ───────────────────────────────────────────
//
// Officially Google's Indexing API is for JobPosting / BroadcastEvent. It
// still works for general URLs but with no guarantees. Only fires if a
// site admin has connected Google via OAuth (refresh token stored in
// the seo_credentials table).
async function pingGoogleIndexingApi(urls, type = 'URL_UPDATED') {
  const token = await getGoogleAccessToken();
  if (!token) {
    return { engine: 'google_indexing_api', ok: false, error: 'google not connected' };
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

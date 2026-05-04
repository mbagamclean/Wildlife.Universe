import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

function noStore(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

/**
 * Best-effort Google indexing check. Hits a `site:` SERP and looks for the
 * URL in the HTML response. Google heavily rate-limits this — DO NOT batch.
 * For real production indexing data, use Google Search Console's URL
 * Inspection API (requires OAuth setup, out of scope here).
 */
export async function GET(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStore({ success: false, error: 'Unauthorized' }, 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return noStore({ success: false, error: 'Forbidden' }, 403);
  }

  const url = new URL(req.url).searchParams.get('url');
  if (!url) {
    return noStore({ success: false, error: 'Missing required ?url parameter' }, 400);
  }

  const checkedAt = new Date().toISOString();

  // Strip protocol for the site: query — Google matches both http/https
  const bareUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const serpUrl = `https://www.google.com/search?q=${encodeURIComponent('site:' + bareUrl)}&num=10`;

  try {
    const res = await fetch(serpUrl, {
      headers: {
        // Mimic a real browser — Google blocks obvious bots immediately
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // Don't hang forever
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    // 429 / consent / sorry pages = rate-limited
    if (res.status === 429 || res.url.includes('/sorry/') || res.url.includes('consent.google')) {
      return noStore({
        success: true,
        url,
        indexed: null,
        checkedAt,
        source: 'google_serp_naive',
        error: 'rate_limited',
      });
    }

    if (!res.ok) {
      return noStore({
        success: true,
        url,
        indexed: null,
        checkedAt,
        source: 'google_serp_naive',
        error: `http_${res.status}`,
      });
    }

    const html = await res.text();

    // Detect Google's "did not match any documents" copy
    const noResults = /did not match any documents|No results found/i.test(html);

    // Detect captcha / unusual-traffic interstitial returned with 200
    if (/unusual traffic|enable JavaScript|recaptcha/i.test(html) && !/<cite/i.test(html)) {
      return noStore({
        success: true,
        url,
        indexed: null,
        checkedAt,
        source: 'google_serp_naive',
        error: 'rate_limited',
      });
    }

    // Loose match: URL appears anywhere in the SERP HTML
    const lowerHtml = html.toLowerCase();
    const indexed = !noResults && (
      lowerHtml.includes(bareUrl.toLowerCase())
      || lowerHtml.includes(encodeURIComponent(bareUrl).toLowerCase())
    );

    return noStore({
      success: true,
      url,
      indexed,
      checkedAt,
      source: 'google_serp_naive',
    });
  } catch (err) {
    return noStore({
      success: true,
      url,
      indexed: null,
      checkedAt,
      source: 'google_serp_naive',
      error: err.name === 'TimeoutError' ? 'timeout' : 'fetch_failed',
    });
  }
}

/**
 * /api/admin/analytics/dashboard — single-call data backing the
 * Plausible-style admin analytics dashboard. Returns KPI totals,
 * a time-series for the chart, and four leaderboard panels (top
 * pages, sources, locations, devices) for the requested window.
 *
 * Query:  ?range=24h|7d|30d|90d   (default 7d)
 *
 * Schema dependency: post_views table from migration 004 + the
 * pathname column added in migration 018. If 018 hasn't been run
 * the pathname-based queries silently return empty arrays.
 *
 * Auth: staff role only.
 */

import { NextResponse } from 'next/server';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const RANGE_HOURS = { '24h': 24, '7d': 168, '30d': 720, '90d': 2160 };

function rangeWindow(range) {
  const hours = RANGE_HOURS[range] || RANGE_HOURS['7d'];
  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return { start: start.toISOString(), end: now.toISOString(), hours };
}

// ─── UA parser — tiny regex-based heuristic, zero dependency ─────
// Returns { browser, os, device } from a raw user-agent string. Keeps
// the dashboard's Browser / OS / Device panels meaningful without
// pulling in ua-parser-js (~60 KB) for what's a few groupings.
function parseUA(ua) {
  if (!ua || typeof ua !== 'string') return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };
  const s = ua;
  // Order matters — Edge before Chrome, Firefox before generic
  let browser = 'Other';
  if (/Edg\//.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(s)) browser = 'Opera';
  else if (/Firefox\//.test(s)) browser = 'Firefox';
  else if (/SamsungBrowser/.test(s)) browser = 'Samsung Internet';
  else if (/Chrome\/.+Safari/.test(s)) browser = 'Chrome';
  else if (/Safari\//.test(s) && !/Chrome/.test(s)) browser = 'Safari';
  else if (/Bot|crawl|spider/i.test(s)) browser = 'Bot';

  let os = 'Other';
  if (/Windows NT/.test(s)) os = 'Windows';
  else if (/iPhone|iPad|iPod/.test(s)) os = 'iOS';
  else if (/Android/.test(s)) os = 'Android';
  else if (/Mac OS X|Macintosh/.test(s)) os = 'macOS';
  else if (/Linux/.test(s)) os = 'Linux';
  else if (/CrOS/.test(s)) os = 'Chrome OS';

  let device = 'Desktop';
  if (/Mobi|iPhone|Android.+Mobile/.test(s)) device = 'Mobile';
  else if (/iPad|Tablet/.test(s)) device = 'Tablet';

  return { browser, os, device };
}

// ─── Referrer parser — drop scheme/path, normalise common search
// engines, mark direct/internal hits explicitly.
function parseReferrer(ref, ownHost) {
  if (!ref) return 'Direct';
  try {
    const u = new URL(ref);
    const host = u.host.toLowerCase().replace(/^www\./, '');
    if (host === ownHost) return null; // internal — skip
    if (host.includes('google.')) return 'Google';
    if (host.includes('bing.')) return 'Bing';
    if (host.includes('duckduckgo.')) return 'DuckDuckGo';
    if (host.includes('yahoo.')) return 'Yahoo';
    if (host.includes('yandex.')) return 'Yandex';
    if (host.includes('t.co')) return 'Twitter / X';
    if (host.includes('facebook.') || host === 'fb.me') return 'Facebook';
    if (host.includes('instagram.')) return 'Instagram';
    if (host.includes('linkedin.') || host === 'lnkd.in') return 'LinkedIn';
    if (host.includes('reddit.')) return 'Reddit';
    if (host.includes('youtube.') || host === 'youtu.be') return 'YouTube';
    if (host.includes('news.ycombinator')) return 'Hacker News';
    if (host.includes('chatgpt.com') || host.includes('openai.com')) return 'ChatGPT';
    if (host.includes('perplexity.')) return 'Perplexity';
    return host;
  } catch {
    return 'Direct';
  }
}

// ─── ISO 3166-1 alpha-2 → display name (just the codes we'll see often).
// Anything not in the table renders by its raw code.
const COUNTRY_NAMES = {
  US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France',
  CA: 'Canada', AU: 'Australia', NZ: 'New Zealand', JP: 'Japan',
  IN: 'India', BR: 'Brazil', IT: 'Italy', ES: 'Spain', NL: 'Netherlands',
  SE: 'Sweden', NO: 'Norway', FI: 'Finland', DK: 'Denmark',
  ZA: 'South Africa', KE: 'Kenya', NG: 'Nigeria', EG: 'Egypt',
  CN: 'China', HK: 'Hong Kong', SG: 'Singapore', MX: 'Mexico',
  AR: 'Argentina', RU: 'Russia', PL: 'Poland', TR: 'Türkiye',
  ID: 'Indonesia', PH: 'Philippines', VN: 'Vietnam', TH: 'Thailand',
  AE: 'United Arab Emirates', SA: 'Saudi Arabia', IL: 'Israel',
  IE: 'Ireland', CH: 'Switzerland', AT: 'Austria', BE: 'Belgium',
  PT: 'Portugal', GR: 'Greece', CZ: 'Czechia', RO: 'Romania',
  TZ: 'Tanzania', UG: 'Uganda', RW: 'Rwanda', ET: 'Ethiopia',
  GH: 'Ghana', SN: 'Senegal', MA: 'Morocco', DZ: 'Algeria',
};

function countryName(code) {
  if (!code) return 'Unknown';
  return COUNTRY_NAMES[code.toUpperCase()] || code.toUpperCase();
}

// Top-N aggregator from an array of values.
function topN(values, n = 8) {
  const counts = new Map();
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

function bucketKey(date, hours) {
  // Hourly buckets for 24h, daily for everything longer.
  const d = new Date(date);
  if (hours <= 24) {
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  }
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function fillTimeseries(rows, start, end, hours) {
  const counts = new Map();
  const visitors = new Map();
  const sessionsPerBucket = new Map();

  for (const r of rows) {
    const k = bucketKey(r.viewed_at, hours);
    counts.set(k, (counts.get(k) || 0) + 1);
    if (r.session_id) {
      if (!sessionsPerBucket.has(k)) sessionsPerBucket.set(k, new Set());
      sessionsPerBucket.get(k).add(r.session_id);
    }
  }
  for (const [k, set] of sessionsPerBucket) visitors.set(k, set.size);

  // Build a continuous series so the chart never has gaps.
  const series = [];
  const cursor = new Date(start);
  const last = new Date(end);
  const stepMs = hours <= 24 ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  while (cursor.getTime() <= last.getTime()) {
    const k = bucketKey(cursor.toISOString(), hours);
    series.push({
      bucket: k,
      pageviews: counts.get(k) || 0,
      visitors: visitors.get(k) || 0,
    });
    cursor.setTime(cursor.getTime() + stepMs);
  }
  return series;
}

export async function GET(req) {
  const ssr = await createSSRClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await ssr.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const range = url.searchParams.get('range') || '7d';
  const { start, end, hours } = rangeWindow(range);
  const sb = adminClient();

  let ownHost = 'wildlifeuniverse.org';
  try { ownHost = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wildlifeuniverse.org').host.replace(/^www\./, ''); } catch {}

  // Single full pull for the window — at typical traffic volumes
  // (<100k rows / 90 d) this is far cheaper than 6 grouped queries.
  let rows = [];
  try {
    const { data, error } = await sb
      .from('post_views')
      .select('viewed_at, pathname, post_slug, session_id, user_agent, referrer, country')
      .gte('viewed_at', start)
      .lte('viewed_at', end)
      .order('viewed_at', { ascending: true })
      .limit(50000);
    if (error) throw error;
    rows = data || [];
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: 'analytics-table-missing',
      detail: 'Run supabase/migrations/018_analytics_universal.sql then retry.',
      message: String(err?.message || err).slice(0, 300),
    }, { status: 500 });
  }

  // ── Live count: distinct sessions seen in the last 5 minutes.
  const liveCutoff = Date.now() - 5 * 60 * 1000;
  const liveSessions = new Set();
  for (const r of rows) {
    if (new Date(r.viewed_at).getTime() >= liveCutoff && r.session_id) {
      liveSessions.add(r.session_id);
    }
  }
  // If the window doesn't cover the last 5 minutes (e.g. user picked
  // 90d ending now — it does), this still works.

  // ── KPIs
  const pageviews = rows.length;
  const sessions = new Set(rows.filter((r) => r.session_id).map((r) => r.session_id));
  const uniqueVisitors = sessions.size;
  const viewsPerVisit = uniqueVisitors > 0 ? (pageviews / uniqueVisitors) : 0;

  // ── Time-series
  const timeseries = fillTimeseries(rows, start, end, hours);

  // ── Top pages (prefer pathname; fall back to /posts/<slug>)
  const topPages = topN(
    rows.map((r) => r.pathname || (r.post_slug ? `/posts/${r.post_slug}` : null)),
    10,
  );

  // ── Top sources
  const topSources = topN(
    rows.map((r) => parseReferrer(r.referrer, ownHost)),
    8,
  );

  // ── Top countries (with display names)
  const countryCodes = topN(rows.map((r) => r.country), 10);
  const topLocations = countryCodes.map((row) => ({
    name: countryName(row.name),
    code: row.name,
    count: row.count,
  }));

  // ── Devices / Browsers / OS (parsed from UA)
  const parsed = rows.map((r) => parseUA(r.user_agent));
  const topBrowsers = topN(parsed.map((p) => p.browser), 8);
  const topOS = topN(parsed.map((p) => p.os), 8);
  const topDevices = topN(parsed.map((p) => p.device), 4);

  return NextResponse.json({
    ok: true,
    range,
    window: { start, end, hours },
    totals: {
      pageviews,
      uniqueVisitors,
      viewsPerVisit: Number(viewsPerVisit.toFixed(2)),
    },
    live: liveSessions.size,
    timeseries,
    topPages,
    topSources,
    topLocations,
    topBrowsers,
    topOS,
    topDevices,
  });
}

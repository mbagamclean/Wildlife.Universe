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

// Resolve any Plausible-style preset (or a custom range) into a
// concrete [start, end] window plus a granularity for time-series
// bucketing. Server uses UTC consistently — timezone-aware
// "today" / "yesterday" is a future refinement.
function rangeWindow(rangeName, customStart, customEnd) {
  const now = new Date();
  const utc = (year, monthIdx, day, hour = 0, min = 0, sec = 0) =>
    new Date(Date.UTC(year, monthIdx, day, hour, min, sec));

  const startOfTodayUtc = utc(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let start, end;

  switch (rangeName) {
    case 'realtime':
      start = new Date(now.getTime() - 30 * 60 * 1000); end = now; break;
    case '24h':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000); end = now; break;
    case 'today':
      start = startOfTodayUtc; end = now; break;
    case 'yesterday':
      end = startOfTodayUtc; start = new Date(end.getTime() - 24 * 60 * 60 * 1000); break;
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); end = now; break;
    case '28d':
      start = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000); end = now; break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); end = now; break;
    case '90d':
    case '91d':
      start = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000); end = now; break;
    case 'mtd':
      start = utc(now.getUTCFullYear(), now.getUTCMonth(), 1); end = now; break;
    case 'last_month': {
      const firstOfThis = utc(now.getUTCFullYear(), now.getUTCMonth(), 1);
      end = firstOfThis;
      start = utc(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
      break;
    }
    case 'ytd':
      start = utc(now.getUTCFullYear(), 0, 1); end = now; break;
    case '12mo':
      start = utc(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()); end = now; break;
    case 'all':
      start = utc(2020, 0, 1); end = now; break;
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = customEnd ? new Date(customEnd) : now;
      break;
    default:
      // Default: last 7 days
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); end = now;
  }

  const diffMs = end.getTime() - start.getTime();
  const hours = diffMs / (60 * 60 * 1000);
  let granularity;
  if (hours <= 2) granularity = 'minute';        // Realtime
  else if (hours <= 48) granularity = 'hour';    // Today, Yesterday, Last 24h
  else if (hours <= 92 * 24) granularity = 'day'; // up to ~91 days
  else if (hours <= 366 * 24) granularity = 'week';
  else granularity = 'month';

  return { start: start.toISOString(), end: end.toISOString(), hours, granularity };
}

// Previous-period window — same DURATION immediately before the
// current start. Used for the KPI deltas.
function previousWindow(curr) {
  const start = new Date(curr.start);
  const end = new Date(curr.end);
  const dur = end.getTime() - start.getTime();
  const prevEnd = start;
  const prevStart = new Date(start.getTime() - dur);
  return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
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

// Classify a parsed referrer into a high-level channel — the same
// buckets Plausible uses (Direct, Organic Search, Social, Referral).
const SEARCH_ENGINES = new Set(['Google', 'Bing', 'DuckDuckGo', 'Yahoo', 'Yandex', 'Baidu', 'Ecosia', 'Brave Search']);
const SOCIAL_HOSTS = new Set(['Twitter / X', 'Facebook', 'Instagram', 'LinkedIn', 'Reddit', 'YouTube', 'Hacker News', 'Threads', 'Bluesky', 'Mastodon', 'TikTok', 'Pinterest']);
const AI_HOSTS = new Set(['ChatGPT', 'Perplexity', 'Claude', 'Gemini']);

function channelFor(source) {
  if (!source || source === 'Direct') return 'Direct';
  if (SEARCH_ENGINES.has(source)) return 'Organic Search';
  if (SOCIAL_HOSTS.has(source)) return 'Social';
  if (AI_HOSTS.has(source)) return 'AI / LLM';
  return 'Referral';
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

function bucketKey(date, granularity) {
  const d = new Date(date);
  if (granularity === 'minute') {
    d.setUTCSeconds(0, 0);
    return d.toISOString();
  }
  if (granularity === 'hour') {
    d.setUTCMinutes(0, 0, 0);
    return d.toISOString();
  }
  if (granularity === 'week') {
    // Bucket by ISO week start (Monday)
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - day + 1);
    return d.toISOString().slice(0, 10);
  }
  if (granularity === 'month') {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  // day
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function stepMs(granularity) {
  switch (granularity) {
    case 'minute': return 60 * 1000;
    case 'hour': return 60 * 60 * 1000;
    case 'week': return 7 * 24 * 60 * 60 * 1000;
    case 'month': return 30 * 24 * 60 * 60 * 1000; // approximate — buckets snap on the 1st anyway
    default: return 24 * 60 * 60 * 1000;
  }
}

function fillTimeseries(rows, start, end, granularity) {
  const counts = new Map();
  const sessionsPerBucket = new Map();

  for (const r of rows) {
    const k = bucketKey(r.viewed_at, granularity);
    counts.set(k, (counts.get(k) || 0) + 1);
    if (r.session_id) {
      if (!sessionsPerBucket.has(k)) sessionsPerBucket.set(k, new Set());
      sessionsPerBucket.get(k).add(r.session_id);
    }
  }
  const visitors = new Map();
  for (const [k, set] of sessionsPerBucket) visitors.set(k, set.size);

  // Continuous series so the chart never has gaps.
  const series = [];
  const cursor = new Date(start);
  const last = new Date(end);
  const step = stepMs(granularity);
  // Cap iterations as a safety belt — 4000 covers ~11 years of daily.
  let guard = 4000;
  while (cursor.getTime() <= last.getTime() && guard-- > 0) {
    const k = bucketKey(cursor.toISOString(), granularity);
    series.push({
      bucket: k,
      pageviews: counts.get(k) || 0,
      visitors: visitors.get(k) || 0,
    });
    cursor.setTime(cursor.getTime() + step);
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
  const customStart = url.searchParams.get('start');
  const customEnd = url.searchParams.get('end');
  const window = rangeWindow(range, customStart, customEnd);
  const { start, end, hours, granularity } = window;
  const prevW = previousWindow(window);
  const sb = adminClient();

  let ownHost = 'wildlifeuniverse.org';
  try { ownHost = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wildlifeuniverse.org').host.replace(/^www\./, ''); } catch {}

  // Pull both periods in parallel — current for all panels, previous
  // only for the KPI comparison deltas (no need to render its full
  // breakdown server-side).
  const fields = 'viewed_at, pathname, post_slug, session_id, user_agent, referrer, country';
  let rows = [];
  let prevRows = [];
  try {
    const [curr, before] = await Promise.all([
      sb.from('post_views').select(fields)
        .gte('viewed_at', start).lte('viewed_at', end)
        .order('viewed_at', { ascending: true })
        .limit(50000),
      sb.from('post_views').select('session_id, viewed_at')
        .gte('viewed_at', prevW.start).lte('viewed_at', prevW.end)
        .limit(50000),
    ]);
    if (curr.error) throw curr.error;
    rows = curr.data || [];
    prevRows = before.error ? [] : (before.data || []);
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

  // ── Session-level aggregation (one pass) — drives Visits, Bounce
  //    rate, and Visit duration. A "visit" is a session_id; sessions
  //    with a single pageview are bounces; duration is last-first
  //    timestamp within the session. Bounces count as 0 duration.
  function aggregateSessions(allRows) {
    const sess = new Map();
    for (const r of allRows) {
      if (!r.session_id) continue;
      const t = new Date(r.viewed_at).getTime();
      const s = sess.get(r.session_id);
      if (!s) sess.set(r.session_id, { first: t, last: t, count: 1 });
      else { s.last = Math.max(s.last, t); s.first = Math.min(s.first, t); s.count++; }
    }
    let visits = 0, bounces = 0, totalDurMs = 0;
    for (const s of sess.values()) {
      visits++;
      if (s.count === 1) bounces++;
      totalDurMs += Math.max(0, s.last - s.first);
    }
    return {
      visits,
      bounceRate: visits > 0 ? (bounces / visits) * 100 : 0,
      avgVisitDurationSec: visits > 0 ? totalDurMs / visits / 1000 : 0,
      uniqueVisitors: sess.size,
    };
  }

  const curr = aggregateSessions(rows);
  const prev = aggregateSessions(prevRows);

  // ── KPIs
  const pageviews = rows.length;
  const uniqueVisitors = curr.uniqueVisitors;
  const totalVisits = curr.visits;
  const viewsPerVisit = totalVisits > 0 ? (pageviews / totalVisits) : 0;
  const bounceRate = curr.bounceRate;
  const visitDurationSec = curr.avgVisitDurationSec;

  const prevPageviews = prevRows.length;
  const prevUniqueVisitors = prev.uniqueVisitors;
  const prevTotalVisits = prev.visits;
  const prevViewsPerVisit = prevTotalVisits > 0 ? (prevPageviews / prevTotalVisits) : 0;

  const pctDelta = (a, b) => {
    if (b === 0) return a > 0 ? 100 : 0;
    return Number((((a - b) / b) * 100).toFixed(1));
  };

  const deltas = {
    pageviews: pctDelta(pageviews, prevPageviews),
    uniqueVisitors: pctDelta(uniqueVisitors, prevUniqueVisitors),
    totalVisits: pctDelta(totalVisits, prevTotalVisits),
    viewsPerVisit: pctDelta(viewsPerVisit, prevViewsPerVisit),
    // Bounce rate: lower-is-better — invert so green ▼ shows for a
    // drop in bounce rate. Display layer interprets sign.
    bounceRate: pctDelta(bounceRate, prev.bounceRate),
    visitDuration: pctDelta(visitDurationSec, prev.avgVisitDurationSec),
  };

  // ── Time-series
  const timeseries = fillTimeseries(rows, start, end, granularity);

  // ── Top pages (prefer pathname; fall back to /posts/<slug>)
  const pageOf = (r) => r.pathname || (r.post_slug ? `/posts/${r.post_slug}` : null);
  const topPages = topN(rows.map(pageOf), 10);

  // ── Entry / Exit pages — group rows by session, sort by time,
  // first event = entry, last event = exit. Skip sessions with one
  // event so we're not double-counting bounces into both buckets.
  const bySession = new Map();
  for (const r of rows) {
    if (!r.session_id) continue;
    const p = pageOf(r);
    if (!p) continue;
    if (!bySession.has(r.session_id)) bySession.set(r.session_id, []);
    bySession.get(r.session_id).push({ p, t: new Date(r.viewed_at).getTime() });
  }
  const entries = [];
  const exits = [];
  for (const events of bySession.values()) {
    events.sort((a, b) => a.t - b.t);
    entries.push(events[0].p);
    if (events.length > 1) exits.push(events[events.length - 1].p);
  }
  const entryPages = topN(entries, 10);
  const exitPages = topN(exits, 10);

  // ── Top sources (parsed) + Channels (rolled-up bucket)
  const sources = rows.map((r) => parseReferrer(r.referrer, ownHost));
  const topSources = topN(sources, 10);
  const topChannels = topN(sources.map(channelFor), 6);

  // ── Top countries (with display names)
  const countryCodes = topN(rows.map((r) => r.country), 12);
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

  // ── Currently-viewing list — distinct pages with traffic in the
  // last 5 minutes, ranked by visitor count.
  const liveByPage = new Map();
  for (const r of rows) {
    if (new Date(r.viewed_at).getTime() < liveCutoff) continue;
    const p = pageOf(r);
    if (!p) continue;
    if (!liveByPage.has(p)) liveByPage.set(p, new Set());
    if (r.session_id) liveByPage.get(p).add(r.session_id);
  }
  const currentPages = [...liveByPage.entries()]
    .map(([p, set]) => ({ name: p, count: set.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json({
    ok: true,
    range,
    window: { start, end, hours, granularity },
    totals: {
      pageviews,
      uniqueVisitors,
      totalVisits,
      viewsPerVisit: Number(viewsPerVisit.toFixed(2)),
      bounceRate: Number(bounceRate.toFixed(1)),
      visitDurationSec: Number(visitDurationSec.toFixed(0)),
    },
    deltas,
    live: liveSessions.size,
    timeseries,
    topPages,
    entryPages,
    exitPages,
    topSources,
    topChannels,
    topLocations,
    topBrowsers,
    topOS,
    topDevices,
    currentPages,
  });
}

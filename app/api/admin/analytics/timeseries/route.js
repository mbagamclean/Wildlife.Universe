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

function dayKey(d) {
  // YYYY-MM-DD in UTC for stable bucketing
  return new Date(d).toISOString().slice(0, 10);
}

// True per-day traffic comes from the `post_views` event table (migration
// 004_seo_extensions.sql). When present, daily view counts reflect real
// page-view events. When missing, falls back to attributing each post's
// cumulative `views` integer to its creation date.
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

  const url = new URL(req.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10), 1), 365);

  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const sinceISO = new Date(sinceMs).toISOString();

  // Fetch posts created in the window
  const { data: windowPosts, error: windowErr } = await supabase
    .from('posts')
    .select('id, title, category, status, views, created_at')
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true });

  if (windowErr) return noStore({ success: false, error: windowErr.message }, 500);

  // For previous-period comparison, fetch posts in the prior window
  const prevSinceMs = sinceMs - days * 24 * 60 * 60 * 1000;
  const { data: prevPosts } = await supabase
    .from('posts')
    .select('id, views, created_at')
    .gte('created_at', new Date(prevSinceMs).toISOString())
    .lt('created_at', sinceISO);

  // Build daily buckets for the requested window
  const buckets = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(sinceMs + i * 24 * 60 * 60 * 1000);
    buckets.set(dayKey(d), { date: dayKey(d), postsCreated: 0, viewsAttributed: 0 });
  }

  // Posts-created bucket fill (always works)
  for (const p of windowPosts || []) {
    const k = dayKey(p.created_at);
    const b = buckets.get(k);
    if (b) b.postsCreated += 1;
  }

  // Try the real event-level post_views table first
  let usingEventTable = false;
  let eventViewsTotal = 0;
  let prevEventViewsTotal = 0;
  try {
    const { data: events, error: evErr } = await supabase
      .from('post_views')
      .select('viewed_at')
      .gte('viewed_at', sinceISO);

    if (!evErr) {
      usingEventTable = true;
      for (const ev of events || []) {
        const k = dayKey(ev.viewed_at);
        const b = buckets.get(k);
        if (b) {
          b.viewsAttributed += 1;
          eventViewsTotal += 1;
        }
      }
      // Previous-period event count for trend %
      const { count: prevCount } = await supabase
        .from('post_views')
        .select('*', { count: 'exact', head: true })
        .gte('viewed_at', new Date(prevSinceMs).toISOString())
        .lt('viewed_at', sinceISO);
      prevEventViewsTotal = prevCount || 0;
    }
  } catch {
    // post_views table missing — fall back below
  }

  // Fallback: attribute cumulative posts.views to creation date
  if (!usingEventTable) {
    for (const p of windowPosts || []) {
      const k = dayKey(p.created_at);
      const b = buckets.get(k);
      if (b) b.viewsAttributed += p.views || 0;
    }
  }

  // Best day: highest viewsAttributed
  let bestDay = null;
  for (const b of buckets.values()) {
    if (!bestDay || b.viewsAttributed > bestDay.viewsAttributed) {
      bestDay = { date: b.date, viewsAttributed: b.viewsAttributed };
    }
  }

  const series = Array.from(buckets.values());

  const currentViews = usingEventTable
    ? eventViewsTotal
    : (windowPosts || []).reduce((s, p) => s + (p.views || 0), 0);
  const prevViews = usingEventTable
    ? prevEventViewsTotal
    : (prevPosts || []).reduce((s, p) => s + (p.views || 0), 0);
  const trendPct = prevViews > 0
    ? Math.round(((currentViews - prevViews) / prevViews) * 1000) / 10
    : (currentViews > 0 ? 100 : 0);

  const avgPostsPerDay = days > 0
    ? Math.round(((windowPosts || []).length / days) * 100) / 100
    : 0;

  return noStore({
    success: true,
    data: {
      days,
      series,
      stats: {
        avgPostsPerDay,
        bestDay,
        trendPct,
        totalPostsInWindow: (windowPosts || []).length,
        totalViewsInWindow: currentViews,
      },
      source: usingEventTable ? 'post_views_events' : 'posts_views_cumulative',
      note: usingEventTable
        ? 'Real per-day page views from the post_views event table.'
        : 'Views are attributed to post creation date (cumulative integer). Run migration 004_seo_extensions.sql to enable real per-day traffic.',
    },
  });
}

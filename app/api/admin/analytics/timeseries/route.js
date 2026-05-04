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

// TODO: True per-day traffic requires an event-level `post_views` table
// (e.g. (id, post_id, viewed_at, ip_hash)). Until that exists, the
// "views per day" series is computed from each post's cumulative `views`
// integer attributed to the post's creation date — useful as a proxy
// for "how much traffic has each cohort accumulated", not real daily traffic.
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

  let bestDay = null;
  for (const p of windowPosts || []) {
    const k = dayKey(p.created_at);
    const b = buckets.get(k);
    if (!b) continue;
    b.postsCreated += 1;
    b.viewsAttributed += p.views || 0;
    if (!bestDay || b.viewsAttributed > bestDay.viewsAttributed) {
      bestDay = { ...b };
    }
  }

  const series = Array.from(buckets.values());

  const currentViews = (windowPosts || []).reduce((s, p) => s + (p.views || 0), 0);
  const prevViews = (prevPosts || []).reduce((s, p) => s + (p.views || 0), 0);
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
        bestDay: bestDay ? { date: bestDay.date, viewsAttributed: bestDay.viewsAttributed } : null,
        trendPct,
        totalPostsInWindow: (windowPosts || []).length,
        totalViewsInWindow: currentViews,
      },
      note: 'Views are attributed to post creation date (cumulative integer). True per-day traffic requires an event-level post_views table.',
    },
  });
}

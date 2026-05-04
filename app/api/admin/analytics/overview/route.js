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

export async function GET() {
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

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, slug, title, category, status, views, created_at')
    .order('created_at', { ascending: false });

  if (error) return noStore({ success: false, error: error.message }, 500);

  const all = posts || [];
  const published = all.filter((p) => p.status !== 'draft');
  const drafts = all.filter((p) => p.status === 'draft');
  const totalViews = all.reduce((sum, p) => sum + (p.views || 0), 0);

  // Posts created this week (last 7 days)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const postsThisWeek = all.filter((p) => new Date(p.created_at).getTime() >= weekAgo).length;

  // By-category breakdown (count + views)
  const categoryMap = new Map();
  for (const p of all) {
    const key = p.category || 'Uncategorized';
    const existing = categoryMap.get(key) || { category: key, count: 0, views: 0 };
    existing.count += 1;
    existing.views += p.views || 0;
    categoryMap.set(key, existing);
  }
  const byCategory = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);
  const categoriesActive = byCategory.length;

  // Top 10 posts by views
  const topPosts = [...all]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      category: p.category,
      status: p.status,
      views: p.views || 0,
      createdAt: p.created_at,
    }));

  return noStore({
    success: true,
    data: {
      totals: {
        totalPosts: all.length,
        published: published.length,
        drafts: drafts.length,
        totalViews,
        categoriesActive,
        postsThisWeek,
      },
      topPosts,
      byCategory,
    },
  });
}

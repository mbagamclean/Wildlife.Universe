import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getReader() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(req) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '8', 10), 1), 15);

  if (q.length < 2) {
    return NextResponse.json(
      { success: true, suggestions: [] },
      { headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' } }
    );
  }

  const safe = q.replace(/[%_]/g, '\\$&');

  const supabase = getReader();
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, category, views, created_at')
    .neq('status', 'draft')
    .ilike('title', `%${safe}%`)
    .order('views', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      success: true,
      suggestions: (data || []).map(({ id, slug, title, category }) => ({
        id, slug, title, category,
      })),
    },
    { headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' } }
  );
}

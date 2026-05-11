/**
 * /api/admin/reviews
 *
 *   GET → returns every review regardless of status, newest first.
 *         Used by the admin moderation page.
 *
 * Auth: same staff-role gate as the other /api/admin/* routes.
 */

import { NextResponse } from 'next/server';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function checkStaff() {
  const ssr = await createSSRClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return { ok: false, status: 401, body: { error: 'Unauthorized' } };
  const { data: profile } = await ssr.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return { ok: false, status: 403, body: { error: 'Forbidden' } };
  }
  return { ok: true };
}

export async function GET() {
  const auth = await checkStaff();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const sb = serviceClient();
  const { data, error } = await sb
    .from('site_reviews')
    .select('id, user_name, user_avatar, rating, comment, is_verified, status, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, reviews: data || [] });
}

/**
 * /api/admin/reviews/[id]
 *
 *   PATCH  → update status: { status: 'approved' | 'pending' | 'rejected' | 'spam' }
 *            optionally toggle is_verified: { is_verified: bool }
 *   DELETE → permanently remove
 *
 * Auth: same staff-role gate as the other /api/admin/* routes.
 */

import { NextResponse } from 'next/server';
import { createClient as createSSRClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'editor', 'writer', 'moderator', 'admin']);
const VALID_STATUS = new Set(['approved', 'pending', 'rejected', 'spam']);

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

export async function PATCH(req, { params }) {
  const auth = await checkStaff();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid-body' }, { status: 400 });

  const patch = {};
  if (body.status !== undefined) {
    if (!VALID_STATUS.has(body.status)) {
      return NextResponse.json({ error: 'invalid-status' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.is_verified !== undefined) patch.is_verified = !!body.is_verified;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no-changes' }, { status: 400 });
  }

  const sb = serviceClient();
  const { error } = await sb.from('site_reviews').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const auth = await checkStaff();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const { id } = await params;
  const sb = serviceClient();
  const { error } = await sb.from('site_reviews').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * POST /api/auth/google-indexing/disconnect
 *
 * Removes the stored Google refresh token. CEO/admin only.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteGoogleRefreshToken } from '@/lib/seo/google-token-store';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'admin']);

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const ok = await deleteGoogleRefreshToken();
  return NextResponse.json({ success: ok });
}

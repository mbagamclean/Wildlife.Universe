/**
 * GET /api/auth/google-indexing/status
 *
 * Returns whether the Google Indexing API is connected, and which
 * Google account granted consent. Staff-only.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleConnectionStatus } from '@/lib/seo/google-token-store';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'admin', 'editor', 'writer', 'moderator']);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false, error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ connected: false, error: 'Forbidden' }, { status: 403 });
  }

  const status = await getGoogleConnectionStatus();
  return NextResponse.json({ ...status, success: true });
}

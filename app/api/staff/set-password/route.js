import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const STAFF_ROLES = ['ceo', 'editor', 'writer', 'moderator', 'admin'];

export async function POST(request) {
  const { password } = await request.json();
  if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, password_reset_required')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }
  if (!STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  if (!profile.password_reset_required) {
    return NextResponse.json({ error: 'Password reset not required' }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Clear the flag first so it can't be replayed
  const { error: dbErr } = await admin
    .from('profiles')
    .update({ password_reset_required: false })
    .eq('id', user.id);

  if (dbErr) {
    return NextResponse.json({ error: `DB update failed: ${dbErr.message}` }, { status: 500 });
  }

  // Change password via Admin API — zero browser auth lock involvement
  const { error: pwErr } = await admin.auth.admin.updateUserById(user.id, { password });

  if (pwErr) {
    // Roll back the flag so the user can retry
    await admin.from('profiles').update({ password_reset_required: true }).eq('id', user.id);
    return NextResponse.json({ error: pwErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

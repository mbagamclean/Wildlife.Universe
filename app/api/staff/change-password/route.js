import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const STAFF_ROLES = ['ceo', 'editor', 'writer', 'moderator', 'admin'];

export async function POST(request) {
  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  // 1. Identify the caller from their session cookie
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
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  // 2. Verify they have a staff role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  // 3. Verify the current password by attempting a sign-in (non-persisting client)
  const verifier = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: signInErr } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInErr) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  // 4. Change the password via Admin API — no browser auth lock involved
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: pwErr } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (pwErr) {
    return NextResponse.json({ error: pwErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'ceo') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, email, role, password } = await req.json();
  if (!email || !role) return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });

  const admin = getAdminClient();
  const { data: newUser, error } = await admin.auth.admin.createUser({
    email,
    password: password || 'changeme123',
    email_confirm: true,
    user_metadata: { role },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from('profiles').upsert({ id: newUser.user.id, email, name: name || email, role });

  const { data: created } = await admin.from('profiles').select('*').eq('id', newUser.user.id).single();
  const { first_name, last_name, avatar_id, created_at, ...rest } = created || {};

  return NextResponse.json({
    success: true,
    user: { ...rest, firstName: first_name, lastName: last_name, avatarId: avatar_id, createdAt: created_at },
  });
}

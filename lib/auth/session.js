import { createClient } from '@/lib/supabase/client';

function mapProfile(row) {
  if (!row) return null;
  const { first_name, last_name, avatar_id, created_at, password_reset_required, ...rest } = row;
  return {
    ...rest,
    firstName: first_name,
    lastName: last_name,
    avatarId: avatar_id,
    createdAt: created_at,
    passwordResetRequired: password_reset_required ?? false,
  };
}

async function fetchProfile(supabaseUser) {
  if (!supabaseUser) return null;
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', supabaseUser.id).maybeSingle();
  if (error) throw new Error(`Profile load failed: ${error.message}`);
  return mapProfile(data);
}

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return fetchProfile(user);
}

export async function signIn(email, password) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return fetchProfile(data.user);
}

export async function signInWithOAuth(provider, { next = '/profile' } = {}) {
  if (typeof window === 'undefined') {
    throw new Error('OAuth sign-in must be called from the browser.');
  }
  const supabase = createClient();
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
  // signInWithOAuth triggers a full-page redirect to the provider; the
  // browser navigates away before this resolves, so callers won't see a
  // user object back. The /auth/callback route handles the return trip.
  if (data?.url) window.location.assign(data.url);
  return null;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function signUp({ firstName, lastName, email, password, country, avatarId }) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: 'reader' } },
  });
  if (error) throw new Error(error.message);

  // Upsert profile with extra fields the trigger doesn't set
  await supabase.from('profiles').upsert({
    id: data.user.id,
    email,
    name: `${firstName} ${lastName}`.trim(),
    first_name: firstName,
    last_name: lastName,
    country,
    avatar_id: avatarId || 'lion',
    role: 'reader',
  });

  return fetchProfile(data.user);
}

export async function updateProfile(id, patch) {
  const supabase = createClient();
  const { firstName, lastName, avatarId, password, ...rest } = patch;

  if (password !== undefined) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  }

  const dbPatch = { ...rest };
  if (firstName !== undefined) dbPatch.first_name = firstName;
  if (lastName  !== undefined) dbPatch.last_name  = lastName;
  if (avatarId  !== undefined) dbPatch.avatar_id  = avatarId;

  if (Object.keys(dbPatch).length > 0) {
    await supabase.from('profiles').update(dbPatch).eq('id', id);
  }

  const { data } = await supabase.auth.getUser();
  return fetchProfile(data.user);
}

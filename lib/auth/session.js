import { createClient } from '@/lib/supabase/client';

function mapProfile(row) {
  if (!row) return null;
  const { first_name, last_name, avatar_id, created_at, ...rest } = row;
  return { ...rest, firstName: first_name, lastName: last_name, avatarId: avatar_id, createdAt: created_at };
}

async function fetchProfile(supabaseUser) {
  if (!supabaseUser) return null;
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', supabaseUser.id).maybeSingle();
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

export async function signInWithOAuth(provider) {
  // OAuth requires configuring providers in the Supabase dashboard.
  throw new Error(`${provider} login is not configured yet.`);
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

import { db } from '@/lib/storage/db';
import { KEYS } from '@/lib/storage/keys';

const isBrowser = () => typeof window !== 'undefined';

function readSession() {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (!isBrowser()) return;
  if (session) {
    window.localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(KEYS.SESSION);
  }
  window.dispatchEvent(new CustomEvent('wu:auth-changed'));
  window.dispatchEvent(new CustomEvent('wu:storage-changed'));
}

export async function getCurrentUser() {
  const session = readSession();
  if (!session) return null;
  const user = await db.users.getByEmail(session.email);
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

export async function signInWithOAuth(provider) {
  const email = `${provider.toLowerCase()}@oauth.example.com`;
  let user = await db.users.getByEmail(email);
  
  if (!user) {
    user = await db.users.create({
      firstName: provider,
      lastName: 'User',
      email,
      password: `oauth_auto_${Date.now()}`,
      country: 'US',
      avatarId: 'panda',
      role: 'reader',
    });
  }
  
  writeSession({ email: user.email, signedInAt: new Date().toISOString(), provider });
  const { password: _p, ...safe } = user;
  return safe;
}

export async function signIn(email, password) {
  const user = await db.users.getByEmail(email);
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password.');
  }
  writeSession({ email: user.email, signedInAt: new Date().toISOString() });
  const { password: _p, ...safe } = user;
  return safe;
}

export async function signOut() {
  writeSession(null);
}

export async function signUp({
  firstName,
  lastName,
  email,
  password,
  country,
  avatarId,
}) {
  const created = await db.users.create({
    firstName,
    lastName,
    email,
    password,
    country,
    avatarId,
    role: 'reader',
  });
  writeSession({ email: created.email, signedInAt: new Date().toISOString() });
  return created;
}

export async function updateProfile(id, patch) {
  return db.users.update(id, patch);
}

/**
 * GET /api/auth/google-indexing/start
 *
 * Kicks off the Google OAuth consent dance for the Google Indexing API.
 * Staff-only. After the user grants consent, Google redirects them to
 * /api/auth/google-indexing/callback with ?code= and ?state=. The state
 * carries (a) a CSRF nonce stored in a cookie and (b) the URL the user
 * came from, so we can return them to the right page.
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'admin']);

// Single restricted scope — the only one the Indexing API needs.
// We deliberately omit openid/email so the OAuth consent screen only has
// to declare this one scope and we avoid OIDC-mixing policy friction.
const SCOPES = ['https://www.googleapis.com/auth/indexing'];

const REDIRECT_URI =
  process.env.GOOGLE_OAUTH_REDIRECT_URI ||
  `${SITE_URL}/api/auth/google-indexing/callback`;

export async function GET(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${SITE_URL}/staff-login?next=/admin/configuration/indexing-monitor`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ error: 'Forbidden — CEO/admin only' }, { status: 403 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_OAUTH_CLIENT_ID not configured' }, { status: 500 });
  }

  // CSRF nonce + return path baked into state.
  const nonce = randomBytes(16).toString('hex');
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/admin/configuration/indexing-monitor';
  const state = Buffer.from(JSON.stringify({ n: nonce, r: next })).toString('base64url');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set('wu_google_oauth_nonce', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 600, // 10 minutes
  });
  return res;
}

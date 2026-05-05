/**
 * GET /api/auth/google-indexing/callback
 *
 * Receives Google's redirect after consent. Validates the CSRF nonce
 * round-tripped via the state param, exchanges the auth code for a
 * refresh token, persists it to seo_credentials, then redirects the
 * user back to the page they came from (encoded inside state).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/seo';
import { saveGoogleRefreshToken } from '@/lib/seo/google-token-store';

export const runtime = 'nodejs';

const STAFF_ROLES = new Set(['ceo', 'admin']);

const REDIRECT_URI =
  process.env.GOOGLE_OAUTH_REDIRECT_URI ||
  `${SITE_URL}/api/auth/google-indexing/callback`;

function parseState(state) {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function failRedirect(reason, fallback = '/admin/configuration/indexing-monitor') {
  return NextResponse.redirect(
    `${SITE_URL}${fallback}?google_indexing=error&reason=${encodeURIComponent(reason)}`,
  );
}

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) return failRedirect(oauthError);
  if (!code || !stateRaw) return failRedirect('missing_code_or_state');

  const state = parseState(stateRaw);
  if (!state?.n) return failRedirect('bad_state');

  const cookieNonce = req.cookies.get('wu_google_oauth_nonce')?.value;
  if (!cookieNonce || cookieNonce !== state.n) {
    return failRedirect('csrf_mismatch');
  }

  const next = typeof state.r === 'string' && state.r.startsWith('/') ? state.r : '/admin/configuration/indexing-monitor';

  // Auth must still be valid — same staff member who started the flow.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return failRedirect('unauthenticated', next);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !STAFF_ROLES.has(profile.role)) return failRedirect('forbidden', next);

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return failRedirect('oauth_not_configured', next);

  // Exchange code → refresh + access tokens.
  let token;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
      signal: AbortSignal.timeout(8000),
    });
    token = await res.json();
  } catch {
    return failRedirect('token_exchange_failed', next);
  }

  if (!token?.refresh_token) {
    // Google only returns a refresh token on the first consent or with
    // prompt=consent. /start always sets prompt=consent so this shouldn't
    // happen — but be defensive.
    return failRedirect('no_refresh_token', next);
  }

  // Best-effort fetch of the granting user's email for display.
  let grantedEmail = null;
  if (token.access_token) {
    try {
      const ures = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(5000),
      });
      const u = await ures.json();
      grantedEmail = u?.email || null;
    } catch {
      // ignore
    }
  }

  const saved = await saveGoogleRefreshToken({
    refreshToken: token.refresh_token,
    scopes: token.scope || null,
    grantedBy: user.id,
    grantedEmail,
  });
  if (!saved) return failRedirect('save_failed', next);

  const okRes = NextResponse.redirect(
    `${SITE_URL}${next}?google_indexing=connected${grantedEmail ? `&as=${encodeURIComponent(grantedEmail)}` : ''}`,
  );
  okRes.cookies.delete('wu_google_oauth_nonce');
  return okRes;
}

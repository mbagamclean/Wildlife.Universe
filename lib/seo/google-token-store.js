/**
 * Storage + access-token minting for Google Indexing API.
 *
 * The site CEO grants consent once via /api/auth/google-indexing/start;
 * we store the resulting refresh token in `seo_credentials` and use it
 * to mint short-lived access tokens whenever searchPing.js fires.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const PROVIDER = 'google_indexing';

let _serviceClient = null;
function serviceClient() {
  if (_serviceClient) return _serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _serviceClient = createSupabaseClient(url, key, { auth: { persistSession: false } });
  return _serviceClient;
}

export async function saveGoogleRefreshToken({ refreshToken, scopes, grantedBy, grantedEmail }) {
  const sb = serviceClient();
  if (!sb) return false;
  const { error } = await sb
    .from('seo_credentials')
    .upsert(
      {
        provider: PROVIDER,
        refresh_token: refreshToken,
        scopes: scopes || null,
        granted_by: grantedBy || null,
        granted_email: grantedEmail || null,
      },
      { onConflict: 'provider' },
    );
  if (error) {
    console.warn('[google-token-store] save failed:', error.message);
    return false;
  }
  return true;
}

export async function getGoogleRefreshToken() {
  const sb = serviceClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from('seo_credentials')
    .select('refresh_token, granted_email, granted_at')
    .eq('provider', PROVIDER)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function getGoogleConnectionStatus() {
  const row = await getGoogleRefreshToken();
  if (!row) return { connected: false };
  return {
    connected: true,
    grantedEmail: row.granted_email,
    grantedAt: row.granted_at,
  };
}

export async function deleteGoogleRefreshToken() {
  const sb = serviceClient();
  if (!sb) return false;
  const { error } = await sb.from('seo_credentials').delete().eq('provider', PROVIDER);
  return !error;
}

// ── Access token cache (per-process) ──────────────────────────────
let _cachedAccessToken = { token: null, exp: 0 };

/**
 * Returns a fresh OAuth access token for the Google Indexing API.
 * Returns null if Google isn't connected or the refresh fails.
 */
export async function getGoogleAccessToken() {
  if (_cachedAccessToken.token && Date.now() < _cachedAccessToken.exp) {
    return _cachedAccessToken.token;
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const row = await getGoogleRefreshToken();
  if (!row?.refresh_token) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: row.refresh_token,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    if (!json.access_token) return null;
    _cachedAccessToken = {
      token: json.access_token,
      exp: Date.now() + (json.expires_in - 60) * 1000,
    };
    return json.access_token;
  } catch {
    return null;
  }
}

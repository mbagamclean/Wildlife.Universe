/**
 * Durable Blogger OAuth — exchanges a long-lived refresh token for a
 * short-lived access token on demand. No manual re-tokening ever again.
 *
 * The refresh token is obtained ONCE via get-refresh-token.mjs and stored in
 * .env. Access tokens last ~1 hour; this helper mints a fresh one per run.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export function bloggerAuthFromEnv() {
  return {
    clientId: process.env.BLOGGER_CLIENT_ID,
    clientSecret: process.env.BLOGGER_CLIENT_SECRET,
    refreshToken: process.env.BLOGGER_REFRESH_TOKEN,
  };
}

/**
 * Mint a fresh access token from the durable refresh token.
 * @returns {Promise<string>} a valid Bearer access token
 */
export async function getAccessToken({ clientId, clientSecret, refreshToken } = bloggerAuthFromEnv()) {
  const missing = [];
  if (!clientId) missing.push('BLOGGER_CLIENT_ID');
  if (!clientSecret) missing.push('BLOGGER_CLIENT_SECRET');
  if (!refreshToken) missing.push('BLOGGER_REFRESH_TOKEN');
  if (missing.length) {
    throw new Error(
      `Missing OAuth config: ${missing.join(', ')}.\n` +
        'Fill .env (client id/secret from Google Cloud Console), then run:\n' +
        '  node --env-file=.env get-refresh-token.mjs'
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      `Token refresh failed (HTTP ${r.status}): ${JSON.stringify(j)}\n` +
        'If "invalid_grant", the refresh token was revoked/expired — re-run get-refresh-token.mjs.'
    );
  }
  return j.access_token;
}

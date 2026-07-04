/**
 * One-time durable-OAuth setup for Blogger.
 *
 * Run ONCE after putting BLOGGER_CLIENT_ID + BLOGGER_CLIENT_SECRET in .env:
 *   node --env-file=.env get-refresh-token.mjs
 *
 * It opens a Google sign-in in your browser, catches the redirect on
 * localhost, exchanges the code for a REFRESH TOKEN, and writes it back into
 * .env as BLOGGER_REFRESH_TOKEN. After that, publishing never needs a manual
 * token again — getAccessToken() refreshes automatically.
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '.env');

const CLIENT_ID = process.env.BLOGGER_CLIENT_ID;
const CLIENT_SECRET = process.env.BLOGGER_CLIENT_SECRET;
const SCOPE = 'https://www.googleapis.com/auth/blogger';
const PORT = Number(process.env.OAUTH_PORT) || 38080; // loopback redirect port (53682 is inside a Windows reserved range)
const REDIRECT_URI = `http://localhost:${PORT}/`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    '\n[ERROR] BLOGGER_CLIENT_ID and BLOGGER_CLIENT_SECRET must be set in .env first.\n' +
      'Create a "Desktop app" OAuth client in Google Cloud Console →\n' +
      'APIs & Services → Credentials → Create credentials → OAuth client ID.\n'
  );
  process.exit(1);
}

function openBrowser(url) {
  const cmd =
    process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '""', url] : [url];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    /* fall back to manual */
  }
}

function upsertEnv(key, value) {
  let txt = '';
  try {
    txt = readFileSync(ENV_PATH, 'utf8');
  } catch {
    /* file may not exist */
  }
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  txt = re.test(txt) ? txt.replace(re, line) : txt.replace(/\n*$/, '\n') + line + '\n';
  writeFileSync(ENV_PATH, txt);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline', // <-- required to receive a refresh token
    prompt: 'consent', // <-- force a refresh token even on re-auth
  }).toString();

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, REDIRECT_URI);
  const code = u.searchParams.get('code');
  const err = u.searchParams.get('error');

  if (err) {
    res.end(`Authorization failed: ${err}. You can close this tab.`);
    console.error(`\n[ERROR] Authorization denied: ${err}`);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.end('Waiting for authorization...');
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tok = await tokenRes.json();
    if (!tokenRes.ok || !tok.refresh_token) {
      throw new Error(
        `No refresh token returned (HTTP ${tokenRes.status}): ${JSON.stringify(tok)}\n` +
          'Make sure access_type=offline and that you approved the consent screen.'
      );
    }

    upsertEnv('BLOGGER_REFRESH_TOKEN', tok.refresh_token);

    res.end('Success! Refresh token saved to .env. You can close this tab and return to the terminal.');
    console.log('\n[OK] Durable refresh token obtained and written to .env.');
    console.log('     BLOGGER_REFRESH_TOKEN is now set. Publishing is ready.');
    server.close();
    process.exit(0);
  } catch (e) {
    res.end('Token exchange failed. Check the terminal.');
    console.error(`\n[ERROR] ${e.message}`);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log('\n========================================');
  console.log('  Blogger durable-OAuth setup');
  console.log('========================================');
  console.log('\nA browser window will open for Google sign-in.');
  console.log('If it does not, open this URL manually:\n');
  console.log(authUrl + '\n');
  openBrowser(authUrl);
  console.log('Waiting for you to approve access in the browser...');
});

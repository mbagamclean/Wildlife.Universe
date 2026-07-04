/**
 * Lists all Blogger blogs owned by the authorized Google account, so you can
 * copy the right BLOGGER_BLOG_ID into .env.
 *
 * Usage (after get-refresh-token.mjs):
 *   node --env-file=.env list-blogs.mjs
 */

import { getAccessToken } from './lib/blogger-auth.mjs';

const token = await getAccessToken();
const r = await fetch('https://www.googleapis.com/blogger/v3/users/self/blogs', {
  headers: { Authorization: `Bearer ${token}` },
});
if (!r.ok) {
  console.error(`Failed (HTTP ${r.status}): ${await r.text()}`);
  process.exit(1);
}
const j = await r.json();
for (const b of j.items || []) {
  console.log(`${b.id}  ${b.url}  "${b.name}"  posts=${b.posts?.totalItems ?? '?'}`);
}
if (!(j.items || []).length) console.log('No blogs on this account — create one at blogger.com first.');

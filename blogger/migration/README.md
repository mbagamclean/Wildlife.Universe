# Wildlife Universe → Blogger post migration

Moves all **663 published posts** from the Wildlife Universe Supabase into the Blogger blog, preserving exact titles (the theme's shared comments/reactions match by title), original publish dates, and taxonomy labels. Resumable and duplicate-safe — re-running never creates duplicates.

## One-time setup (≈5 minutes)

The API key alone is **read-only** (Google's rule — publishing needs OAuth):

1. **Create the blog** (if not done): [blogger.com](https://www.blogger.com) → New blog → pick any address (e.g. `wildlifeuniverse1.blogspot.com` — the real domain gets attached later). Copy the **blog ID** from the dashboard URL (`blogger.com/blog/posts/<BLOG_ID>`) into `.env` → `BLOGGER_BLOG_ID`.
2. **Create an OAuth Desktop client**: [console.cloud.google.com](https://console.cloud.google.com) → same project as the API key → *APIs & Services → Credentials → Create credentials → OAuth client ID → Application type: Desktop app*. Paste the client ID + secret into `.env` (`BLOGGER_CLIENT_ID`, `BLOGGER_CLIENT_SECRET`). Make sure the **Blogger API v3** is enabled for the project (*APIs & Services → Library → Blogger API*). If the consent screen asks, set it to *External* and add your own Google account as a test user.
3. **Authorize once**: `node --env-file=.env get-refresh-token.mjs` — a browser opens, sign in with the Google account that owns the blog, approve. The refresh token is saved to `.env` automatically; you never do this again.

## Run

```bash
cd "D:\MY WEBSITE PROJECTS\Wildlife.Universe\blogger\migration"
node --env-file=.env migrate-posts.mjs --dry-run   # preview first
node --env-file=.env migrate-posts.mjs             # publish (max 45/run by default)
```

Blogger has an unpublished anti-spam **daily posting limit**. If it trips, the script saves progress and exits — run it again the next day. At ~45 posts/day, 663 posts take ~15 days; try `--limit 100` on day one to discover your blog's actual ceiling (the script stops safely when the limit hits).

Progress lives in `migration-state.json` (gitignored, like `.env`).

## Other tools

- `node --env-file=.env list-blogs.mjs` — lists every blog on your Google account with its ID (easiest way to fill `BLOGGER_BLOG_ID`).
- `node --env-file=.env relabel-posts.mjs --dry-run` — for posts **already on the blog**: matches each to its Supabase row by title and rewrites the Blogger labels to the canonical `[Category, Label]` pair (e.g. `["Birds", "Song"]`). Run without `--dry-run` to apply. Safe to re-run; posts with no Supabase match are left untouched and listed.

## After migration

- Blogger → Settings → **Site feed → Allow Blog Feed = Full** (theme cards need it).
- Spot-check a post: cover image shows in the hero, comments/reactions load (they're shared with the live Supabase — title match).
- Then follow `../README.md` to attach www.wildlifeuniverse.org.

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
- `node --env-file=.env relabel-posts.mjs --dry-run` — for posts **already on the blog**: matches each to its Supabase row by title and rewrites the Blogger labels to the canonical `[Category, Label]` pair (e.g. `["Birds", "Song"]`). Run without `--dry-run` to apply. Safe to re-run; posts with no Supabase match are left untouched and listed. A `manual-labels.json` map handles posts that predate Supabase.
- `node --env-file=.env publish-pages.mjs [--dry-run]` — publishes/replaces all 11 static Pages (About, legal, Sitemap, Popular, etc.) via the Pages API, then rewrites every internal `/p/*.html` link (in page bodies AND `theme/…​.xml`) to the real Blogger URLs, since Blogger freezes page slugs at creation. Idempotent (re-runs patch, never duplicate). Config: `pages-config.json`; output map: `pages-url-map.json`.

## Fix irrelevant post images (`fix-images.mjs`)

Replaces AI-generated covers that don't match the species with **real photos** sourced by scientific name — Wikipedia/Wikimedia Commons → iNaturalist for species; Wikipedia-by-topic → Openverse for concept posts. Writes corrected `cover` (and an attribution credit appended to the body) **directly into Supabase** using `SUPABASE_SERVICE_ROLE_KEY` (read from `../../.env.local`), which repairs the live site AND the migration source at once.

```bash
node fix-images.mjs --dry-run --category insects   # preview one category
node fix-images.mjs                                 # apply to all 663 posts
node fix-images.mjs --category plants               # or one category at a time
```

- Every original cover is saved to `old-covers-backup.json` before overwrite (reversible).
- Resumable via `image-fix-state.json`; posts with no real photo keep their original cover and are listed under `unresolved`.
- Run this **before** `migrate-posts.mjs` so migrated posts carry the corrected covers.

## After migration

- Blogger → Settings → **Site feed → Allow Blog Feed = Full** (theme cards need it).
- Spot-check a post: cover image shows in the hero, comments/reactions load (they're shared with the live Supabase — title match).
- Then follow `../README.md` to attach www.wildlifeuniverse.org.

# Wildlife Universe — Blogger Website Kit (Go-Live Guide)

An exact visual clone of **wildlifeuniverse.org** as a Blogger theme, built to receive the real domain **www.wildlifeuniverse.org**.

## What's in this kit

| Path | What it is |
|---|---|
| `theme/wildlifeuniverse-blogger-theme.xml` | The complete theme (upload as-is) |
| `assets/` | 6 files the theme references: `logo.png`, `favicon.png`, `og-default.jpg`, `hero/canopy.jpg`, `hero/eagle.jpg`, `hero/savanna.jpg` |
| `blogger-pages/` | Ready-to-paste HTML for the 11 static pages + its own README with the file → title → permalink table |
| `preview/` | Local previews + screenshots used to validate the theme (not needed for deployment) |

Features built in: glassmorphism design (emerald `#008000` + gold `#d4af37`), dark mode (`.dark`, key `wu-theme`), fixed glass header + full-screen mobile menu, homepage hero + Latest 12 + Explore Categories + per-category rows, category pages with filter pills (60 posts), live search (`?q=`), post pages with 88vh hero / reading progress / TOC / gold TTS player / **shared Supabase reactions & comments** / related posts, dark 5-column footer, styled 404 with auto-redirect.

---

## 1. Create the blog

1. Go to [blogger.com](https://www.blogger.com) → **New blog**. Title: `Wildlife Universe`. Pick any free `*.blogspot.com` address (e.g. `wildlifeuniverse.blogspot.com`) — the custom domain comes later.

## 2. Upload the theme

1. **Theme → (arrow next to Customize) → Restore → Upload** → choose `theme/wildlifeuniverse-blogger-theme.xml`.
2. Open the blog — you should see the green/gold design immediately (hero images will load from the current live site until you do step 6).

## 3. Required settings

Under **Settings**:

- **Site feed → Allow blog feed = `Full`** — MANDATORY. Post covers live in the post body (external Supabase URLs), so cards, search thumbnails and the homepage rows can only find images when the feed contains the full post content. With a truncated feed every card falls back to the green gradient.
- **Posts → Max posts shown on main page = 12** (the feed engine renders 12 regardless, but this keeps the native fallback consistent).
- **Errors and redirects → Custom 404 = leave EMPTY** (the theme ships its own styled 404 with a 10-second auto-redirect).
- **Comments → Comment location = Hide** (recommended). The theme uses the shared Supabase discussion system, not Blogger comments.
- Optional: **Settings → Meta tags → Enable search description** and add one — it feeds the theme's OG/description tags.

## 4. Create the static pages

Follow `blogger-pages/README.md`. Short version: for each of the 11 files, create **Pages → New page**, use the exact title from the table, switch the editor to **HTML view**, paste the file's full contents, publish, and confirm the permalink matches (`/p/about.html`, `/p/contact.html`, `/p/advertise.html`, `/p/privacy-policy.html`, `/p/terms-of-service.html`, `/p/cookie-policy.html`, `/p/editorial-policy.html`, `/p/fact-checking-policy.html`, `/p/team.html`, `/p/sitemap.html`, `/p/popular.html`). The theme's nav and footer link to these exact URLs.

## 5. Label convention (per post)

Give **every post TWO labels: its Category + one sub-label**:

| Category label | Sub-labels |
|---|---|
| Animals | Mammals, Reptiles, Amphibians, Fish, IUCN Redlist |
| Plants | Trees, Shrubs, Herbs, Vines |
| Birds | Basal, Waterfowl, Coastal, Raptors, Land, Song, IUCN Redlist |
| Insects | Porifera, Cnidaria, Platyhelminthes, Nematoda, Annelida, Mollusca, Arthropoda, Echinodermata, IUCN Redlist |
| Posts | How Questions, Why Questions, Tourism, Conservation, Articles |

Spelling must match exactly (`IUCN Redlist`, `How Questions`, …) — the nav, homepage rows, filter pills and related-posts engine key off these names. Put the **Category label first** where possible; the first label is shown as the post's badge.

Also: make the **first image in each post body** the cover image (that image becomes the hero background and the card thumbnail). When migrating posts from the Next.js site, keep the **exact same title** — that is how a post finds its shared Supabase reactions/comments/views.

## 6. BEFORE switching the domain — re-host the 6 assets

The theme currently loads its logo/favicon/OG/hero images from `https://www.wildlifeuniverse.org/...`. **The moment you attach that domain to Blogger, those URLs will stop serving the files** (the Next.js origin is gone). Do this first:

1. Upload the 6 files from `assets/` to a permanent host. Easiest: open any Blogger **post draft → insert the images → switch to HTML view → copy the `blogger.googleusercontent.com` URLs** (the draft never needs publishing). Any other host/CDN also works — just not wildlifeuniverse.org.
2. Edit the theme (Theme → Edit HTML). Everything lives in the clearly marked block near the top: `===== ASSET URLS =====` (favicon links + the `WU_ASSETS` const) plus the OG fallback image and the logo `<img>` tags. Fastest safe method — **find and replace these exact URLs across the whole file**:

   | Replace this | Occurrences | With |
   |---|---|---|
   | `https://www.wildlifeuniverse.org/favicon.png` | 3 | new favicon URL |
   | `https://www.wildlifeuniverse.org/logo.png` | 4 | new logo URL |
   | `https://www.wildlifeuniverse.org/og-default.jpg` | 4 | new OG image URL |
   | `https://www.wildlifeuniverse.org/hero/canopy.jpg` | 1 | new canopy URL |
   | `https://www.wildlifeuniverse.org/hero/eagle.jpg` | 1 | new eagle URL |
   | `https://www.wildlifeuniverse.org/hero/savanna.jpg` | 1 | new savanna URL |
   | `https://www.wildlifeuniverse.org/staff-login` | 2 | the admin app's new home (see below) |

3. **Staff Login / admin app**: the Next.js CMS cannot live on www.wildlifeuniverse.org anymore. Re-deploy it on another host/subdomain (e.g. `admin.wildlifeuniverse.org` on Vercel) and point the `staff-login` URL (footer pill + `WU_ASSETS.staffLogin`) at it.
4. Post cover images inside migrated posts are on `msnllkjvhxzfoedgecva.supabase.co` storage — those are NOT affected by the domain switch. Same for the comments/reactions database.

## 7. Attach www.wildlifeuniverse.org

1. **Remove the domain from the current host first** (e.g. Vercel project domains) so DNS control is clean.
2. Blogger: **Settings → Publishing → Custom domain** → enter `www.wildlifeuniverse.org` → Save. Blogger shows an error with **two CNAMEs** — note them.
3. At your DNS provider, add:
   - `CNAME  www  →  ghs.google.com`
   - `CNAME  <security-token-name>  →  <security-token-target>` (the unique pair from step 2)
   - For the naked domain `wildlifeuniverse.org`, four A records: `216.239.32.21`, `216.239.34.21`, `216.239.36.21`, `216.239.38.21`
4. Back in Blogger, save the custom domain again (may take a few minutes to hours for DNS). Then enable:
   - **Redirect domain** (naked → www) = ON
   - **HTTPS availability** = ON, then **HTTPS redirect** = ON (certificate provisioning can take up to ~24 h).

## 8. Supabase backend (shared reactions/comments/views)

- The theme talks to `https://msnllkjvhxzfoedgecva.supabase.co` with the public anon key (already embedded; safe by design, RLS-protected).
- **As of 2026-07-04 that project's DNS does not resolve** — a paused/inactive free-tier Supabase project is the usual cause. **Restore/unpause it in the Supabase dashboard before go-live**, otherwise reactions and comments show a graceful "unavailable" note (everything else works).
- Matching rule: Blogger post → Supabase row by **exact title**; comments/reactions are keyed by the returned `slug`. Views are read-only in the theme.

## 9. Smoke-test checklist (after upload, again after domain switch)

- [ ] `https://<blog>/feeds/posts/default?alt=json&max-results=3` returns JSON and each entry's `content` contains full HTML with `<img>` (proves feed = FULL).
- [ ] Homepage: hero image, Latest Posts (12 cards with images/badges), Explore Categories cards, per-category rows.
- [ ] Category page (`/search/label/Animals`): 88vh hero, filter pills, glass card grid, post count.
- [ ] Search icon → type 2+ chars → live suggestions; Enter → `/search?q=...` results page.
- [ ] Open a post: hero shows the first body image; read-time + date chips; TOC highlights on scroll; progress bar; gold TTS plays/pauses/stops.
- [ ] Reactions row loads counts; clicking an emoji persists it (verify a row lands in `post_reactions` for the post's slug).
- [ ] Comments list shows existing (non-flagged) comments from the live database; posting a clean comment appears immediately; a comment containing a URL is held for review (flagged).
- [ ] Dark-mode toggle works in header + mobile menu and persists on reload.
- [ ] Nonsense URL (e.g. `/2020/01/nope.html`) shows the styled 404 and auto-redirects in 10 s.
- [ ] `/p/sitemap.html` lists all posts grouped by category; `/p/popular.html` shows the ranked grid.
- [ ] View page source on a post: `og:image` points at a working image.
- [ ] After the domain switch: logo/favicon/hero images still load (step 6 done), and `https://www.wildlifeuniverse.org/sitemap.xml` serves Blogger's sitemap.

---

*Kit generated 2026-07-04. Theme validated: XML well-formed (.NET XmlDocument), all scripts pass `node --check`, screenshots at 1440/820/390 in light + dark.*

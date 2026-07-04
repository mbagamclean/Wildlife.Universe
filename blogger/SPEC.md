# Wildlife Universe — Blogger XML Theme Clone Spec

Stack: Next.js 15 App Router, JS (JSX), **Tailwind CSS v4** (CSS-first `@theme`, no `tailwind.config.js`), next-themes, Supabase, framer-motion, lucide-react. Live: https://www.wildlifeuniverse.org

Key design signature: **glassmorphism cards + emerald green (`#008000`) primary + gold (`#d4af37`) accent**, off-white light bg / near-black-green dark bg, Inter everywhere, rounded-2xl cards, cinematic hero fades.

---

## 1. GLOBAL

### Fonts (next/font/google — `app/layout.jsx`)
- **Inter** → CSS var `--font-inter`, subset latin, display swap. This is the ONLY font actually used for display + body.
- **Playfair_Display** loaded but NOT mapped in the theme — effectively unused by public UI. For the Blogger clone, load **Inter only** (Google Fonts `<link>`).
- `.font-display` utility = Inter + `letter-spacing: -0.01em`. Applied to all headings.

### Theme tokens (`app/globals.css`, `@theme` block)
```
--color-primary:      #008000   (emerald green — the brand color)
--color-primary-deep: #003d00
--color-primary-soft: #4a9b4a
--color-gold:         #d4af37
--color-gold-soft:    #e6c869
--color-bg:           #f5f5f5   (light page bg)
--color-bg-deep:      #ffffff   (light card bg)
--color-fg:           #111827   (light text)
--color-fg-soft:      #4b5563   (light muted text)
--font-display / --font-body: var(--font-inter), system-ui, sans-serif
--ease-cinematic: cubic-bezier(0.22, 1, 0.36, 1)
```

### Dark mode strategy
- next-themes, `attribute="class"`, default system → `.dark` / `.light` class on `<html>`. CSS overrides target both `[data-theme="dark"]` and `.dark`. Dark palette:
```
--color-bg:      #0a0f0a
--color-bg-deep: #050805
--color-fg:      #f4f7f1
--color-fg-soft: #b8c2b3
```
- `<meta name="theme-color">`: light `#f7f9f5`, dark `#0a0f0a`.

### Glass tokens (`:root`)
```
--glass-bg:     rgba(255,255,255,0.82)   (dark: rgba(10,15,10,0.55))
--glass-border: rgba(0,0,0,0.08)         (dark: rgba(212,175,55,0.18))
--glass-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)
--glass-blur:   20px
```
`.glass` = `background:var(--glass-bg); backdrop-filter:blur(20px) saturate(150%); border:1px solid var(--glass-border); box-shadow:var(--glass-shadow)`.

### Body / base
- `html,body { background:var(--color-bg); color:var(--color-fg); font-family:var(--font-body); -webkit-font-smoothing:antialiased }`, `body{min-height:100vh; overflow-x:hidden}`.
- `::selection { background:#008000; color:#fff }`.
- Custom scrollbar: 10px, thumb `var(--color-primary)` rounded 999px with 2px bg border; hover `--color-primary-deep`.

### Container widths
- **Content sections**: `mx-auto w-[90%] lg:w-[85%] max-w-[1560px]`.
- **Header inner**: `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8` (max-w-7xl = 80rem/1280px).
- **Footer inner**: `width:85%; max-width:1800px; margin:0 auto`.

### Animation utilities
- `wu-fadeUp`, shimmer skeletons, scroll-reveal variants ~0.65–0.9s with `--ease-cinematic`, staggered children delays 0/80/160/240/320/400ms. `prefers-reduced-motion` kills animations.
- Helpers: `.gradient-fade-down`, `.dark-overlay`, `.hero-text-title`, `.hero-on-dark` (white + dark shadow), `.hero-sub-on-dark` (rgba(255,255,255,0.85)).

---

## 2. HEADER / NAV

- **Fixed, full-width, z-50**, glass-on-scroll; `h-16` spacer follows; home/post pages pull content up with `-mt-16` (hero goes under the transparent-ish header).
- Default (top): `bg-[var(--color-bg)] border-b border-[var(--glass-border)]/40 py-3`; scrolled (>80px): `.glass border-b py-2 shadow-lg shadow-black/5`.
- Logo: `/logo.png`, `h-10 sm:h-11 w-auto`, fallback text `Wildlife Universe` bold green.
- Desktop items (breakpoint `md`): **Home · Animals · Plants · Birds · Insects · Posts · IUCN Red List**. Categories 1–5 have hover dropdowns; Home & IUCN Red List don't.
  - Link: `relative flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium`; active → green text + underline pill `absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary`; ChevronDown 3.5 rotates when open.
  - Dropdown: `.glass absolute left-0 top-full mt-2 min-w-[180px] rounded-2xl p-2 shadow-xl`; first row `All {name}` green semibold, divider, then labels `rounded-xl px-3 py-2 text-sm hover:bg-primary/8 hover:text-primary`.
- Right cluster: SearchToggle, ThemeToggle, HamburgerButton (`md:hidden`).
- **Mobile menu**: FULL-SCREEN overlay (`fixed inset-0`, bg var(--color-bg) + faint green/gold radial tint), staggered rows, body scroll lock, morphing hamburger → X, top bar logo + "Close ✕" pill. Category rows have colored icon blobs: Home `#008000`, Animals `#f97316` (paw), Plants `#22c55e` (leaf), Birds `#3b82f6` (feather), Insects `#eab308` (bug), Posts `#008000` (file), Redlist `#dc2020` (shield). Accordions expand into label pills (`rounded-full border px-3.5 py-1.5 text-xs`) tinted by category color. Sticky footer bar with theme toggle.

---

## 3. HOMEPAGE

Order: Hero (full-bleed, `-mt-16`) → Latest Posts grid → Explore Our Categories (5 cards) → per-category rows.

### Hero
Rotating hero: image with `.dark-overlay` + `.gradient-fade-down` bottom fade into page bg; headline/subline/badge/CTA. Static fallback images at `public/hero/{canopy,eagle,savanna}.jpg`. For Blogger: single hero (100svh) with badge pill, title, subtitle, CTA, using an on-brand wildlife photo bg + same fade treatment.

### Section heading style (canonical)
```html
<div class="mb-10 flex items-end justify-between gap-4">
  <div class="flex flex-col gap-1.5">
    <span class="eyebrow">[rss icon] WILDLIFE UNIVERSE</span>  <!-- 11px semibold uppercase tracking .14em green -->
    <h2 class="font-display text-3xl sm:text-4xl font-black leading-none tracking-tight">Latest Posts</h2>
  </div>
  <a class="viewall">View All →</a>  <!-- rounded-full px-4 py-2 text-sm font-semibold green text, 1.5px green border, hover bg green + white text -->
</div>
```
Section wrapper: `py-10 md:py-14`, bg var(--color-bg), inside container `w-[90%] lg:w-[85%] max-w-[1560px]`.

### Grid
`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3`. Pagination = pill style, active `bg-primary text-white`.

### Homepage post card (LatestPostCard)
- `article`: `group relative flex h-full flex-col overflow-hidden rounded-2xl`, bg `var(--color-bg-deep)`, `boxShadow: 0 2px 12px rgba(0,0,0,0.07), 0 0 0 1px var(--glass-border)`; hover `shadow-[0_16px_40px_rgba(0,128,0,0.14)]`; entrance wu-fadeUp staggered `index*95ms`. Whole card clickable.
- Image: `aspect-ratio:16/9`, object-cover, hover `scale-[1.15]`; gradient fallback `#0c4a1a→#3aa15a→#d4af37` (135deg).
- Category badge: top-left pill, per-label gradient — animals `#1a5c34→#2e9958`, birds `#0a4a9c→#1a72d8`, default `#006000→#3a9e3a` — `text-[11px] font-semibold text-white`.
- Body `px-5 pb-5 pt-4`: title `font-display text-[1.25rem] font-bold leading-snug line-clamp-2 hover:text-primary`; excerpt `text-[0.95rem] fg-soft line-clamp-3`; meta row (1px top border): date left, author + share right.

### Alternate card (PostCard — related/category grids)
`.glass rounded-2xl p-0 hover:scale-[1.02] hover:border-primary/40 hover:shadow-2xl`; image `aspect-[16/10]`; pill top-left `rounded-full bg-black/40 px-2.5 py-1 text-xs text-white backdrop-blur`; featured → gold pill `bg-gold/90 text-[#1a1208]`; body `p-6 gap-3`, footer "View Post" pill `bg-primary/10 text-primary`.

### Category feature cards (Explore section)
`rounded-2xl aspect-[16/10]`, 2-col sm / 3-col lg; per-category gradient (animals `linear-gradient(145deg,#061206,#1a4a10,#3d7a28)` accent `#5dc23a`); bottom scrim + title `font-display text-xl font-black text-white` + "Explore" pill with category accent. Heading centered `text-3xl sm:text-4xl md:text-5xl font-black` + muted subtitle.

---

## 4. POST / ARTICLE PAGE

### Hero
`relative -mt-16 flex h-[88vh] min-h-[640px] items-end overflow-hidden` — full-bleed cover (or palette gradient 135deg from/via/to), `.dark-overlay` + bottom `.gradient-fade-down` (h-16) dissolving into page bg. Content in container `pb-14 pt-20 sm:pb-16 sm:pt-24`:
- Back pill: `rounded-full border glass-border bg-glass px-4 py-2 text-sm backdrop-blur-md hover:border-#008000/40 hover:text-#008000`.
- Category badge: solid `bg-[#008000] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_12px_rgba(0,128,0,0.40)]`, text `Category · Label`. Featured → gold `bg-[#d4af37]/90 text-[#1a1208]` + star.
- Title: `font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] hero-text-title text-balance`.
- Meta glass chips (`rounded-full border glass px-3.5 py-1.5 text-xs`, icons green): Author · `{mins} min read` (words/200) · date `Month D, YYYY` · `{views} views` (if >0).
- Save (bookmark, localStorage `wu_saved`) + Share row.

### Reading progress
`fixed left-0 top-0 z-[60] h-1 origin-left bg-[#008000]`, width = scroll %.

### Body layout
Wrapper `mx-auto w-full max-w-[1560px] sm:w-[90%] lg:w-[85%]`; grid `lg:grid-cols-[220px_1fr] gap-3 sm:gap-6 lg:gap-8`.
- TOC sidebar (`hidden lg:block`, sticky top-24): card `rounded-2xl border glass-border bg-bg-deep p-4/5`, green tab marker; active item `border-l-2 border-#008000 bg-#008000/10 text-#008000`. Add `no-toc` collapse when <2 headings.
- Article card: `border-y sm:rounded-2xl sm:border glass-border bg-bg-deep px-4 py-6 sm:px-8 sm:py-8` with gold hover shadow. Body div class `post-body`.

### `.post-body` prose CSS (replicate exactly)
- Base `font-size:1rem; line-height:1.85; color:var(--color-fg)`; ≥640px `1.125rem`. Rhythm `> * + * { margin-top:0.95em }`.
- h1 `1.95em/800`, h2 `1.55em/800` + `border-bottom:1px solid var(--glass-border)` + padding-bottom, h3 `1.22em/700`, h4 `1.05em/700`. Headings `[id]` scroll-margin-top 7rem.
- Links green underline offset 3px, hover deep green.
- Blockquote: `border-left:3px solid var(--color-primary); padding-left:1.1em; italic; color:var(--color-fg-soft)`.
- Callouts: `.wu-funfact` (amber rgba(245,158,11,.10) box, ✦ `#d97706`), `.wu-inspiration` (green left bar italic 1.08em), `.wu-story` (green→gold gradient box, "Wildlife Story" eyebrow).
- Code inline: glass bg + border, 1px 6px, radius 4, mono 0.9em. `pre` 14/16px radius 10 overflow-x.
- Tables: overflow-x block radius 10; th `rgba(0,128,0,0.08)` uppercase ls .04em border-bottom 2px `rgba(0,128,0,0.22)`; even rows `rgba(0,0,0,0.025)`.
- Images/video: `width:100%; border-radius:12px; margin:1.2em auto`; mobile ≤640px figures bleed `calc(100%+1.4rem)`, `aspect-ratio:16/10 object-fit:cover radius 18px` + shadow. figcaption centered 0.85em muted. iframe 16:9 radius 12. `mark` gold `rgba(212,175,55,0.28)`.

### After the article
Tags card → **Reactions + Comments** (see §8) → Related posts ("More in {Category}", 3-col PostCard grid) → label sections.

### Reactions / Comments design
- Reactions card: green top border `border-t-[3px] border-t-[#008000]`, eyebrow "Your Reaction", 6 emoji: ❤️ Love / 😄 Laugh / 😮 Wow / 🤔 Think / 😢 Sad / 😡 Angry. Selected → `border-#008000/60 bg-#008000/10`. Counts under each.
- Comments card: gold top border `border-t-[3px] border-t-[#d4af37]`, "Discussion / Comments {n}". Name (optional) + textarea, gold "Post Comment" button `bg-[#d4af37] text-[#1a1208]`. Threaded one level (reply on top-level), per-comment reactions (👍 ❤️ 😄 😮). Client-side spam filter flags URLs/marketing/all-caps → `flagged=true`.
- Per-device identity: UUID in `localStorage['wu_user_token']`.

### TTS / Audio
Real site has a Plyr TTS player (gold theme) with word highlight + translation. Blogger version: Web Speech TTS widget styled gold (`#d4af37`), ≤30-word chunking, cancel-based pause/resume, language = voice picker (like Mayobe build).

### IUCN status
9 statuses with colors: EX `#888888`, EW, CR `#dc2020`, EN, VU, NT, LC `#28a028`, DD, NE. Order `['EX','EW','CR','EN','VU','NT','LC','DD','NE']`. Not shown in article hero on the real site — skip in theme (or a small pill if post body contains a marker; do NOT invent UI).

---

## 5. CATEGORY / LABEL PAGES

- Hero: `relative flex h-[88vh] min-h-[640px] items-center justify-center`; image w/ overlay `rgba(0,0,0,0.55)→0.35→0.7` + `.dark-overlay`; fallback gradient `from-[#031a0d] via-[#0c4a1a] to-[#3aa15a]`; bottom `.gradient-fade-down` h-24.
- Centered: eyebrow pill `border-white/20 bg-white/10 uppercase tracking-widest backdrop-blur` + green dot + "Category"; H1 `text-5xl sm:text-6xl md:text-7xl font-black hero-on-dark`; subtitle `hero-sub-on-dark`.
- Filter pills strip (`border-b glass-border`, horizontal scroll): active "All Posts" solid `bg-#008000 text-white px-5 py-2 rounded-full`; labels `bg-bg-deep border glass-border px-5 py-2 rounded-full text-sm hover:bg-glass-border`.
- Grid (PostCard glass style) + pagination.

---

## 6. FOOTER (dark always)

- `background:#0d1210; margin-top:6rem`, 1px top border `rgba(255,255,255,0.07)`. Inner `width:85%; max-width:1800px; padding:4rem 0 3.5rem`.
- 5-col grid `1.6fr 1fr 1fr 0.9fr 1.4fr; gap:2.5rem`; ≤1100px → 3 cols; ≤700px → 1 col.
- Col 1: logo (animated gradient mask 192×53: `linear-gradient(135deg,#4ade80,#3b82f6,#8b5cf6,#ec4899)` shifting behind logo mask — approximate with the logo img + `object-fit:contain` if masking is fragile) + description (`rgba(255,255,255,0.48)`) + Explore Labels pill cloud: every label as `rounded-full border rgba(255,255,255,0.12)` tiny pill (hover white).
- Col 2 Quick Links: Home, Wildlife Content, Popular Posts, Contributors, About Us, Contact, Advertise With Us, Sitemap, RSS Feed. (Map to Blogger equivalents: /p/about.html, /p/contact.html, /p/advertise.html, /p/sitemap.html, /feeds/posts/default?alt=rss.)
- Col 3 Legal: Privacy, Terms, Cookie, Editorial, Fact Checking, Wildlife Universe Team (→ /p/*.html pages).
- Col 4 Categories: Animals, Plants, Birds, Insects, Posts (→ /search/label/<Category>).
- Col 5 Newsletter: heading, blurb, email input (Mail icon, `rgba(255,255,255,0.05)` bg) + green Subscribe button, "No spam" note, RSS link, social icons row (WhatsApp `#25D366`, Facebook `#1877F2`, Instagram `#E4405F`, TikTok `#000`, YouTube `#FF0000` — 36px rounded squares, brand color hover). Newsletter → link the Blogger FollowByEmail alternative: `https://www.blogger.com/follow-blog.g?blogID=` + data:blog.blogId (or mailto), since site API is not public.
- Column headers: `rgba(255,255,255,0.35) 0.68rem 700 ls .14em uppercase border-bottom rgba(255,255,255,0.07)`. Links `rgba(255,255,255,0.56)`→white, 0.875rem.
- Copyright bar: `border-top rgba(255,255,255,0.06); background rgba(0,0,0,0.2); padding:1.1rem 0` — © year left, "Staff Login" pill right → https://www.wildlifeuniverse.org/staff-login.

---

## 7. TAXONOMY — EXACT Blogger labels

5 categories, 28 unique labels ("IUCN Redlist" appears in 3 categories):

| Category | Labels |
|---|---|
| Animals | Mammals, Reptiles, Amphibians, Fish, IUCN Redlist |
| Plants | Trees, Shrubs, Herbs, Vines |
| Birds | Basal, Waterfowl, Coastal, Raptors, Land, Song, IUCN Redlist |
| Insects | Porifera, Cnidaria, Platyhelminthes, Nematoda, Annelida, Mollusca, Arthropoda, Echinodermata, IUCN Redlist |
| Posts | How Questions, Why Questions, Tourism, Conservation, Articles |

Blogger nav/drawer links: `/search/label/<exact name>` (categories AND labels are both Blogger labels; posts should be labeled with category + label).
`IUCN Red List` nav item → `/search/label/IUCN Redlist`.

---

## 8. SHARED BACKEND (Supabase — VERIFIED anon-permissive)

- URL: `https://msnllkjvhxzfoedgecva.supabase.co`
- Anon key: read from `D:\MY WEBSITE PROJECTS\Wildlife.Universe\.env.local` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public by design; NEVER ship the service-role key from the same file).
- RLS: `posts` SELECT (non-draft) anon OK; `comments` INSERT `WITH CHECK (TRUE)`, SELECT `flagged = FALSE`; `post_reactions` + `comment_reactions` fully anon read/write.
- Tables:
  - `posts`: id, slug (UNIQUE), title, body, category, cover, cover_palette JSONB, featured, status, views, iucn_status, tags[], created_at.
  - `comments`: id UUID, **post_slug TEXT**, author (default 'Anonymous'), body, flagged BOOL, parent_id (threading), created_at. Query `.eq('post_slug',slug).eq('flagged',false).order('created_at')` → REST: `comments?post_slug=eq.X&flagged=eq.false&order=created_at`.
  - `post_reactions`: post_slug, user_token, reaction CHECK in (love,laugh,wow,think,sad,angry), UNIQUE(post_slug,user_token). Upsert `Prefer: resolution=merge-duplicates`.
  - `comment_reactions`: comment_id, user_token, reaction in (like,love,laugh,wow,think,sad,angry), UNIQUE(comment_id,user_token).
- **Post matching**: Blogger post → `GET /rest/v1/posts?title=eq.<encoded exact title>&select=slug,views,category,featured` → use returned `slug` as the key for comments/reactions (`expr:data-title='data:post.title'` on article root). Views: display only (no anon UPDATE on posts; do not attempt increments).
- Cover images: Supabase storage `https://msnllkjvhxzfoedgecva.supabase.co/storage/v1/object/public/media/<uid>.{avif,webp,...}` — EXTERNAL to Blogger → feed thumbnails empty → JS body-image extraction required; blog feed must be FULL.

## 9. ASSETS — DOMAIN MIGRATION RULES (IMPORTANT)
**The user will attach www.wildlifeuniverse.org ITSELF to this Blogger blog.** Therefore the current Next.js origin will disappear — NEVER hotlink theme assets from wildlifeuniverse.org.
- Copy these files from `D:\MY WEBSITE PROJECTS\Wildlife.Universe\public\` into the deliverable `blogger\assets\`: `logo.png`, `favicon.png`, `og-default.jpg`, `hero\canopy.jpg`, `hero\eagle.jpg`, `hero\savanna.jpg`.
- In the theme, group ALL asset URLs in ONE clearly marked block (`<!-- ===== ASSET URLS — replace after uploading assets (see README) ===== -->` + a JS `WU_ASSETS` const for engine-injected images). Default them to the current production URLs (still live today) so previews work, and the README must include a **"Before switching the domain"** step: upload the 6 assets (Blogger media / any host) and swap the marked URLs.
- Footer "Staff Login" and any admin links: point to the app's future home — mark them in the same block with a README note (admin/staff app must live on another subdomain/host after the switch).
- Sitemap link in head/footer: use Blogger's own `/sitemap.xml` (served automatically), NOT the Next.js sitemap.
- Post cover images inside migrated posts remain on Supabase storage (`msnllkjvhxzfoedgecva.supabase.co`) — unaffected by the domain switch. Supabase comments/reactions also unaffected.

## 10. 404
Centered glass panel `max-w-2xl p-12`: eyebrow `404` green uppercase tracking-widest, H1 `text-4xl sm:text-5xl font-black "Post not found"` (use "Content Not Available!" variant text ok), muted paragraph, green pill button `rounded-full bg-primary px-5 py-2.5 text-white shadow-lg` "Back to posts" + auto-redirect countdown card (Mayobe pattern).

## 11. STATIC PAGES (blogger-pages/)
Dark (`#0d1210`) pattern: hero `linear-gradient(135deg,#0c4a1a,#143a23,#1f2a20)` + gold radial, gold-bordered icon chip, eyebrow "Wildlife Universe · Legal" (`#d4af37` uppercase), white H1 clamp(1.75rem,3vw,2.4rem), body max-width 880px, H2 with gold underline `border-bottom:1px solid rgba(212,175,55,0.22)`, paragraphs `rgba(255,255,255,0.7) lh 1.7`, gold contact box (mclean@wildlifeuniverse.org).
Generate: about, contact, advertise, privacy-policy, terms-of-service, cookie-policy, editorial-policy, fact-checking-policy, team, sitemap (dynamic feed script), popular (dynamic feed script). About uses 4 "PILLARS" cards.

---

## BUILD DECISIONS (Blogger adaptation)
1. Output: `D:\MY WEBSITE PROJECTS\Wildlife.Universe\blogger\theme\wildlifeuniverse-blogger-theme.xml` + `blogger-pages\` + `README.md`.
2. Base skeleton: copy structure of `D:\MY WEBSITE PROJECTS\MAYOBE BROS BLOGGER\theme\mayobebros-blogger-theme.xml`, re-skin fully to this spec (prefix classes `wu-`).
3. Header uses max-w-7xl inner; content sections use the 90%/85%/1560px container; footer 85%/1800px — three container classes, don't unify.
4. Homepage engine: hero → Latest Posts 12 (native grid upgraded by feed engine) → Explore Categories (5 gradient cards) → per-category rows (6 each: Animals, Plants, Birds, Insects, Posts) with the eyebrow/sechead style. Netflix-style horizontal carousels may render as 3-col rows (acceptable static equivalent) — keep the section heading + View All exact.
5. Post page: hero (88vh min 640px, image from first body img), progress bar, TOC grid 220px, post-body CSS verbatim, gold TTS widget, Supabase reactions+comments (shared, slug-keyed via title match), related = label feed 3-col PostCard grid.
6. Category pages: 88vh hero + label filter pills + glass card grid (JS engine 60/label).
7. Live search: Blogger `?q=` feed suggestions panel restyled glass/green.
8. Dark mode: `.dark` class on `<html>`, localStorage key `wu-theme`, pre-paint script, toggle in header + mobile menu footer.
9. No Adcash block (that was Mayobe-specific) — omit ad scripts.
10. Smoke-test Supabase REST reads with Invoke-WebRequest during build; do NOT write test rows.

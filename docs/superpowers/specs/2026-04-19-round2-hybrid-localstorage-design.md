# Wildlife Universe — Round 2: Hybrid Offline with localStorage Backend

**Date:** 2026-04-19
**Round:** 2 of N
**Builds on:** Round 1 (foundation showcase shell)

## Goal

Make the Wildlife Universe site **feel** like a real CMS-backed product while remaining 100% offline. Build a fake "backend" on top of `window.localStorage` that mirrors what Supabase will eventually provide. Wire up auth UI, admin CMS, post CRUD, featured-posts hero mode, post detail pages, and real category browsing.

When Round 3 arrives we swap the localStorage layer for Supabase as a single substitution — the rest of the app shouldn't care.

## Non-Goals (deferred)

- Real Supabase / database / cloud storage
- Real OAuth (buttons are visual placeholders only)
- Real email (Resend) — Round 5
- Server-side rendering of dynamic content (everything client-fetches from localStorage)
- Real media optimization pipeline (we accept base64 uploads up to ~2 MB for now)
- Functional global live search — UI shell remains, post-search wired up but no fuzzy ranking yet
- Multi-user concurrency, server validation, RLS

## Architecture

### Data layer (`lib/storage/`)

A single tiny abstraction that looks like an async repository:

```js
// lib/storage/db.js
const db = {
  heroes: { list, create, update, remove, toggleMode, getMode },
  posts: { list, get, create, update, remove, listByCategory, listFeatured },
  users: { list, get, create, update, getCurrent, signIn, signOut },
  media: { put, get }, // base64 storage
};
```

Each method returns a Promise (so the swap to Supabase later is a no-op for callers). All data namespaced under `wu:*` keys.

**Seeding:** First load detects empty store and seeds with the three Round-1 hero items + a single demo CEO user (`ceo@wildlife.local`) + 4 sample featured posts.

### Auth model

- Single hardcoded CEO email: `ceo@wildlife.local` (password `wildlife` — for offline only; will be replaced by real Supabase auth in Round 3)
- Manual signup creates a regular user
- "Current user" stored in `wu:session`
- Route guard on `/admin/*` redirects to `/login` if not CEO

### Admin CMS at `/admin`

Sidebar layout (sticky, glass), three sections:
- **Heroes** — list (max 11), create/edit modal with image upload (base64), drag-to-reorder (optional v2), mode toggle pill (Default ↔ Featured)
- **Posts** — table view, row actions (edit/delete/toggle featured), create modal with title / slug / description / body (textarea, plain text for now) / category / label / cover image
- **Users** — read-only table

CEO sees their email + sign-out in sidebar footer.

### Featured-posts hero mode

When CMS hero mode is `'featured'`, the home page hero replaces the default carousel with up to 5 randomly-selected featured posts (`featured: true` posts shuffled, sliced to first 5). Each slide shows: post title, description, "View Post" CTA pointing to `/posts/<slug>`. The "Explore" CTA is hidden in this mode (per original spec).

In default mode, the carousel uses CMS-managed hero items (whatever the CEO put in via admin) and shows the "Explore" CTA pointing to the URL configured per item.

### Post detail page (`/posts/[slug]`)

Cinematic header with cover image (or gradient placeholder), category + label chips, title, description, body. Related posts strip at bottom (3 from same category).

### Category pages

`/animals`, `/plants`, etc., now show real posts from localStorage filtered by `category === slug`. Subcategory chip clicks filter further by label. Empty state if no posts yet ("No posts in this category yet — check back soon").

`/animals` keeps the fancy hero strip from Round 1 but the cards now come from localStorage.

### Auth UI

- `/signup` — first name, last name, email, country (dropdown of all ~250 countries), password, confirm. After submit → 15-avatar picker (Round 2 generates these as inline SVG/emoji-style — no external assets) → `/profile`.
- `/login` — email + password. OAuth buttons (Google / Microsoft / Facebook) visible but disabled with "Coming in Round 4" tooltip.
- `/profile` — view + edit name, country, avatar. Sign out button.
- Navbar gains a user button (top-right) — shows avatar if logged in, "Sign in" otherwise.

## File Map (additions)

```
lib/
  storage/
    db.js                  # public API — heroes/posts/users/media facade
    keys.js                # localStorage key constants
    seed.js                # initial seed for empty store
  data/
    countries.js           # full country list (~250 entries)
    avatars.js             # 15 SVG-emoji animal avatars (inline JSX components)
  auth/
    session.js             # client-side session helpers
    ceo.js                 # CEO email constant + isCEO()

components/
  admin/
    AdminLayout.jsx
    AdminGuard.jsx          # client-side redirect if not CEO
    HeroEditor.jsx
    HeroList.jsx
    PostEditor.jsx
    PostList.jsx
    UserList.jsx
    AdminSidebar.jsx
    MediaUpload.jsx          # file → base64 helper
  auth/
    SignupForm.jsx
    LoginForm.jsx
    ProfileForm.jsx
    AvatarPicker.jsx
    CountrySelect.jsx
    OAuthButtons.jsx
    UserButton.jsx           # navbar slot
  posts/
    PostCard.jsx
    PostGrid.jsx
    EmptyPostState.jsx
  hero/
    FeaturedHeroCarousel.jsx   # new: pulls from localStorage posts
    HeroOrchestrator.jsx       # picks default vs featured at render time

app/
  admin/
    layout.jsx
    page.jsx                # redirect to /admin/heroes
    heroes/page.jsx
    posts/page.jsx
    users/page.jsx
  signup/page.jsx
  login/page.jsx
  profile/page.jsx
  posts/
    [slug]/page.jsx          # post detail
  animals/page.jsx           # MODIFIED: now uses localStorage
  plants/page.jsx            # MODIFIED: now uses localStorage
  birds/page.jsx             # MODIFIED: now uses localStorage
  insects/page.jsx           # MODIFIED: now uses localStorage
  posts/page.jsx             # MODIFIED: lists all posts
```

## Acceptance Criteria

Round 2 is complete when:

1. First page load seeds localStorage with 3 hero items + 4 sample posts + CEO user
2. Logging in as `ceo@wildlife.local` / `wildlife` lets you reach `/admin`; non-CEO users get redirected to `/login`
3. In `/admin/heroes`, CEO can create / edit / delete hero items (max 11 enforced); upload an image (base64); toggle Default ↔ Featured mode
4. Mode toggle from `/admin/heroes` is reflected on the home page on next reload
5. In `/admin/posts`, CEO can CRUD posts with title / slug / description / body / category / label / cover / featured flag
6. Sign up flow: `/signup` → fill form → choose avatar → `/profile` (user is logged in)
7. Profile shows user info + avatar + sign-out
8. Navbar shows user avatar (if logged in) or "Sign in" button
9. Category pages (`/animals` etc.) list actual posts from localStorage filtered by category
10. Subcategory chip click filters further by label
11. Post detail page (`/posts/<slug>`) renders correctly with related posts strip
12. Featured hero mode: home page shows random featured posts with "View Post" CTA; default mode shows CMS hero items with "Explore" CTA
13. All Round 1 acceptance criteria still pass
14. `npm run build` passes
15. No console errors during normal use

## Risks / Tradeoffs

- **Storage size:** localStorage caps at 5–10 MB. Base64 images at ~2 MB each + 11 hero items = could blow the cap. **Mitigation:** enforce per-image size limit (max 800 KB for hero, 400 KB for post cover). Strip metadata before base64 encoding.
- **No SSR for dynamic content:** all post lists & hero mode resolution happen on the client (after hydration), causing a brief skeleton flash. Acceptable for this round.
- **Hardcoded CEO password:** intentional — this is offline only. Will be replaced by Supabase auth in Round 3. Documented in README warning.
- **15 avatars as inline SVG:** styled emoji-like animal silhouettes, not photographs. Premium-but-friendly aesthetic.

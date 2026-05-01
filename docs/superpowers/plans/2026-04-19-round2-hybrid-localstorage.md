# Round 2 Implementation Plan — Hybrid localStorage Backend

> **For agentic workers:** Use superpowers:executing-plans. Code is written directly into files during execution rather than duplicated here, since the spec covers each file's responsibility.

**Goal:** Wire up a localStorage-backed "fake backend" so the site feels like a real CMS-driven product while staying 100% offline.

**Architecture:** All data lives under `wu:*` localStorage keys, accessed through a single `db` facade in `lib/storage/db.js` whose method shape mirrors what Supabase will expose in Round 3 (so the swap is a one-file change). Route guards, admin shell, hero mode toggle, post CRUD, and auth UI all sit on top of that facade.

**Tech additions:** No new npm dependencies. Pure localStorage, inline SVG avatars, plain country list.

---

## Task A: Storage layer + seed

- [ ] Create `lib/storage/keys.js` — string constants for every `wu:*` key
- [ ] Create `lib/storage/seed.js` — initial seed (Round-1 hero items + 4 sample featured posts + CEO user)
- [ ] Create `lib/storage/db.js` — `heroes`, `posts`, `users`, `media`, `mode` namespaces. Methods: `list`, `get`, `create`, `update`, `remove`, `getMode`, `setMode`. Each returns a Promise. Auto-seeds on first call.
- [ ] Create `lib/storage/StorageProvider.jsx` — client component that calls `db.bootstrap()` once on mount

## Task B: Auth + reference data

- [ ] Create `lib/data/countries.js` — exported array of `{ code, name }` for all sovereign nations + common dependencies
- [ ] Create `lib/data/avatars.js` — 15 inline SVG components rendering stylized animal heads with primary/gold accents
- [ ] Create `lib/auth/ceo.js` — `CEO_EMAIL`, `CEO_PASSWORD`, `isCEO(user)`
- [ ] Create `lib/auth/session.js` — `getCurrentUser()`, `signIn(email, password)`, `signOut()`, `signUp(payload)`. Returns Promises.
- [ ] Create `lib/auth/AuthContext.jsx` — React context exposing `user`, `signIn`, `signOut`, `refresh`. Wired in root layout.

## Task C: Auth UI pages + components

- [ ] Create `components/auth/CountrySelect.jsx`
- [ ] Create `components/auth/AvatarPicker.jsx` — grid of 15 avatars, click to select
- [ ] Create `components/auth/OAuthButtons.jsx` — three glass buttons (Google/Microsoft/Facebook), all disabled with tooltip "Coming in Round 4"
- [ ] Create `components/auth/SignupForm.jsx`
- [ ] Create `components/auth/LoginForm.jsx`
- [ ] Create `components/auth/ProfileForm.jsx`
- [ ] Create `components/auth/UserButton.jsx` — shows avatar + name when logged in, "Sign in" link otherwise
- [ ] Create `app/signup/page.jsx`
- [ ] Create `app/login/page.jsx`
- [ ] Create `app/profile/page.jsx` — redirects to /login if not authed

## Task D: Post UI primitives

- [ ] Create `components/posts/PostCard.jsx`
- [ ] Create `components/posts/PostGrid.jsx`
- [ ] Create `components/posts/EmptyPostState.jsx`

## Task E: Admin CMS

- [ ] Create `components/admin/AdminGuard.jsx` — client redirect to /login if !isCEO
- [ ] Create `components/admin/AdminSidebar.jsx`
- [ ] Create `components/admin/AdminLayout.jsx` — wraps children in guard + sidebar
- [ ] Create `components/admin/MediaUpload.jsx` — file input → base64 with size guard + preview
- [ ] Create `components/admin/HeroList.jsx`
- [ ] Create `components/admin/HeroEditor.jsx` — modal with title, description, cta href, image upload, type (image/video)
- [ ] Create `components/admin/PostList.jsx`
- [ ] Create `components/admin/PostEditor.jsx` — modal with title (auto-slug), description, body (textarea), category (select from categories.js), label (select from chosen category's labels), cover image, featured toggle
- [ ] Create `components/admin/UserList.jsx`
- [ ] Create `app/admin/layout.jsx`
- [ ] Create `app/admin/page.jsx` — redirect to /admin/heroes
- [ ] Create `app/admin/heroes/page.jsx` — list + mode toggle pill
- [ ] Create `app/admin/posts/page.jsx`
- [ ] Create `app/admin/users/page.jsx`

## Task F: Hero mode resolution + featured carousel

- [ ] Create `components/hero/FeaturedHeroCarousel.jsx` — variant of HeroCarousel that renders post-style slides with "View Post" CTA
- [ ] Create `components/hero/HeroOrchestrator.jsx` — client component, reads mode + items from db, renders appropriate carousel

## Task G: Post detail + category browsing

- [ ] Create `app/posts/[slug]/page.jsx` — cinematic header, body, related-posts strip
- [ ] Modify `app/posts/page.jsx` — list all posts (replace placeholder)
- [ ] Modify `app/animals/page.jsx` — pull posts from db.posts.listByCategory('animals') with label filter chips
- [ ] Create `app/plants/page.jsx`, `app/birds/page.jsx`, `app/insects/page.jsx` mirrors of /animals (replace placeholder pages)

## Task H: Wiring

- [ ] Modify `app/layout.jsx` — wrap in AuthContext + StorageProvider
- [ ] Modify `components/nav/Navbar.jsx` — add UserButton + admin link if CEO
- [ ] Modify `app/page.jsx` — replace `<HeroCarousel slides={heroes}>` with `<HeroOrchestrator />`

## Task I: Verify + commit

- [ ] `npm run build`
- [ ] Manual smoke: signup, login as CEO, create hero, create post, toggle mode, view detail page
- [ ] `git commit`

---

## Dependencies between tasks

A → all (storage layer is foundational)
B → C, E (auth helpers needed)
C, D → F, G (UI primitives needed)
E, F, G → H (wiring depends on everything else)
H → I

## Risks called out in spec

- localStorage size cap: enforce 800 KB per hero image, 400 KB per post cover (in MediaUpload)
- Hydration: storage operations are client-only — guard SSR with `typeof window !== 'undefined'`
- Hardcoded CEO password: documented in README; replaced in Round 3

# Wildlife Universe — Foundation Showcase Shell (Design Spec)

**Date:** 2026-04-19
**Round:** 1 of N (offline showcase shell — first of multi-round build)
**Status:** Approved by user, ready for implementation plan

## Goal

Ship an **offline, locally-runnable Next.js showcase** of the Wildlife Universe brand. Runs via `npm run dev`, opens at `http://localhost:3000`, demonstrates the cinematic luxury design language and core hero/nav/footer system. No external services, no real backend, no real auth — pure frontend with mock data.

This is **round 1** of a multi-round decomposition. Future rounds wire up Supabase, Resend, OAuth, admin CMS, etc.

## Non-Goals (deferred to later rounds)

- Real Supabase / database / storage
- Real auth (manual signup, OAuth: Google/Microsoft/Facebook)
- Real Resend email automation (4 templates)
- Functional admin CMS
- Functional live search (UI shell only this round)
- Real media upload + 85% compression pipeline
- Featured-posts hero mode (default mode only this round)
- Post detail pages, post creation/editing
- Full category pages beyond `/animals` (other categories get placeholder route stubs only)
- GitHub integration / Vercel deployment

## Stack

- **Next.js 15** (App Router, JavaScript only — `.jsx`, no TypeScript)
- **Tailwind CSS v4** (CSS-based config, no `tailwind.config.js`)
- **Framer Motion** for cinematic animations + carousel drag/swipe
- **next-themes** for light/dark/device theme toggle
- **next/font** for Playfair Display (titles) + Inter (body)
- **lucide-react** for icons
- **Node 20+**, npm package manager

## Design Tokens

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#008000` | brand green, CTAs, active states |
| `--color-primary-deep` | `#003d00` | gradients, hover states |
| `--color-gold` | `#d4af37` | luxury accents, focus rings |
| `--color-bg` | `#0a0f0a` (dark) / `#f7f9f5` (light) | base canvas |
| `--color-fg` | `#f7f9f5` (dark) / `#0a0f0a` (light) | base text |
| `--color-glass` | `rgba(255,255,255,0.08)` | glass panels |
| `--blur-glass` | `16px` | backdrop-blur |
| Typography | Playfair Display 700 (display), Inter 400/500/700 (body) | |
| Radii | `8px` (cards), `999px` (pills) | |
| Easing | `cubic-bezier(0.22, 1, 0.36, 1)` | premium ease-out |

## Project Structure

```
Wildlife.Universe/
├── app/
│   ├── layout.jsx              # root layout, theme provider, fonts, metadata
│   ├── page.jsx                # home (hero carousel + intro section)
│   ├── animals/page.jsx        # sample category page (proves the system)
│   ├── globals.css             # Tailwind v4 + tokens + base styles
│   └── (placeholder routes)/   # plants, birds, insects, posts → stub pages
├── components/
│   ├── nav/
│   │   ├── Navbar.jsx
│   │   ├── SearchToggle.jsx    # opens search overlay (UI only)
│   │   └── ThemeToggle.jsx
│   ├── hero/
│   │   ├── HeroCarousel.jsx    # orchestrator + state
│   │   ├── HeroSlide.jsx       # one slide (image OR video)
│   │   ├── HeroControls.jsx    # chevrons + dots
│   │   └── HeroPlaceholder.jsx # SVG/gradient placeholder visual
│   ├── footer/Footer.jsx
│   └── ui/{Button,GlassPanel,Container}.jsx
├── lib/
│   ├── mock/heroes.js          # 3 demo hero items
│   └── mock/categories.js      # nav + footer category structure
├── public/
│   ├── logo.png                # provided logo
│   ├── favicon.png             # provided favicon
│   └── hero/                   # empty — placeholders are SVG/gradient in-component
├── docs/superpowers/specs/
│   └── 2026-04-19-foundation-showcase-design.md
├── package.json
├── next.config.mjs
├── jsconfig.json
├── postcss.config.mjs
├── .gitignore
└── README.md
```

## Hero Carousel — Behavior Spec

**Demo content:** 3 slides total → 2 image slides + 1 video slide (proves both layout rules).

For offline-first, the "image" slides are SVG + CSS-gradient placeholders generated in-component (`HeroPlaceholder.jsx`). The "video" slide is a CSS-animated gradient layer that mimics motion (a real `<video>` is wired up but the `src` is empty — falls back to the animated gradient when no asset present). User can drop real `.jpg`/`.mp4` files into `/public/hero/` later and update `lib/mock/heroes.js` paths.

**Layout rules:**

- **Image slide:** Title centered upper-third with strong drop shadow. Description + CTA buttons anchored bottom-left.
- **Video slide:** All content (title, description, CTAs) anchored bottom-left. Cinematic spacing: 8% inset.

**Carousel mechanics:**

- Auto-advance every **6 seconds**, pause on hover, pause when tab not visible
- Active slide = fullscreen (100vh), with adjacent slides peeking ~12% on each side at ≥1024px
- Below 1024px, peeks hide; only active slide visible (mobile-friendly)
- Glass-pill chevron buttons left/right (visible on hover desktop, always-on mobile)
- Dot indicators at bottom-center; active dot fills with `--color-primary`, others `--color-glass`
- Click adjacent peek → promotes that slide to active
- Touch swipe (Framer Motion `drag="x"`) on mobile
- Slide transition: 800ms slide + crossfade with cinematic easing
- Title text: staggered character reveal on slide change (Framer Motion variants)
- Bottom 25% of hero: linear-gradient overlay glass that strengthens going into next section

**Buttons (default mode):**

- Primary: "Explore" (solid green pill, gold focus ring on Tab)
- "View Post" button NOT shown in default mode (per spec — only shown in featured mode, which is deferred)

**Accessibility:**

- `aria-roledescription="carousel"`, slides marked with `aria-label` and current state
- Live region announces slide changes
- `prefers-reduced-motion` → autoplay disabled, transitions become instant fade
- Pause/play button (icon-only, top-right of carousel area, glass background)
- Keyboard: `←`/`→` cycles slides when carousel focused; `Space` toggles play/pause

## Navigation — Behavior Spec

- **Sticky top.** Transparent over hero, transitions to solid glass (`backdrop-blur-md` + `bg-bg/70`) once scrolled past hero (≥80vh).
- **Layout:** Logo left | center links | search + theme toggle right
- **Center links:** Home, Animals, Plants, Birds, Insects, Posts. **No dropdowns** (per spec).
- **Active link** gets `--color-primary` underline (animated grow-from-center)
- **Search:** icon button → opens fullscreen overlay with input + "no results yet" empty state (UI shell only, no real query backend)
- **Theme toggle:** cycles light → dark → device, glass icon button, persists via `next-themes`
- **Mobile (<768px):** hamburger icon collapses center+right into slide-out drawer (right side, glass, 80vw width)

## Footer — Spec

Three-column desktop, single-column mobile.

- **Column 1 — Legal** (7 placeholder links, route to `/legal/<slug>` 404 stub for now): Privacy Policy, Terms & Conditions, EEAT (Editorial Policy), Cookies Policy, Cache Policy, Fact Checking Policy, Wildlife Universe Team
- **Column 2 — Quick Links** (7): Home, Popular Posts, About Us, Contact Us, Advertise, Sitemap, RSS Feed
- **Column 3 — All Labels (dynamic):** Iterates `lib/mock/categories.js` and renders every label as a chip — proves the "display all labels dynamically" requirement

**Bottom bar:** logo + tagline ("A modern luxury wildlife platform.") + copyright `© 2026 Wildlife Universe`.

## Sample Category Page — `/animals`

Proves the system extends beyond home. Components reused.

- Small hero strip (40vh) with "Animals" title over animated green gradient
- Subcategory chips row: Mammals, Reptiles, Amphibians, Fish, IUCN Redlist (per spec; non-functional in this round, just visual)
- Responsive grid (1/2/3 cols) of 6 glassmorphic placeholder cards — title + description + "View Post" disabled state. Proves card pattern.

Other category routes (`/plants`, `/birds`, `/insects`, `/posts`) get a tiny placeholder page that says "Coming in next round" — keeps nav links from 404'ing.

## Performance & Quality

- All static visuals server-rendered. Only the carousel + nav scroll listener + theme toggle are client components.
- `next/image` for logo + favicon; `loading="lazy"` everywhere applicable
- Framer Motion components dynamically imported where they're below the fold
- `prefers-reduced-motion` respected app-wide via a CSS media query in `globals.css`
- Lighthouse target for this round: ≥95 Performance, ≥95 Accessibility on home route, dev mode acceptable lower

## Acceptance Criteria

This round is **complete** when:

1. `npm install && npm run dev` works on Windows (user's platform)
2. `http://localhost:3000` shows the hero carousel auto-advancing through 3 slides (2 image-rule, 1 video-rule)
3. Carousel navigation works: chevrons, dots, click-peek-to-promote, swipe (verified manually on mobile viewport in DevTools)
4. Nav is sticky, transparent → glass on scroll, all 6 links route somewhere (stub pages OK for non-Animals)
5. Theme toggle cycles light/dark/device and persists across reload
6. Search icon opens overlay with input (typing does nothing — that's expected this round)
7. Footer shows all three columns with dynamic labels visible in column 3
8. `/animals` page renders with subcategory chips and 6 glass cards
9. Logo + favicon visible (logo in nav, favicon in browser tab)
10. Responsive: hero/nav/footer all render correctly at 375px / 768px / 1440px viewports
11. No console errors in dev mode
12. README.md includes setup steps + how to swap placeholder media

## Open Questions / Assumptions Locked

- **Media:** Option (i) — SVG/CSS-gradient placeholders rendered in-component. User can swap real media in later by dropping files into `/public/hero/` and editing `lib/mock/heroes.js`.
- **Logo + favicon:** User said to use the two images provided. Will be referenced as `/public/logo.png` and `/public/favicon.png`. **User must place these two files into `C:\Users\mattm\Wildlife.Universe\public\` before running `npm run dev`** — they're shown in the conversation but not accessible from disk by the build tool. Build tolerates their absence (graceful fallback to a text wordmark).
- **Git remote:** Not configured this round. Repo initialized locally only. GitHub push happens in a later round.
- **Node version:** Assume Node 20+ available. Will document in README.

## Risks

- Tailwind v4 is still relatively new — if user's Node/npm hits compatibility issues, fallback is Tailwind v3 (minor config tweaks). Will note in README.
- Framer Motion dependency adds ~30KB gzipped to client bundle — acceptable for showcase, will revisit in performance round.
- Without real wildlife media, the cinematic feel rests on gradients + typography. May feel less "premium" than a real shoot — explicit tradeoff for offline-first.

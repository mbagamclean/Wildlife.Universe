# Wildlife Universe

A modern luxury wildlife platform — cinematic hero, glass UI, dynamic content shell.

This is the **offline showcase shell** (Round 1 of a multi-round build). It runs entirely locally with mock data and SVG/gradient placeholder visuals. No external services, no real backend.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- A modern desktop browser (Chrome, Firefox, Safari, Edge)

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Replacing placeholder media

The hero carousel ships with SVG/gradient placeholders so it works fully offline. To use real media:

1. Drop your files into `public/hero/` matching the paths in `lib/mock/heroes.js`:
   - `public/hero/savanna.jpg`
   - `public/hero/canopy.mp4`
   - `public/hero/eagle.jpg`
2. Or edit `lib/mock/heroes.js` and change the `src` values to whatever you prefer.

The placeholder SVGs render underneath, so if any media is missing or fails to load, the carousel still looks intentional.

## Replacing the logo + favicon

Drop these two files into `public/`:
- `public/logo.png` — appears in the navbar (recommended ~360x96 PNG with transparency)
- `public/favicon.png` — browser tab icon (recommended 512x512 square PNG)

The navbar gracefully falls back to a text wordmark if `logo.png` is missing.

## Project structure

```
app/                  Next.js App Router routes
components/
  hero/               Carousel system
  nav/                Sticky glass navbar
  footer/             Dynamic footer
  ui/                 Container, GlassPanel, Button primitives
  providers/          Theme provider
lib/mock/             Mock data (heroes, categories)
docs/superpowers/     Design spec + implementation plan
public/               Logo, favicon, optional hero media
```

## Build

```bash
npm run build
npm run start
```

## What's next (future rounds)

- Round 2: Cinematic hero with real media + featured posts mode + admin upload
- Round 3: Full CMS, post editor, all category routes
- Round 4: Auth (manual + Google/Microsoft/Facebook OAuth) + 15 animal avatars
- Round 5: Resend email automation (4 templates)
- Round 6: Live search + admin polish
- Round 7: Performance, SEO, RSS, sitemap, Vercel deploy

## License

Private — all rights reserved.

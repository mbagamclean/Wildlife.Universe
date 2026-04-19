# Wildlife Universe Foundation Showcase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an offline, locally-runnable Next.js showcase of the Wildlife Universe brand — cinematic hero carousel, glass nav, dynamic footer, sample category page, and theme toggle. Runs via `npm run dev` with no external services.

**Architecture:** Next.js 15 App Router using `.jsx` (no TypeScript). Tailwind v4 (CSS-based config, no `tailwind.config.js`). All components are server components by default; only the carousel, nav scroll listener, theme toggle, and search overlay opt into client mode. Mock data lives in `lib/mock/`. Cinematic animations driven by Framer Motion with `prefers-reduced-motion` respected. SVG/CSS-gradient placeholders stand in for real wildlife media so the build is fully offline.

**Tech Stack:** Next.js 15.x, React 18.x, Tailwind CSS v4, Framer Motion 11.x, next-themes 0.x, lucide-react, next/font (Playfair Display + Inter).

**Verification approach:** Each major task ends with `npm run build` (catches compile errors) and a commit. Final task includes `npm run dev` and a manual smoke test of the acceptance criteria from the spec. No unit tests for purely-visual components — would be theatre.

---

## File Map

| Path | Purpose | Created in Task |
|---|---|---|
| `package.json` | deps + scripts | 1 |
| `next.config.mjs` | Next config (minimal) | 1 |
| `jsconfig.json` | path alias `@/*` → root | 1 |
| `postcss.config.mjs` | Tailwind v4 plugin | 1 |
| `.gitignore` | standard Next ignore | 1 |
| `app/globals.css` | Tailwind import, design tokens, base styles | 2 |
| `lib/mock/heroes.js` | 3 demo hero items | 3 |
| `lib/mock/categories.js` | nav + footer category structure | 3 |
| `components/providers/ThemeProvider.jsx` | next-themes wrapper | 4 |
| `app/layout.jsx` | root layout, fonts, metadata, providers | 4 |
| `components/ui/Container.jsx` | max-width wrapper | 5 |
| `components/ui/GlassPanel.jsx` | reusable glassmorphic panel | 5 |
| `components/ui/Button.jsx` | brand button (primary/ghost variants) | 5 |
| `components/nav/ThemeToggle.jsx` | light/dark/device cycler | 6 |
| `components/nav/SearchToggle.jsx` | search button + overlay | 6 |
| `components/nav/Navbar.jsx` | sticky glass nav | 6 |
| `components/footer/Footer.jsx` | 3-column dynamic footer | 7 |
| `components/hero/HeroPlaceholder.jsx` | SVG/gradient stand-in for media | 8 |
| `components/hero/HeroSlide.jsx` | one slide (image OR video layout rule) | 8 |
| `components/hero/HeroControls.jsx` | chevrons + dots + play/pause | 8 |
| `components/hero/HeroCarousel.jsx` | orchestrator: state + autoplay + swipe | 8 |
| `app/page.jsx` | home: carousel + intro section | 9 |
| `app/animals/page.jsx` | sample category page | 10 |
| `app/plants/page.jsx` | placeholder route stub | 10 |
| `app/birds/page.jsx` | placeholder route stub | 10 |
| `app/insects/page.jsx` | placeholder route stub | 10 |
| `app/posts/page.jsx` | placeholder route stub | 10 |
| `README.md` | setup + how to swap media | 11 |

---

## Task 1: Scaffold project + configs

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `jsconfig.json`
- Create: `postcss.config.mjs`
- Create: `.gitignore`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "wildlife-universe",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "framer-motion": "11.11.17",
    "next-themes": "0.4.3",
    "lucide-react": "0.454.0"
  },
  "devDependencies": {
    "tailwindcss": "4.0.0-beta.3",
    "@tailwindcss/postcss": "4.0.0-beta.3",
    "postcss": "8.4.49"
  }
}
```

- [ ] **Step 2: Write `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Write `jsconfig.json`**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 4: Write `postcss.config.mjs`**

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules/
.next/
out/
.env*.local
.DS_Store
*.log
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: succeeds, creates `node_modules/` and `package-lock.json`. May print warnings for Tailwind v4 beta — acceptable.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json next.config.mjs jsconfig.json postcss.config.mjs .gitignore
git commit -m "chore: scaffold Next.js 15 project with Tailwind v4 + Framer Motion"
```

---

## Task 2: Globals.css with design tokens + Tailwind v4

**Files:**
- Create: `app/globals.css`

- [ ] **Step 1: Write `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-primary: #008000;
  --color-primary-deep: #003d00;
  --color-primary-soft: #4a9b4a;
  --color-gold: #d4af37;
  --color-gold-soft: #e6c869;
  --color-bg: #f7f9f5;
  --color-bg-deep: #ffffff;
  --color-fg: #0a0f0a;
  --color-fg-soft: #3a4438;

  --font-display: var(--font-playfair), Georgia, serif;
  --font-body: var(--font-inter), system-ui, sans-serif;

  --ease-cinematic: cubic-bezier(0.22, 1, 0.36, 1);
}

:root {
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-border: rgba(0, 128, 0, 0.12);
  --glass-blur: 16px;
  color-scheme: light;
}

[data-theme="dark"], .dark {
  --color-bg: #0a0f0a;
  --color-bg-deep: #050805;
  --color-fg: #f4f7f1;
  --color-fg-soft: #b8c2b3;
  --glass-bg: rgba(10, 15, 10, 0.55);
  --glass-border: rgba(212, 175, 55, 0.18);
  color-scheme: dark;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

body {
  min-height: 100vh;
  overflow-x: hidden;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
  cursor: pointer;
}

::selection {
  background: var(--color-primary);
  color: #fff;
}

.font-display {
  font-family: var(--font-display);
  letter-spacing: -0.01em;
}

.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  border: 1px solid var(--glass-border);
}

.text-balance {
  text-wrap: balance;
}

.gradient-fade-down {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.15) 35%,
    rgba(0, 0, 0, 0.55) 70%,
    var(--color-bg) 100%
  );
}

.dark .gradient-fade-down {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.3) 35%,
    rgba(0, 0, 0, 0.75) 70%,
    var(--color-bg) 100%
  );
}

.dark-overlay {
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0.35) 60%,
    rgba(0, 0, 0, 0.65) 100%
  );
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: 999px;
  border: 2px solid var(--color-bg);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-deep);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "style: add Tailwind v4 globals with luxury nature design tokens"
```

---

## Task 3: Mock data files

**Files:**
- Create: `lib/mock/categories.js`
- Create: `lib/mock/heroes.js`

- [ ] **Step 1: Write `lib/mock/categories.js`**

```js
export const categories = [
  {
    slug: 'animals',
    name: 'Animals',
    labels: ['Mammals', 'Reptiles', 'Amphibians', 'Fish', 'IUCN Redlist'],
  },
  {
    slug: 'plants',
    name: 'Plants',
    labels: ['Trees', 'Shrubs', 'Herbs', 'Vines'],
  },
  {
    slug: 'birds',
    name: 'Birds',
    labels: ['Basal', 'Waterfowl', 'Coastal', 'Raptors', 'Land', 'Song'],
  },
  {
    slug: 'insects',
    name: 'Insects',
    labels: [
      'Porifera',
      'Cnidaria',
      'Platyhelminthes',
      'Nematoda',
      'Annelida',
      'Mollusca',
      'Arthropoda',
      'Echinodermata',
    ],
  },
  {
    slug: 'posts',
    name: 'Posts',
    labels: ['How', 'Why', 'Tourism', 'Conservation', 'Articles'],
  },
];

export const navItems = [
  { name: 'Home', href: '/' },
  ...categories.map((c) => ({ name: c.name, href: `/${c.slug}` })),
];

export const allLabels = categories.flatMap((c) =>
  c.labels.map((label) => ({ label, category: c.name, slug: c.slug }))
);
```

- [ ] **Step 2: Write `lib/mock/heroes.js`**

```js
export const heroes = [
  {
    id: 1,
    type: 'image',
    src: '/hero/savanna.jpg',
    palette: { from: '#5e2a0a', via: '#a85820', to: '#f4c46b' },
    accent: '#d4af37',
    subject: 'lion',
    title: 'Pride of the Savanna',
    description:
      'Where golden grasslands stretch beyond the horizon, the lion\u2019s gaze defines the wild.',
    cta: { label: 'Explore', href: '/animals/mammals' },
  },
  {
    id: 2,
    type: 'video',
    src: '/hero/canopy.mp4',
    palette: { from: '#031a0d', via: '#0c4a1a', to: '#3aa15a' },
    accent: '#d4af37',
    subject: 'forest',
    title: 'The Living Canopy',
    description:
      'Beneath endless emerald layers, an entire universe breathes, hunts, and grows in silence.',
    cta: { label: 'Explore', href: '/plants/trees' },
  },
  {
    id: 3,
    type: 'image',
    src: '/hero/eagle.jpg',
    palette: { from: '#0a1a3a', via: '#1f4a8a', to: '#a8d0f5' },
    accent: '#d4af37',
    subject: 'eagle',
    title: 'Sovereign Skies',
    description:
      'High above mountain ridges, the raptor commands every current of wind and light.',
    cta: { label: 'Explore', href: '/birds/raptors' },
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add lib/mock/categories.js lib/mock/heroes.js
git commit -m "feat: add mock category structure and 3 demo hero items"
```

---

## Task 4: Theme provider + root layout

**Files:**
- Create: `components/providers/ThemeProvider.jsx`
- Create: `app/layout.jsx`

- [ ] **Step 1: Write `components/providers/ThemeProvider.jsx`**

```jsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      themes={['light', 'dark']}
    >
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 2: Write `app/layout.jsx`**

```jsx
import { Inter, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Navbar } from '@/components/nav/Navbar';
import { Footer } from '@/components/footer/Footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '700', '900'],
});

export const metadata = {
  title: {
    default: 'Wildlife Universe',
    template: '%s | Wildlife Universe',
  },
  description:
    'A modern luxury wildlife platform exploring animals, plants, birds, and the living world.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f9f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable}`}
    >
      <body>
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/providers/ThemeProvider.jsx app/layout.jsx
git commit -m "feat: add root layout with theme provider, fonts, and metadata"
```

---

## Task 5: UI primitives (Container, GlassPanel, Button)

**Files:**
- Create: `components/ui/Container.jsx`
- Create: `components/ui/GlassPanel.jsx`
- Create: `components/ui/Button.jsx`

- [ ] **Step 1: Write `components/ui/Container.jsx`**

```jsx
export function Container({ children, className = '', as: Tag = 'div' }) {
  return (
    <Tag className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 2: Write `components/ui/GlassPanel.jsx`**

```jsx
export function GlassPanel({ children, className = '', as: Tag = 'div' }) {
  return (
    <Tag className={`glass rounded-2xl ${className}`}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 3: Write `components/ui/Button.jsx`**

```jsx
import Link from 'next/link';

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed';

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

const variantStyles = {
  primary:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-deep)] hover:scale-[1.02] shadow-lg shadow-[var(--color-primary)]/30',
  ghost:
    'glass text-[var(--color-fg)] hover:bg-white/10 hover:scale-[1.02]',
  gold:
    'bg-[var(--color-gold)] text-[#1a1208] hover:bg-[var(--color-gold-soft)] hover:scale-[1.02] shadow-lg shadow-[var(--color-gold)]/30',
};

export function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  onClick,
  disabled,
  ...rest
}) {
  const cls = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/
git commit -m "feat: add Container, GlassPanel, and Button primitives"
```

---

## Task 6: Navbar (Navbar + ThemeToggle + SearchToggle)

**Files:**
- Create: `components/nav/ThemeToggle.jsx`
- Create: `components/nav/SearchToggle.jsx`
- Create: `components/nav/Navbar.jsx`

- [ ] **Step 1: Write `components/nav/ThemeToggle.jsx`**

```jsx
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

const order = ['light', 'dark', 'system'];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="glass flex h-10 w-10 items-center justify-center rounded-full"
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  const current = theme || 'system';
  const next = order[(order.indexOf(current) + 1) % order.length];
  const Icon = current === 'light' ? Sun : current === 'dark' ? Moon : Monitor;

  return (
    <button
      aria-label={`Theme: ${current}. Click to switch to ${next}.`}
      onClick={() => setTheme(next)}
      className="glass group flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 hover:border-[var(--color-primary)]"
    >
      <Icon className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" />
    </button>
  );
}
```

- [ ] **Step 2: Write `components/nav/SearchToggle.jsx`**

```jsx
'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SearchToggle() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKey);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        aria-label="Open search"
        onClick={() => setOpen(true)}
        className="glass flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 hover:border-[var(--color-primary)]"
      >
        <Search className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 pt-24 backdrop-blur-md sm:pt-32"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass overflow-hidden rounded-2xl">
                <div className="flex items-center gap-3 px-5 py-4">
                  <Search className="h-5 w-5 text-[var(--color-primary)]" />
                  <input
                    autoFocus
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search animals, plants, birds, posts\u2026"
                    className="flex-1 bg-transparent text-base outline-none placeholder:text-[var(--color-fg-soft)]"
                  />
                  <button
                    aria-label="Close search"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-1.5 transition-colors hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="border-t border-[var(--glass-border)] px-5 py-6 text-sm text-[var(--color-fg-soft)]">
                  {query ? (
                    <p>
                      No results yet \u2014 search will be live in the next round.
                    </p>
                  ) : (
                    <p>Start typing to search across the platform.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 3: Write `components/nav/Navbar.jsx`**

```jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { navItems } from '@/lib/mock/categories';
import { ThemeToggle } from './ThemeToggle';
import { SearchToggle } from './SearchToggle';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const [logoOk, setLogoOk] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'glass border-b border-[var(--glass-border)] py-2 shadow-lg shadow-black/5'
            : 'border-b border-transparent py-3'
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="Wildlife Universe home"
            className="flex items-center gap-2"
          >
            {logoOk ? (
              <Image
                src="/logo.png"
                alt="Wildlife Universe"
                width={180}
                height={48}
                priority
                className="h-10 w-auto sm:h-11"
                onError={() => setLogoOk(false)}
              />
            ) : (
              <span className="font-display text-xl font-bold tracking-tight text-[var(--color-primary)] sm:text-2xl">
                Wildlife Universe
              </span>
            )}
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 md:flex"
          >
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-fg)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {item.name}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--color-primary)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <SearchToggle />
            <ThemeToggle />
            <button
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen((o) => !o)}
              className="glass flex h-10 w-10 items-center justify-center rounded-full md:hidden"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="ml-auto flex h-full w-[80vw] max-w-sm flex-col gap-1 bg-[var(--color-bg)] p-6 pt-24 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl px-4 py-3 text-lg font-medium transition-colors ${
                      active
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'text-[var(--color-fg)] hover:bg-[var(--color-primary)]/5'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div aria-hidden className="h-16" />
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/nav/
git commit -m "feat: add sticky glass navbar with theme toggle, search overlay, mobile drawer"
```

---

## Task 7: Footer

**Files:**
- Create: `components/footer/Footer.jsx`

- [ ] **Step 1: Write `components/footer/Footer.jsx`**

```jsx
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { allLabels } from '@/lib/mock/categories';

const legal = [
  { name: 'Privacy Policy', href: '/legal/privacy' },
  { name: 'Terms & Conditions', href: '/legal/terms' },
  { name: 'EEAT (Editorial Policy)', href: '/legal/eeat' },
  { name: 'Cookies Policy', href: '/legal/cookies' },
  { name: 'Cache Policy', href: '/legal/cache' },
  { name: 'Fact Checking Policy', href: '/legal/fact-checking' },
  { name: 'Wildlife Universe Team', href: '/legal/team' },
];

const quick = [
  { name: 'Home', href: '/' },
  { name: 'Popular Posts', href: '/posts' },
  { name: 'About Us', href: '/about' },
  { name: 'Contact Us', href: '/contact' },
  { name: 'Advertise', href: '/advertise' },
  { name: 'Sitemap', href: '/sitemap' },
  { name: 'RSS Feed', href: '/rss' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-[var(--glass-border)] bg-gradient-to-b from-transparent to-[var(--color-bg-deep)]">
      <Container className="py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <FooterColumn title="Legal">
            <ul className="space-y-2.5">
              {legal.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[var(--color-fg-soft)] transition-colors hover:text-[var(--color-primary)]"
                  >
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterColumn>

          <FooterColumn title="Quick Links">
            <ul className="space-y-2.5">
              {quick.map((q) => (
                <li key={q.href}>
                  <Link
                    href={q.href}
                    className="text-sm text-[var(--color-fg-soft)] transition-colors hover:text-[var(--color-primary)]"
                  >
                    {q.name}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterColumn>

          <FooterColumn title="Explore Labels">
            <div className="flex flex-wrap gap-2">
              {allLabels.map(({ label, slug }) => (
                <Link
                  key={`${slug}-${label}`}
                  href={`/${slug}`}
                  className="glass rounded-full px-3 py-1 text-xs text-[var(--color-fg-soft)] transition-all hover:scale-105 hover:text-[var(--color-primary)]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </FooterColumn>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-[var(--glass-border)] pt-8 md:flex-row md:items-center">
          <div>
            <p className="font-display text-xl font-bold text-[var(--color-primary)]">
              Wildlife Universe
            </p>
            <p className="text-xs text-[var(--color-fg-soft)]">
              A modern luxury wildlife platform.
            </p>
          </div>
          <p className="text-xs text-[var(--color-fg-soft)]">
            &copy; {year} Wildlife Universe. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div>
      <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-[var(--color-primary)]">
        {title}
      </h3>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/footer/Footer.jsx
git commit -m "feat: add 3-column footer with dynamic labels"
```

---

## Task 8: Hero system (Placeholder, Slide, Controls, Carousel)

**Files:**
- Create: `components/hero/HeroPlaceholder.jsx`
- Create: `components/hero/HeroSlide.jsx`
- Create: `components/hero/HeroControls.jsx`
- Create: `components/hero/HeroCarousel.jsx`

- [ ] **Step 1: Write `components/hero/HeroPlaceholder.jsx`**

```jsx
const subjectShapes = {
  lion: (accent) => (
    <g>
      <ellipse cx="500" cy="600" rx="160" ry="40" fill="rgba(0,0,0,0.25)" />
      <circle cx="500" cy="430" r="170" fill={accent} opacity="0.92" />
      <circle cx="430" cy="290" r="60" fill={accent} opacity="0.92" />
      <circle cx="570" cy="290" r="60" fill={accent} opacity="0.92" />
      <circle cx="450" cy="410" r="14" fill="rgba(0,0,0,0.7)" />
      <circle cx="550" cy="410" r="14" fill="rgba(0,0,0,0.7)" />
      <path d="M470 490 Q500 520 530 490" stroke="rgba(0,0,0,0.7)" strokeWidth="6" fill="none" strokeLinecap="round" />
    </g>
  ),
  forest: (accent) => (
    <g>
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 100 + i * 100;
        const h = 220 + ((i * 37) % 130);
        return (
          <g key={i}>
            <rect x={x - 12} y={620 - h * 0.3} width="24" height={h * 0.3} fill="#3a2410" opacity="0.85" />
            <ellipse cx={x} cy={620 - h * 0.3} rx="70" ry={h * 0.55} fill={accent} opacity={0.55 + (i % 3) * 0.15} />
          </g>
        );
      })}
    </g>
  ),
  eagle: (accent) => (
    <g>
      <path
        d="M500 380 L380 320 L420 360 L300 340 L380 400 L260 420 L380 440 L300 500 L420 480 L380 520 L500 460 L620 520 L580 480 L700 500 L620 440 L740 420 L620 400 L700 340 L580 360 L620 320 Z"
        fill={accent}
        opacity="0.95"
      />
      <circle cx="500" cy="400" r="28" fill="#1a1208" />
      <circle cx="500" cy="395" r="6" fill={accent} />
    </g>
  ),
};

export function HeroPlaceholder({ palette, accent, subject, animate = false }) {
  const Shape = subjectShapes[subject] || subjectShapes.forest;
  const gradientId = `bg-${subject}`;
  const sunId = `sun-${subject}`;

  return (
    <svg
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="55%" stopColor={palette.via} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
        <radialGradient id={sunId} cx="0.7" cy="0.3" r="0.5">
          <stop offset="0%" stopColor="rgba(255,235,180,0.85)" />
          <stop offset="60%" stopColor="rgba(255,200,120,0.15)" />
          <stop offset="100%" stopColor="rgba(255,200,120,0)" />
        </radialGradient>
      </defs>
      <rect width="1000" height="700" fill={`url(#${gradientId})`} />
      <rect width="1000" height="700" fill={`url(#${sunId})`} />
      {animate && (
        <g opacity="0.35">
          {Array.from({ length: 25 }).map((_, i) => (
            <circle
              key={i}
              cx={(i * 73) % 1000}
              cy={(i * 137) % 700}
              r={1 + (i % 3)}
              fill="#fff"
            >
              <animate
                attributeName="opacity"
                values="0.2;0.9;0.2"
                dur={`${3 + (i % 4)}s`}
                begin={`${(i * 0.2) % 4}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>
      )}
      {Shape(accent)}
      <rect width="1000" height="700" fill="url(#dark-overlay-grad)" />
      <defs>
        <linearGradient id="dark-overlay-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.15)" />
          <stop offset="60%" stopColor="rgba(0,0,0,0.4)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.7)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
```

- [ ] **Step 2: Write `components/hero/HeroSlide.jsx`**

```jsx
'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { HeroPlaceholder } from './HeroPlaceholder';

const titleContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const titleChar = {
  hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.4 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

function AnimatedTitle({ text, isVideo }) {
  const className = isVideo
    ? 'font-display text-4xl font-black leading-[0.95] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] sm:text-5xl md:text-6xl lg:text-7xl text-balance'
    : 'font-display text-4xl font-black leading-[0.95] text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.7)] sm:text-6xl md:text-7xl lg:text-8xl text-balance';

  return (
    <motion.h1
      key={text}
      variants={titleContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {text.split(' ').map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split('').map((ch, ci) => (
            <motion.span key={ci} variants={titleChar} className="inline-block">
              {ch}
            </motion.span>
          ))}
          {wi < text.split(' ').length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </motion.h1>
  );
}

function MediaLayer({ slide, isActive }) {
  if (slide.type === 'video') {
    return (
      <>
        <HeroPlaceholder
          palette={slide.palette}
          accent={slide.accent}
          subject={slide.subject}
          animate
        />
        <video
          key={slide.src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster=""
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 data-[loaded=true]:opacity-100"
          onLoadedData={(e) => {
            if (e.currentTarget.videoWidth > 0) {
              e.currentTarget.dataset.loaded = 'true';
            }
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src={slide.src} type="video/mp4" />
        </video>
      </>
    );
  }
  return (
    <>
      <HeroPlaceholder
        palette={slide.palette}
        accent={slide.accent}
        subject={slide.subject}
      />
      {/* Image element will gracefully fail and SVG remains visible */}
      <img
        src={slide.src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 data-[loaded=true]:opacity-100"
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth > 1) {
            e.currentTarget.dataset.loaded = 'true';
          }
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </>
  );
}

export function HeroSlide({ slide, isActive }) {
  const isVideo = slide.type === 'video';
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <MediaLayer slide={slide} isActive={isActive} />
      </div>

      <div className="absolute inset-0 dark-overlay" aria-hidden="true" />

      {isActive && (
        <div className="absolute inset-0 flex flex-col">
          {/* Title placement */}
          {isVideo ? (
            <div className="mt-auto flex flex-col items-start gap-5 px-6 pb-28 sm:px-12 sm:pb-32 lg:px-20 lg:pb-36 max-w-4xl">
              <AnimatedTitle text={slide.title} isVideo />
              <motion.p
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="max-w-2xl text-base text-white/85 sm:text-lg md:text-xl text-balance"
              >
                {slide.description}
              </motion.p>
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={1}
                className="flex flex-wrap items-center gap-3"
              >
                <Link
                  href={slide.cta.href}
                  className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-medium text-white shadow-xl shadow-[var(--color-primary)]/40 transition-all duration-300 hover:scale-[1.03] hover:bg-[var(--color-primary-deep)]"
                >
                  {slide.cta.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            </div>
          ) : (
            <>
              <div className="mt-[18vh] flex justify-center px-6 sm:mt-[20vh]">
                <AnimatedTitle text={slide.title} isVideo={false} />
              </div>
              <div className="mt-auto flex flex-col items-start gap-5 px-6 pb-28 sm:px-12 sm:pb-32 lg:px-20 lg:pb-36 max-w-4xl">
                <motion.p
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={0}
                  className="max-w-2xl text-base text-white/85 sm:text-lg md:text-xl text-balance"
                >
                  {slide.description}
                </motion.p>
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                  className="flex flex-wrap items-center gap-3"
                >
                  <Link
                    href={slide.cta.href}
                    className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-medium text-white shadow-xl shadow-[var(--color-primary)]/40 transition-all duration-300 hover:scale-[1.03] hover:bg-[var(--color-primary-deep)]"
                  >
                    {slide.cta.label}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `components/hero/HeroControls.jsx`**

```jsx
'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

export function HeroControls({
  count,
  index,
  onPrev,
  onNext,
  onJump,
  playing,
  onTogglePlay,
}) {
  return (
    <>
      <button
        aria-label="Previous slide"
        onClick={onPrev}
        className="glass absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full p-3 text-white opacity-0 transition-all duration-300 group-hover/hero:opacity-100 hover:scale-110 hover:bg-[var(--color-primary)]/40 sm:left-6 md:flex"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        aria-label="Next slide"
        onClick={onNext}
        className="glass absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full p-3 text-white opacity-0 transition-all duration-300 group-hover/hero:opacity-100 hover:scale-110 hover:bg-[var(--color-primary)]/40 sm:right-6 md:flex"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <button
        aria-label={playing ? 'Pause autoplay' : 'Play autoplay'}
        onClick={onTogglePlay}
        className="glass absolute right-4 top-24 z-20 flex h-9 w-9 items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:bg-[var(--color-primary)]/40 sm:right-6"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>

      <div
        role="tablist"
        aria-label="Hero slide selector"
        className="absolute inset-x-0 bottom-10 z-20 flex justify-center gap-2 sm:bottom-12"
      >
        {Array.from({ length: count }).map((_, i) => {
          const active = i === index;
          return (
            <button
              key={i}
              role="tab"
              aria-selected={active}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => onJump(i)}
              className={`h-2 rounded-full transition-all duration-500 ${
                active
                  ? 'w-10 bg-[var(--color-primary)]'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          );
        })}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Write `components/hero/HeroCarousel.jsx`**

```jsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroSlide } from './HeroSlide';
import { HeroControls } from './HeroControls';

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 60;

export function HeroCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const liveRef = useRef(null);

  const count = slides.length;

  const goTo = useCallback(
    (next) => {
      setDirection(next > index ? 1 : -1);
      setIndex(((next % count) + count) % count);
    },
    [index, count]
  );

  const next = useCallback(() => {
    setDirection(1);
    setIndex((i) => (i + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  // Autoplay
  useEffect(() => {
    if (!playing || hovered) return;
    const id = window.setInterval(next, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [playing, hovered, next]);

  // Pause when tab hidden
  useEffect(() => {
    const onVis = () => setPlaying(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // Live region announcement
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent = `Slide ${index + 1} of ${count}: ${slides[index].title}`;
    }
  }, [index, count, slides]);

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0.6 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0.6 }),
  };

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured wildlife"
      className="group/hero relative h-[100svh] min-h-[600px] w-full overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Adjacent peeks (desktop only) */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 z-10 hidden w-[8%] cursor-pointer opacity-50 transition-opacity hover:opacity-90 lg:block"
        onClick={prev}
      >
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute inset-0 origin-right scale-90">
            <HeroSlide slide={slides[(index - 1 + count) % count]} isActive={false} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
        </div>
      </div>
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 z-10 hidden w-[8%] cursor-pointer opacity-50 transition-opacity hover:opacity-90 lg:block"
        onClick={next}
      >
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute inset-0 origin-left scale-90">
            <HeroSlide slide={slides[(index + 1) % count]} isActive={false} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-l from-black/70 to-transparent" />
        </div>
      </div>

      {/* Active slide */}
      <div className="absolute inset-y-0 left-0 right-0 lg:left-[8%] lg:right-[8%]">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={slides[index].id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) next();
              else if (info.offset.x > SWIPE_THRESHOLD) prev();
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <HeroSlide slide={slides[index]} isActive />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom glass fade into next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/4 gradient-fade-down"
      />

      <HeroControls
        count={count}
        index={index}
        onPrev={prev}
        onNext={next}
        onJump={goTo}
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
      />

      <div ref={liveRef} aria-live="polite" className="sr-only" />
    </section>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/hero/
git commit -m "feat: add cinematic hero carousel with SVG placeholders, autoplay, swipe, keyboard"
```

---

## Task 9: Home page

**Files:**
- Create: `app/page.jsx`

- [ ] **Step 1: Write `app/page.jsx`**

```jsx
import { HeroCarousel } from '@/components/hero/HeroCarousel';
import { Container } from '@/components/ui/Container';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { categories } from '@/lib/mock/categories';
import { heroes } from '@/lib/mock/heroes';
import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';

export default function HomePage() {
  return (
    <>
      <div className="-mt-16">
        <HeroCarousel slides={heroes} />
      </div>

      <section className="relative py-24">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[var(--color-primary)]">
              <Compass className="h-3.5 w-3.5" /> A Living Atlas
            </p>
            <h2 className="font-display text-4xl font-black leading-tight sm:text-5xl md:text-6xl text-balance">
              Step into a curated universe of the wild.
            </h2>
            <p className="mt-6 text-base text-[var(--color-fg-soft)] sm:text-lg text-balance">
              Cinematic stories, expert-led research, and breathtaking visuals \u2014 a
              modern lens on the species and ecosystems that shape our planet.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} className="group block">
                <GlassPanel className="flex h-full flex-col gap-3 p-6 transition-all duration-500 hover:scale-[1.03] hover:border-[var(--color-primary)]/40 hover:shadow-2xl hover:shadow-[var(--color-primary)]/15">
                  <span className="font-display text-2xl font-black text-[var(--color-primary)]">
                    {c.name}
                  </span>
                  <span className="text-xs text-[var(--color-fg-soft)]">
                    {c.labels.length} categories
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-fg)] transition-transform group-hover:translate-x-1">
                    Explore <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </GlassPanel>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.jsx
git commit -m "feat: add home page with hero carousel and category grid"
```

---

## Task 10: Sample /animals page + placeholder route stubs

**Files:**
- Create: `app/animals/page.jsx`
- Create: `app/plants/page.jsx`
- Create: `app/birds/page.jsx`
- Create: `app/insects/page.jsx`
- Create: `app/posts/page.jsx`

- [ ] **Step 1: Write `app/animals/page.jsx`**

```jsx
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { categories } from '@/lib/mock/categories';
import { ArrowRight } from 'lucide-react';

export const metadata = { title: 'Animals' };

const placeholderCards = [
  {
    title: 'The Last of the Snow Leopards',
    blurb: 'High in the Himalayas, an elusive predator clings to its disappearing world.',
    label: 'Mammals',
  },
  {
    title: 'Why the Komodo Still Reigns',
    blurb: 'On a handful of Indonesian islands, a prehistoric apex hunter writes its final chapter.',
    label: 'Reptiles',
  },
  {
    title: 'Glass Frogs and the Art of Vanishing',
    blurb: 'Translucent skin, silent leaps \u2014 the camouflage strategy of a forgotten amphibian.',
    label: 'Amphibians',
  },
  {
    title: 'Tracking the Bluefin Migration',
    blurb: 'A 5,000-mile journey across the Atlantic, traced from satellite tag to spawning ground.',
    label: 'Fish',
  },
  {
    title: 'IUCN Redlist: 2026 Watch',
    blurb: 'Twelve species crossed from vulnerable to endangered in the past year. Here\u2019s why.',
    label: 'IUCN Redlist',
  },
  {
    title: 'The Quiet Comeback of the Wolf',
    blurb: 'Across Yellowstone and the Apennines, an ancient predator reshapes a continent.',
    label: 'Mammals',
  },
];

export default function AnimalsPage() {
  const animals = categories.find((c) => c.slug === 'animals');

  return (
    <>
      <section className="relative flex h-[40vh] min-h-[300px] items-end overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-[#031a0d] via-[#0c4a1a] to-[#3aa15a]"
        />
        <div aria-hidden className="absolute inset-0 dark-overlay" />
        <Container className="relative z-10 pb-12">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-white/80 backdrop-blur">
            Category
          </p>
          <h1 className="font-display text-5xl font-black text-white sm:text-6xl md:text-7xl text-balance">
            Animals
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/80 sm:text-lg text-balance">
            From apex predators to the smallest invertebrates \u2014 stories from the
            mammalian, reptilian, and aquatic worlds.
          </p>
        </Container>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 gradient-fade-down"
        />
      </section>

      <section className="py-12">
        <Container>
          <div className="flex flex-wrap gap-2">
            {animals.labels.map((label) => (
              <span
                key={label}
                className="glass rounded-full px-4 py-2 text-sm font-medium text-[var(--color-fg)] transition-all hover:scale-105 hover:border-[var(--color-primary)]"
              >
                {label}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {placeholderCards.map((card, i) => (
              <article
                key={i}
                className="group block"
              >
                <GlassPanel className="flex h-full flex-col overflow-hidden p-0 transition-all duration-500 hover:scale-[1.02] hover:border-[var(--color-primary)]/40 hover:shadow-2xl hover:shadow-[var(--color-primary)]/15">
                  <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[var(--color-primary-deep)] via-[var(--color-primary)] to-[var(--color-gold)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_60%)]" />
                    <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                      {card.label}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <h3 className="font-display text-xl font-bold leading-snug text-balance">
                      {card.title}
                    </h3>
                    <p className="text-sm text-[var(--color-fg-soft)] text-balance">
                      {card.blurb}
                    </p>
                    <button
                      type="button"
                      disabled
                      className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--color-fg-soft)]/15 px-4 py-2 text-xs font-medium text-[var(--color-fg-soft)]"
                    >
                      View Post (coming soon)
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </GlassPanel>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Write a stub-page helper inline (no shared file — DRY would be theatre for 4 nearly-identical 20-line pages)**

Each placeholder route uses the same structure with substituted name/blurb. Write each independently below.

- [ ] **Step 3: Write `app/plants/page.jsx`**

```jsx
import { Container } from '@/components/ui/Container';
import { GlassPanel } from '@/components/ui/GlassPanel';

export const metadata = { title: 'Plants' };

export default function PlantsPage() {
  return (
    <section className="py-32">
      <Container>
        <GlassPanel className="mx-auto max-w-2xl p-12 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-primary)]">
            Coming soon
          </p>
          <h1 className="font-display text-4xl font-black sm:text-5xl">Plants</h1>
          <p className="mt-4 text-[var(--color-fg-soft)]">
            Trees, shrubs, herbs, and vines \u2014 this category opens in the next round
            of the build.
          </p>
        </GlassPanel>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: Write `app/birds/page.jsx`**

```jsx
import { Container } from '@/components/ui/Container';
import { GlassPanel } from '@/components/ui/GlassPanel';

export const metadata = { title: 'Birds' };

export default function BirdsPage() {
  return (
    <section className="py-32">
      <Container>
        <GlassPanel className="mx-auto max-w-2xl p-12 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-primary)]">
            Coming soon
          </p>
          <h1 className="font-display text-4xl font-black sm:text-5xl">Birds</h1>
          <p className="mt-4 text-[var(--color-fg-soft)]">
            Basal, waterfowl, coastal, raptors, land, song \u2014 this category opens
            in the next round of the build.
          </p>
        </GlassPanel>
      </Container>
    </section>
  );
}
```

- [ ] **Step 5: Write `app/insects/page.jsx`**

```jsx
import { Container } from '@/components/ui/Container';
import { GlassPanel } from '@/components/ui/GlassPanel';

export const metadata = { title: 'Insects' };

export default function InsectsPage() {
  return (
    <section className="py-32">
      <Container>
        <GlassPanel className="mx-auto max-w-2xl p-12 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-primary)]">
            Coming soon
          </p>
          <h1 className="font-display text-4xl font-black sm:text-5xl">Insects</h1>
          <p className="mt-4 text-[var(--color-fg-soft)]">
            Eight phyla of invertebrate life \u2014 this category opens in the next
            round of the build.
          </p>
        </GlassPanel>
      </Container>
    </section>
  );
}
```

- [ ] **Step 6: Write `app/posts/page.jsx`**

```jsx
import { Container } from '@/components/ui/Container';
import { GlassPanel } from '@/components/ui/GlassPanel';

export const metadata = { title: 'Posts' };

export default function PostsPage() {
  return (
    <section className="py-32">
      <Container>
        <GlassPanel className="mx-auto max-w-2xl p-12 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-primary)]">
            Coming soon
          </p>
          <h1 className="font-display text-4xl font-black sm:text-5xl">Posts</h1>
          <p className="mt-4 text-[var(--color-fg-soft)]">
            How, why, tourism, conservation, articles \u2014 the post system opens in
            the next round of the build.
          </p>
        </GlassPanel>
      </Container>
    </section>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add app/animals app/plants app/birds app/insects app/posts
git commit -m "feat: add /animals showcase page and placeholder routes for other categories"
```

---

## Task 11: README + final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
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
app/                  # Next.js App Router routes
components/
  hero/               # Carousel system
  nav/                # Sticky glass navbar
  footer/             # Dynamic footer
  ui/                 # Container, GlassPanel, Button primitives
  providers/          # Theme provider
lib/mock/             # Mock data (heroes, categories)
docs/superpowers/     # Design spec + implementation plan
public/               # Logo, favicon, optional hero media
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

Private \u2014 all rights reserved.
```

- [ ] **Step 2: Run production build to catch any compile errors**

Run: `npm run build`
Expected: builds successfully. Should print route table including `/`, `/animals`, `/plants`, `/birds`, `/insects`, `/posts`. Warnings about Tailwind v4 beta or `Image` `priority` are acceptable. Errors are not.

If build fails, fix the reported issue(s) and re-run before committing.

- [ ] **Step 3: Start dev server and smoke test**

Run: `npm run dev`
Open in browser: http://localhost:3000

Manually verify the **Acceptance Criteria from the spec**:

1. Hero carousel auto-advances through 3 slides (image / video / image layout rules visible)
2. Chevron buttons appear on hover and navigate
3. Dot indicators clickable, active dot is wide and primary green
4. Click on adjacent peek (≥1024px viewport) promotes that slide
5. Drag/swipe on mobile viewport (DevTools responsive mode) advances
6. Keyboard: Left/Right arrows cycle slides; Space toggles play/pause
7. Pause/play button works (top-right of hero)
8. Nav: transparent at top, glass on scroll, all 6 links route correctly
9. Theme toggle cycles light → dark → system → light, persists on reload
10. Search icon opens overlay; type something, press Esc to close
11. Footer shows three columns; column 3 lists every label from `lib/mock/categories.js`
12. `/animals` shows category hero, label chips, 6 glass cards
13. `/plants`, `/birds`, `/insects`, `/posts` show "coming soon" placeholder
14. Resize to 375px: nav collapses to hamburger, drawer slides in from right, footer stacks
15. No console errors (warnings about deprecated `priority` or hydration are acceptable; component errors are not)

Stop the dev server with Ctrl+C when done.

- [ ] **Step 4: Final commit + tag**

```bash
git add README.md
git commit -m "docs: add README with setup, media replacement, and roadmap"
git tag -a v0.1.0-foundation -m "Round 1: offline showcase shell"
```

---

## Final Acceptance

When all 11 tasks above are complete:

- [ ] All committed cleanly to git (no untracked files except `node_modules/`, `.next/`)
- [ ] `npm run build` succeeds
- [ ] `npm run dev` opens a polished, cinematic Wildlife Universe experience at localhost:3000
- [ ] All 15 smoke-test items in Task 11 pass

Round 1 complete. Round 2 (real hero CMS + media pipeline) starts in a new spec.

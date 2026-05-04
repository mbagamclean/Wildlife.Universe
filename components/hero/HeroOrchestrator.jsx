'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/storage/db';
import { HERO_MODE } from '@/lib/storage/keys';
import { HeroProvider } from './HeroContext';
import { HeroCarousel } from './HeroCarousel';
import { FeaturedHeroCarousel } from './FeaturedHeroCarousel';
import { NetflixRowCarousel } from './NetflixRowCarousel';

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SUBJECTS = ['lion', 'forest', 'eagle'];

function postToSlide(post, idx) {
  return {
    id: post.id,
    type: 'image',
    src: post.cover || '',
    palette: post.coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' },
    accent: '#d4af37',
    subject: SUBJECTS[idx % SUBJECTS.length],
    title: post.title,
    description: post.description,
    cta: { label: 'View Post', href: `/posts/${post.slug}` },
  };
}

export function HeroOrchestrator() {
  const [state, setState] = useState({
    ready: false,
    mode: HERO_MODE.DEFAULT,
    slides: [],
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const mode = await db.mode.get();
      let slides = [];

      if (mode === HERO_MODE.FEATURED) {
        const featured = await db.posts.listFeatured();
        const picked = shuffle(featured).slice(0, 5);
        if (picked.length > 0) {
          slides = picked.map(postToSlide);
        } else {
          // graceful fallback to default heroes
          slides = (await db.heroes.list())
            .filter((h) => h.active !== false)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        }
      } else {
        slides = (await db.heroes.list())
          .filter((h) => h.active !== false)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      }

      if (!cancelled) setState({ ready: true, mode, slides });
    };

    load();

    const onChange = () => load();
    window.addEventListener('wu:storage-changed', onChange);
    window.addEventListener('storage', onChange);

    return () => {
      cancelled = true;
      window.removeEventListener('wu:storage-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  if (!state.ready) {
    return (
      <div className="relative h-[100svh] min-h-[600px] w-full overflow-hidden bg-gradient-to-br from-[#031a0d] via-[#0c4a1a] to-[#3aa15a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,235,180,0.15),transparent_60%)]" />
      </div>
    );
  }

  if (state.slides.length === 0) {
    return (
      <div className="relative flex h-[100svh] min-h-[600px] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#031a0d] via-[#0c4a1a] to-[#3aa15a] text-center text-white">
        <div className="px-6">
          <h1 className="font-display text-4xl font-black sm:text-5xl">
            No hero items yet
          </h1>
          <p className="mt-2 text-white/70">
            Sign in as the CEO and add hero items in the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <HeroProvider slides={state.slides}>
      {state.mode === HERO_MODE.FEATURED
        ? <FeaturedHeroCarousel />
        : <HeroCarousel />}
      <NetflixRowCarousel />
    </HeroProvider>
  );
}

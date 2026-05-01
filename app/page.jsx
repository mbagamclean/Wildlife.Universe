import { HeroOrchestrator } from '@/components/hero/HeroOrchestrator';
import { Container } from '@/components/ui/Container';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { LatestPostsSection } from '@/components/posts/LatestPostsSection';
import { LatestAnimalsSection } from '@/components/animals/LatestAnimalsSection';
import { TrendingSection } from '@/components/posts/TrendingSection';
import { LatestPlantsSection } from '@/components/plants/LatestPlantsSection';
import { IUCNSection } from '@/components/iucn/IUCNSection';
import { LatestBirdsSection } from '@/components/birds/LatestBirdsSection';
import { WhyHowSection } from '@/components/posts/WhyHowSection';
import { BooksSection } from '@/components/posts/BooksSection';
import { ShortsSection } from '@/components/posts/ShortsSection';
import { DocumentariesSection } from '@/components/posts/DocumentariesSection';
import { categories } from '@/lib/mock/categories';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/* Per-category visual identity */
const CAT_META = {
  animals: {
    description: 'Mammals, reptiles, amphibians & more',
    gradient: 'linear-gradient(145deg, #061206 0%, #1a4a10 52%, #3d7a28 100%)',
    accent: '#5dc23a',
    highlight: 'rgba(93,194,58,0.18)',
  },
  plants: {
    description: 'Trees, shrubs, herbs & rare flora',
    gradient: 'linear-gradient(145deg, #031408 0%, #0c3a18 52%, #2a7048 100%)',
    accent: '#3ab860',
    highlight: 'rgba(58,184,96,0.18)',
  },
  birds: {
    description: 'Raptors, songbirds & waterfowl',
    gradient: 'linear-gradient(145deg, #040a1c 0%, #0f2550 52%, #2a5090 100%)',
    accent: '#4a90d8',
    highlight: 'rgba(74,144,216,0.18)',
  },
  insects: {
    description: 'Arthropods, molluscs & invertebrates',
    gradient: 'linear-gradient(145deg, #150900 0%, #3c2000 52%, #7a4a10 100%)',
    accent: '#c88020',
    highlight: 'rgba(200,128,32,0.18)',
  },
  posts: {
    description: 'Conservation, tourism & wildlife stories',
    gradient: 'linear-gradient(145deg, #040d10 0%, #0f2a35 52%, #1a5060 100%)',
    accent: '#30a0b8',
    highlight: 'rgba(48,160,184,0.18)',
  },
};

export default function HomePage() {
  return (
    <>
      <div className="-mt-16">
        <HeroOrchestrator />
      </div>

      {/* ── Latest Posts — fade up ─────────────────────────── */}
      <ScrollReveal effect="fadeUp">
        <LatestPostsSection />
      </ScrollReveal>

      {/* ── Explore Our Categories — zoom in + stagger cards ─ */}
      <ScrollReveal effect="zoomIn">
        <section className="relative py-14 md:py-16" style={{ background: 'var(--color-bg)' }}>
          <Container>
            {/* Header */}
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-[var(--color-fg)] sm:text-4xl md:text-5xl">
                Explore Our Categories
              </h2>
              <p className="mt-3 text-sm text-[var(--color-fg-soft)] sm:text-base">
                Dive into the species and ecosystems that shape our planet
              </p>
            </div>

            {/* Cards — stagger in via CSS once parent is revealed */}
            <div className="flex flex-wrap justify-center gap-5">
              {categories.map((c) => {
                const meta = CAT_META[c.slug] || CAT_META.posts;
                return (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}`}
                    className="wu-stagger-item group relative block w-full overflow-hidden rounded-2xl sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
                    style={{ aspectRatio: '16/10' }}
                  >
                    {/* Background gradient */}
                    <div
                      className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.06]"
                      style={{ background: meta.gradient }}
                    />

                    {/* Radial highlight */}
                    <div
                      className="absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-40"
                      style={{
                        backgroundImage: `
                          radial-gradient(ellipse at 25% 20%, rgba(255,255,255,0.22) 0%, transparent 50%),
                          radial-gradient(ellipse at 75% 80%, ${meta.highlight} 0%, transparent 50%)
                        `,
                      }}
                    />

                    {/* Cinematic bottom scrim */}
                    <div
                      className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-90"
                      style={{
                        background:
                          'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.08) 100%)',
                      }}
                    />

                    {/* Hover darkening */}
                    <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-400 group-hover:bg-black/15" />

                    {/* Content */}
                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                      <h3
                        className="font-display text-xl font-black leading-tight text-white md:text-2xl"
                        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
                      >
                        {c.name}
                      </h3>
                      <p className="mt-1 text-sm text-white/70">{meta.description}</p>

                      <div className="mt-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white transition-all duration-300 group-hover:gap-2.5"
                          style={{
                            background: `${meta.accent}28`,
                            border: `1.5px solid ${meta.accent}55`,
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          Explore
                          <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>

                    {/* Hover glow ring */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{ boxShadow: `inset 0 0 0 1.5px ${meta.accent}55` }}
                    />
                  </Link>
                );
              })}
            </div>
          </Container>
        </section>
      </ScrollReveal>

      {/* ── Latest Animals — slide in from left ───────────── */}
      <ScrollReveal effect="slideLeft">
        <LatestAnimalsSection />
      </ScrollReveal>

      {/* ── Trending — zoom + fade ─────────────────────────── */}
      <ScrollReveal effect="zoomIn">
        <TrendingSection />
      </ScrollReveal>

      {/* ── Latest Plants — slide in from right ───────────── */}
      <ScrollReveal effect="slideRight">
        <LatestPlantsSection />
      </ScrollReveal>

      {/* ── IUCN — blur in (clarity into focus) ───────────── */}
      <ScrollReveal effect="blurIn">
        <IUCNSection />
      </ScrollReveal>

      {/* ── Latest Birds — flip up (taking flight) ────────── */}
      <ScrollReveal effect="flipUp">
        <LatestBirdsSection />
      </ScrollReveal>

      {/* ── Why / How — slide from left ───────────────────── */}
      <ScrollReveal effect="slideLeft">
        <WhyHowSection />
      </ScrollReveal>

      {/* ── Books — rise with scale ────────────────────────── */}
      <ScrollReveal effect="riseScale">
        <BooksSection />
      </ScrollReveal>

      {/* ── Shorts — bounce up ────────────────────────────── */}
      <ScrollReveal effect="bounceUp">
        <ShortsSection />
      </ScrollReveal>

      {/* ── Documentaries — cinematic fade up ─────────────── */}
      <ScrollReveal effect="fadeUp" delay={80}>
        <DocumentariesSection />
      </ScrollReveal>
    </>
  );
}

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
              Cinematic stories, expert-led research, and breathtaking visuals — a
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

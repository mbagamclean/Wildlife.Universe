import { Container } from '@/components/ui/Container';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { categories } from '@/lib/mock/categories';
import { ArrowRight } from 'lucide-react';

export const metadata = { title: 'Animals' };

const placeholderCards = [
  {
    title: 'The Last of the Snow Leopards',
    blurb:
      'High in the Himalayas, an elusive predator clings to its disappearing world.',
    label: 'Mammals',
  },
  {
    title: 'Why the Komodo Still Reigns',
    blurb:
      'On a handful of Indonesian islands, a prehistoric apex hunter writes its final chapter.',
    label: 'Reptiles',
  },
  {
    title: 'Glass Frogs and the Art of Vanishing',
    blurb:
      'Translucent skin, silent leaps — the camouflage strategy of a forgotten amphibian.',
    label: 'Amphibians',
  },
  {
    title: 'Tracking the Bluefin Migration',
    blurb:
      'A 5,000-mile journey across the Atlantic, traced from satellite tag to spawning ground.',
    label: 'Fish',
  },
  {
    title: 'IUCN Redlist: 2026 Watch',
    blurb:
      'Twelve species crossed from vulnerable to endangered in the past year. Here’s why.',
    label: 'IUCN Redlist',
  },
  {
    title: 'The Quiet Comeback of the Wolf',
    blurb:
      'Across Yellowstone and the Apennines, an ancient predator reshapes a continent.',
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
            From apex predators to the smallest invertebrates — stories from the
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
              <article key={i} className="group block">
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

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
            Eight phyla of invertebrate life — this category opens in the next
            round of the build.
          </p>
        </GlassPanel>
      </Container>
    </section>
  );
}

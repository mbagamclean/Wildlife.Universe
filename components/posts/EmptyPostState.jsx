import { GlassPanel } from '@/components/ui/GlassPanel';
import { Sparkles } from 'lucide-react';

export function EmptyPostState({
  title = 'No posts yet',
  message = 'Check back soon — new stories arrive every week.',
}) {
  return (
    <GlassPanel className="mx-auto max-w-md p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/15">
        <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
      </div>
      <h3 className="font-display text-2xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-[var(--color-fg-soft)]">{message}</p>
    </GlassPanel>
  );
}

/**
 * Skeleton for the dynamic category listing page (/animals, /plants,
 * /birds, /insects, /posts). Streams while the SSR query runs.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse px-5 py-10">
      <div className="mb-3 h-10 w-1/2 rounded bg-[var(--color-fg)]/10" />
      <div className="mb-10 h-4 w-2/3 rounded bg-[var(--color-fg)]/10" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl">
            <div className="aspect-[16/10] w-full rounded-xl bg-[var(--color-fg)]/10" />
            <div className="mt-3 h-5 w-3/4 rounded bg-[var(--color-fg)]/10" />
            <div className="mt-2 h-4 w-1/2 rounded bg-[var(--color-fg)]/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

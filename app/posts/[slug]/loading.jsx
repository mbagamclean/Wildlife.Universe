/**
 * Skeleton for a post detail page — streams immediately while the
 * server resolves the post body, related posts, and OG image.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl animate-pulse px-5 py-10">
      <div className="mb-4 h-8 w-2/3 rounded bg-[var(--color-fg)]/10" />
      <div className="mb-2 h-4 w-1/3 rounded bg-[var(--color-fg)]/10" />
      <div className="my-6 h-[420px] w-full rounded-xl bg-[var(--color-fg)]/10" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-[var(--color-fg)]/10" />
        <div className="h-4 w-[97%] rounded bg-[var(--color-fg)]/10" />
        <div className="h-4 w-[88%] rounded bg-[var(--color-fg)]/10" />
        <div className="h-4 w-[92%] rounded bg-[var(--color-fg)]/10" />
        <div className="h-4 w-[80%] rounded bg-[var(--color-fg)]/10" />
      </div>
    </div>
  );
}

/**
 * Streams instantly while the homepage server work runs. Replaces the
 * blank-flash users experienced between navigation and the first byte
 * of HTML so the site never feels stuck.
 */
export default function Loading() {
  return (
    <div aria-hidden className="min-h-[100svh] w-full">
      <div className="relative h-[100svh] min-h-[820px] w-full overflow-hidden bg-gradient-to-br from-[#031a0d] via-[#0c4a1a] to-[#3aa15a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,235,180,0.15),transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-12 mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 text-center text-white/70">
          <div className="h-8 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}

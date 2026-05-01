'use client';

import { Pause, Play } from 'lucide-react';

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
        aria-label={playing ? 'Pause autoplay' : 'Play autoplay'}
        onClick={onTogglePlay}
        className="glass absolute right-4 top-16 z-20 flex h-9 w-9 items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:bg-[var(--color-primary)]/40 sm:right-6 sm:top-20 md:top-24"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>

      <div
        role="tablist"
        aria-label="Hero slide selector"
        className="absolute inset-x-0 bottom-8 z-20 flex justify-center gap-1.5 sm:bottom-10 sm:gap-2 md:bottom-12"
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
              className={`h-1.5 rounded-full transition-all duration-500 sm:h-2 ${
                active
                  ? 'w-7 bg-[var(--color-primary)] sm:w-10'
                  : 'w-1.5 bg-white/40 hover:bg-white/70 sm:w-2'
              }`}
            />
          );
        })}
      </div>
    </>
  );
}

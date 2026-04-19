'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

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
        aria-label="Previous slide"
        onClick={onPrev}
        className="glass absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full p-3 text-white opacity-0 transition-all duration-300 group-hover/hero:opacity-100 hover:scale-110 hover:bg-[var(--color-primary)]/40 sm:left-6 md:flex"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        aria-label="Next slide"
        onClick={onNext}
        className="glass absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full p-3 text-white opacity-0 transition-all duration-300 group-hover/hero:opacity-100 hover:scale-110 hover:bg-[var(--color-primary)]/40 sm:right-6 md:flex"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <button
        aria-label={playing ? 'Pause autoplay' : 'Play autoplay'}
        onClick={onTogglePlay}
        className="glass absolute right-4 top-24 z-20 flex h-9 w-9 items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:bg-[var(--color-primary)]/40 sm:right-6"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>

      <div
        role="tablist"
        aria-label="Hero slide selector"
        className="absolute inset-x-0 bottom-10 z-20 flex justify-center gap-2 sm:bottom-12"
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
              className={`h-2 rounded-full transition-all duration-500 ${
                active
                  ? 'w-10 bg-[var(--color-primary)]'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          );
        })}
      </div>
    </>
  );
}

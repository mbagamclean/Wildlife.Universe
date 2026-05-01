'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { HeroSlide } from './HeroSlide';
import { HeroControls } from './HeroControls';
import { useHero } from './HeroContext';
import { getEffect, EFFECT_NAMES } from './heroEffects';

const SWIPE_THRESHOLD = 60;

export function HeroCarousel() {
  const {
    slides, index, direction,
    next, prev, goTo,
    playing, setPlaying,
    liveRef, count,
    transitionCount,
    onVideoEnded,
  } = useHero();

  // Cycle through all 8 effects in strict 1→8 sequence, then repeat.
  // transitionCount is incremented by every navigation source (Netflix arrows,
  // autoplay, keyboard, drag) so the effect always advances correctly.
  const effectName = EFFECT_NAMES[transitionCount % EFFECT_NAMES.length];
  const effect = getEffect(effectName);

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured wildlife"
      className="group/hero relative h-[100svh] min-h-[600px] w-full overflow-hidden"
    >
      <div className="absolute inset-0">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={slides[index].id}
            custom={direction}
            variants={effect.variants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) next();
              else if (info.offset.x > SWIPE_THRESHOLD) prev();
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <HeroSlide slide={slides[index]} isActive onVideoEnded={onVideoEnded} />
          </motion.div>
        </AnimatePresence>

        {/* Warm golden burst — only rendered during the flash-cut effect */}
        {effect.overlay && (
          <motion.div
            key={`flash-${transitionCount}`}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-50"
            style={{
              background:
                'radial-gradient(circle at 50% 40%, rgba(255,232,140,0.95) 0%, rgba(255,255,255,0.82) 50%, transparent 78%)',
            }}
            initial={{ opacity: 0.92 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        )}
      </div>

      <HeroControls
        count={count}
        index={index}
        onPrev={prev}
        onNext={next}
        onJump={goTo}
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
      />

      <div ref={liveRef} aria-live="polite" className="sr-only" />
    </section>
  );
}

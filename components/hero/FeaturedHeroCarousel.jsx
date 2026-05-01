'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HeroPlaceholder } from './HeroPlaceholder';
import { HeroControls } from './HeroControls';
import { useHero } from './HeroContext';
import { getEffect, EFFECT_NAMES } from './heroEffects';

const SWIPE_THRESHOLD = 60;

function FeaturedSlide({ slide }) {
  const src =
    typeof slide.src === 'string'
      ? slide.src
      : slide.src?.sources?.at(-1)?.src || '';

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <HeroPlaceholder
          palette={slide.palette}
          accent={slide.accent}
          subject={slide.subject}
        />
        {src && (
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 data-[loaded=true]:opacity-100"
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth > 1) {
                e.currentTarget.dataset.loaded = 'true';
              }
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      <div className="absolute inset-0 dark-overlay" aria-hidden="true" />

      <div className="absolute inset-0 z-20 flex flex-col">
        <div className="mt-auto flex max-w-4xl flex-col items-start gap-4 px-4 pb-20 sm:gap-5 sm:px-8 sm:pb-28 md:px-14 md:pb-32 lg:px-20 lg:pb-36">
          <span className="rounded-full bg-[var(--color-gold)]/90 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#1a1208]">
            Featured
          </span>
          <motion.h1
            key={slide.title}
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-3xl font-black leading-[0.95] hero-text-title text-balance sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
          >
            {slide.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="max-w-2xl text-sm hero-text-body text-balance sm:text-base md:text-lg lg:text-xl"
          >
            {slide.description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <Link
              href={slide.cta.href}
              className="group inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-medium text-white shadow-xl shadow-[var(--color-primary)]/40 transition-all duration-300 hover:scale-[1.03] hover:bg-[var(--color-primary-deep)] sm:gap-2 sm:px-7 sm:py-3.5 sm:text-sm"
            >
              {slide.cta.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function FeaturedHeroCarousel() {
  const {
    slides, index, direction,
    next, prev, goTo,
    playing, setPlaying,
    setHeroHovered, liveRef, count,
    transitionCount,
  } = useHero();

  // Same sequential effect cycling — driven by the shared transitionCount so
  // Netflix carousel arrows and autoplay also advance through all 8 effects.
  const effectName = EFFECT_NAMES[transitionCount % EFFECT_NAMES.length];
  const effect = getEffect(effectName);

  const [hovered, setHovered] = useState(false);

  const onEnter = () => { setHovered(true);  setHeroHovered(true); };
  const onLeave = () => { setHovered(false); setHeroHovered(false); };

  if (count === 0) return null;

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured posts"
      className="group/hero relative h-[100svh] min-h-[600px] w-full overflow-hidden"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="absolute inset-y-0 left-0 right-0">
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
            <FeaturedSlide slide={slides[index]} />
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

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[70%] gradient-fade-down"
      />

      {count > 1 && (
        <HeroControls
          count={count}
          index={index}
          onPrev={prev}
          onNext={next}
          onJump={goTo}
          playing={playing}
          onTogglePlay={() => setPlaying((p) => !p)}
        />
      )}

      <div ref={liveRef} aria-live="polite" className="sr-only" />
    </section>
  );
}

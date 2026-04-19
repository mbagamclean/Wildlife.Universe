'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroSlide } from './HeroSlide';
import { HeroControls } from './HeroControls';

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 60;

export function HeroCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const liveRef = useRef(null);

  const count = slides.length;

  const goTo = useCallback(
    (next) => {
      setDirection(next > index ? 1 : -1);
      setIndex(((next % count) + count) % count);
    },
    [index, count]
  );

  const next = useCallback(() => {
    setDirection(1);
    setIndex((i) => (i + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  useEffect(() => {
    if (!playing || hovered) return;
    const id = window.setInterval(next, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [playing, hovered, next]);

  useEffect(() => {
    const onVis = () => setPlaying(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent = `Slide ${index + 1} of ${count}: ${slides[index].title}`;
    }
  }, [index, count, slides]);

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0.6 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0.6 }),
  };

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured wildlife"
      className="group/hero relative h-[100svh] min-h-[600px] w-full overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 z-10 hidden w-[8%] cursor-pointer opacity-50 transition-opacity hover:opacity-90 lg:block"
        onClick={prev}
      >
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute inset-0 origin-right scale-90">
            <HeroSlide slide={slides[(index - 1 + count) % count]} isActive={false} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
        </div>
      </div>
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 z-10 hidden w-[8%] cursor-pointer opacity-50 transition-opacity hover:opacity-90 lg:block"
        onClick={next}
      >
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute inset-0 origin-left scale-90">
            <HeroSlide slide={slides[(index + 1) % count]} isActive={false} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-l from-black/70 to-transparent" />
        </div>
      </div>

      <div className="absolute inset-y-0 left-0 right-0 lg:left-[8%] lg:right-[8%]">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={slides[index].id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) next();
              else if (info.offset.x > SWIPE_THRESHOLD) prev();
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <HeroSlide slide={slides[index]} isActive />
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/4 gradient-fade-down"
      />

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

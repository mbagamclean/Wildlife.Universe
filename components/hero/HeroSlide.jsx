'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { HeroPlaceholder } from './HeroPlaceholder';

const titleContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const titleChar = {
  hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.4 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

function AnimatedTitle({ text, isVideo }) {
  const className = isVideo
    ? 'font-display text-4xl font-black leading-[0.95] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] sm:text-5xl md:text-6xl lg:text-7xl text-balance'
    : 'font-display text-4xl font-black leading-[0.95] text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.7)] sm:text-6xl md:text-7xl lg:text-8xl text-balance';

  const words = text.split(' ');

  return (
    <motion.h1
      key={text}
      variants={titleContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split('').map((ch, ci) => (
            <motion.span key={ci} variants={titleChar} className="inline-block">
              {ch}
            </motion.span>
          ))}
          {wi < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </motion.h1>
  );
}

function MediaLayer({ slide }) {
  if (slide.type === 'video') {
    return (
      <>
        <HeroPlaceholder
          palette={slide.palette}
          accent={slide.accent}
          subject={slide.subject}
          animate
        />
        <video
          key={slide.src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 data-[loaded=true]:opacity-100"
          onLoadedData={(e) => {
            if (e.currentTarget.videoWidth > 0) {
              e.currentTarget.dataset.loaded = 'true';
            }
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src={slide.src} type="video/mp4" />
        </video>
      </>
    );
  }
  return (
    <>
      <HeroPlaceholder
        palette={slide.palette}
        accent={slide.accent}
        subject={slide.subject}
      />
      <img
        src={slide.src}
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
    </>
  );
}

export function HeroSlide({ slide, isActive }) {
  const isVideo = slide.type === 'video';
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <MediaLayer slide={slide} />
      </div>

      <div className="absolute inset-0 dark-overlay" aria-hidden="true" />

      {isActive && (
        <div className="absolute inset-0 flex flex-col">
          {isVideo ? (
            <div className="mt-auto flex max-w-4xl flex-col items-start gap-5 px-6 pb-28 sm:px-12 sm:pb-32 lg:px-20 lg:pb-36">
              <AnimatedTitle text={slide.title} isVideo />
              <motion.p
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="max-w-2xl text-base text-white/85 sm:text-lg md:text-xl text-balance"
              >
                {slide.description}
              </motion.p>
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={1}
                className="flex flex-wrap items-center gap-3"
              >
                <Link
                  href={slide.cta.href}
                  className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-medium text-white shadow-xl shadow-[var(--color-primary)]/40 transition-all duration-300 hover:scale-[1.03] hover:bg-[var(--color-primary-deep)]"
                >
                  {slide.cta.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            </div>
          ) : (
            <>
              <div className="mt-[18vh] flex justify-center px-6 sm:mt-[20vh]">
                <AnimatedTitle text={slide.title} isVideo={false} />
              </div>
              <div className="mt-auto flex max-w-4xl flex-col items-start gap-5 px-6 pb-28 sm:px-12 sm:pb-32 lg:px-20 lg:pb-36">
                <motion.p
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={0}
                  className="max-w-2xl text-base text-white/85 sm:text-lg md:text-xl text-balance"
                >
                  {slide.description}
                </motion.p>
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                  className="flex flex-wrap items-center gap-3"
                >
                  <Link
                    href={slide.cta.href}
                    className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-medium text-white shadow-xl shadow-[var(--color-primary)]/40 transition-all duration-300 hover:scale-[1.03] hover:bg-[var(--color-primary-deep)]"
                  >
                    {slide.cta.label}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

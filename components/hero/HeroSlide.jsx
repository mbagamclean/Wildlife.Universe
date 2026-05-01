'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { HeroPlaceholder } from './HeroPlaceholder';

// ─── Color utilities ──────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Derive an adaptive title style from a sampled background colour + slide accent.
 * Three tiers based on luminance: very dark / mid-dark / bright.
 */
function buildTitleStyle(bgRgb, accentHex) {
  const lum = relativeLuminance(bgRgb);
  const { r: ar, g: ag, b: ab } = hexToRgb(accentHex);

  const accentStrong = `rgba(${ar},${ag},${ab},0.75)`;
  const accentSoft   = `rgba(${ar},${ag},${ab},0.38)`;

  if (lum < 0.10) {
    // Very dark image — vivid accent halo + deep black anchor shadow
    return {
      color: '#ffffff',
      textShadow: [
        `0 0 90px ${accentStrong}`,
        `0 0 36px ${accentSoft}`,
        `0 6px 40px rgba(0,0,0,0.98)`,
        `0 2px 10px rgba(0,0,0,0.85)`,
      ].join(', '),
    };
  }
  if (lum < 0.30) {
    // Mid-dark — balanced glow + strong legibility shadow
    return {
      color: '#ffffff',
      textShadow: [
        `0 0 60px ${accentStrong}`,
        `0 0 22px ${accentSoft}`,
        `0 5px 32px rgba(0,0,0,0.90)`,
        `0 2px 10px rgba(0,0,0,0.72)`,
      ].join(', '),
    };
  }
  if (lum < 0.55) {
    // Mid-bright — white text with heavy drop shadow
    return {
      color: '#ffffff',
      textShadow: [
        `0 0 40px ${accentSoft}`,
        `0 4px 28px rgba(0,0,0,0.82)`,
        `0 2px 10px rgba(0,0,0,0.65)`,
      ].join(', '),
    };
  }
  // Bright image — dark ink text with white backing glow
  return {
    color: '#111111',
    textShadow: [
      `0 0 50px rgba(255,255,255,0.95)`,
      `0 2px 16px rgba(255,255,255,0.75)`,
      `0 0 70px ${accentSoft}`,
    ].join(', '),
  };
}

/**
 * Canvas-sample the top-centre strip of an image element and return
 * an adaptive title style. Returns null on CORS / canvas errors.
 */
function sampleImageTitle(imgEl, accentHex) {
  try {
    const W = 100, H = 28;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    // Sample centre-50% width × top 28% height (where the title lives)
    ctx.drawImage(
      imgEl,
      imgEl.naturalWidth * 0.25, 0,
      imgEl.naturalWidth * 0.50, imgEl.naturalHeight * 0.28,
      0, 0, W, H
    );
    const { data } = ctx.getImageData(0, 0, W, H);
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 16) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    return buildTitleStyle({ r: r / n, g: g / n, b: b / n }, accentHex);
  } catch {
    return null;
  }
}

// ─── Shared title / body styles ───────────────────────────────────────────────

// Body text is always at the bottom of the slide on a dark cinematic overlay,
// so it is always white — no theme dependency needed.
const BODY_STYLE = {
  color: 'rgba(255,255,255,0.88)',
  textShadow: '0 2px 10px rgba(0,0,0,0.55)',
};

// ─── Title animation ──────────────────────────────────────────────────────────

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

function AnimatedTitle({ text, isVideo, titleStyle }) {
  const className = isVideo
    ? 'font-display text-2xl font-black leading-[0.95] text-balance sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl'
    : 'font-display text-3xl font-black leading-[0.95] text-balance sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl';

  const words = text.split(' ');

  return (
    <motion.h1
      key={text}
      variants={titleContainer}
      initial="hidden"
      animate="visible"
      className={className}
      style={titleStyle}
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

// ─── Image media layer ────────────────────────────────────────────────────────

function ImageLayer({ slide, onColorSample }) {
  const handleLoad = useCallback(
    (e) => {
      const img = e.currentTarget;
      if (img.naturalWidth > 1) {
        img.dataset.loaded = 'true';
        onColorSample?.(img);
      }
    },
    [onColorSample]
  );

  const handleError = useCallback((e) => { e.currentTarget.style.display = 'none'; }, []);

  return (
    <>
      <HeroPlaceholder
        palette={slide.palette}
        accent={slide.accent}
        subject={slide.subject}
      />
      {typeof slide.src === 'string' ? (
        <img
          src={slide.src}
          alt=""
          crossOrigin="anonymous"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 data-[loaded=true]:opacity-100"
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <picture>
          {(slide.src?.sources || []).slice(0, -1).map((s, i) => (
            <source key={i} srcSet={s.src} type={s.type} />
          ))}
          <img
            src={slide.src?.sources?.[Math.max(0, (slide.src.sources?.length || 1) - 1)]?.src || ''}
            alt=""
            crossOrigin="anonymous"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 data-[loaded=true]:opacity-100"
            onLoad={handleLoad}
            onError={handleError}
          />
        </picture>
      )}
    </>
  );
}

// ─── Video media layer ────────────────────────────────────────────────────────

function VideoLayer({ slide, onPlay, onPause, onEnded }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.play().catch(() => {});
  }, []);

  return (
    <>
      <HeroPlaceholder
        palette={slide.palette}
        accent={slide.accent}
        subject={slide.subject}
        animate
      />
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        loop={false}
        className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 data-[loaded=true]:opacity-100"
        onLoadedData={(e) => {
          if (e.currentTarget.videoWidth > 0) e.currentTarget.dataset.loaded = 'true';
        }}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      >
        {typeof slide.src === 'string' ? (
          <source src={slide.src} type="video/mp4" />
        ) : (
          slide.src?.sources?.map((s, i) => (
            <source key={i} src={s.src} type={s.type} />
          ))
        )}
      </video>
    </>
  );
}

// ─── Slide ────────────────────────────────────────────────────────────────────

export function HeroSlide({ slide, isActive, onVideoEnded }) {
  const isVideo = slide.type === 'video';

  // Initialise from palette (instant, before image loads) then refine via canvas
  const [titleStyle, setTitleStyle] = useState(() =>
    buildTitleStyle(hexToRgb(slide.palette.from), slide.accent)
  );

  // Reset when slide changes
  useEffect(() => {
    setTitleStyle(buildTitleStyle(hexToRgb(slide.palette.from), slide.accent));
  }, [slide.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleColorSample = useCallback(
    (imgEl) => {
      const sampled = sampleImageTitle(imgEl, slide.accent);
      if (sampled) setTitleStyle(sampled);
    },
    [slide.accent]
  );

  const [videoPlaying, setVideoPlaying] = useState(false);
  const [contentHovered, setContentHovered] = useState(false);
  const advancedRef = useRef(false);

  const handlePlay = useCallback(() => {
    advancedRef.current = false;
    setTimeout(() => setVideoPlaying(true), 1800);
  }, []);

  const handlePause = useCallback(() => setVideoPlaying(false), []);

  const handleEnded = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    setVideoPlaying(false);
    onVideoEnded?.();
  }, [onVideoEnded]);

  const showDescription = !isVideo || !videoPlaying || contentHovered;

  const ctaLink = (
    <Link
      href={slide.cta?.href ?? '#'}
      className="group inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-medium text-white shadow-xl shadow-[var(--color-primary)]/40 transition-all duration-300 hover:scale-[1.03] hover:bg-[var(--color-primary-deep)] sm:gap-2 sm:px-7 sm:py-3.5 sm:text-sm"
    >
      {slide.cta?.label ?? 'Explore'}
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4" />
    </Link>
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        {isVideo ? (
          <VideoLayer
            slide={slide}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
          />
        ) : (
          <ImageLayer slide={slide} onColorSample={handleColorSample} />
        )}
      </div>

      {/* Always-dark cinematic overlay — no theme dependency */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.30) 50%, rgba(0,0,0,0.62) 100%)',
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[70%] gradient-fade-down"
      />

      {isActive && (
        <div className="absolute inset-0 z-20 flex flex-col">
          {isVideo ? (
            /* ── Video layout ── */
            <div
              className="mt-auto flex w-full max-w-7xl mx-auto flex-col items-start gap-3 px-4 pb-20 sm:gap-5 sm:px-6 sm:pb-28 md:px-8 md:pb-32 lg:px-10 lg:pb-36"
              onMouseEnter={() => setContentHovered(true)}
              onMouseLeave={() => setContentHovered(false)}
            >
              <AnimatedTitle text={slide.title} isVideo titleStyle={titleStyle} />

              <motion.p
                animate={{
                  opacity: showDescription ? 1 : 0,
                  y: showDescription ? 0 : 8,
                  height: showDescription ? 'auto' : 0,
                }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-2xl overflow-hidden text-sm text-balance sm:text-base md:text-lg lg:text-xl"
                style={BODY_STYLE}
                aria-hidden={!showDescription}
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
                {ctaLink}
              </motion.div>
            </div>
          ) : (
            /* ── Image layout ── */
            <>
              <div className="mt-[calc(5rem+3vh)] flex justify-center px-4 sm:mt-[14vh] sm:px-6 md:mt-[17vh] lg:mt-[20vh]">
                <AnimatedTitle text={slide.title} isVideo={false} titleStyle={titleStyle} />
              </div>
              <div className="mt-auto flex w-full max-w-7xl mx-auto flex-col items-start gap-3 px-4 pb-20 sm:gap-5 sm:px-6 sm:pb-28 md:px-8 md:pb-32 lg:px-10 lg:pb-36">
                <motion.p
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={0}
                  className="max-w-2xl text-sm text-balance sm:text-base md:text-lg lg:text-xl"
                  style={BODY_STYLE}
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
                  {ctaLink}
                </motion.div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

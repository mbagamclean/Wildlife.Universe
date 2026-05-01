'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useHero } from './HeroContext';

// ─── Layout constants ─────────────────────────────────────────────────────────

const CARD_RATIO = 1.38;  // card height / width (portrait ~3:4)
const SIDE_SCALE = 0.82;  // how much side cards scale down
const GAP_RATIO  = 0.08;  // horizontal gap as % of active card width
const FLOOR_PAD  = 44;    // px below the card "floor" line inside the track
const ROOF_PAD   = 28;    // px above the tallest card
const SWIPE_THR  = 48;    // px to register a swipe

// ─── Animation presets ────────────────────────────────────────────────────────

const SPRING = { type: 'spring', stiffness: 220, damping: 24, mass: 0.85 };
const FAST   = { type: 'spring', stiffness: 300, damping: 28, mass: 0.60 };

// ─── Horizontal Layout Math ───────────────────────────────────────────────────

function calculateX(offset, w) {
  if (offset === 0) return 0;
  const abs = Math.abs(offset);
  const gap = w * GAP_RATIO;
  
  // Center to 1st side card distance
  let dist = (w * 1.0) / 2 + gap + (w * SIDE_SCALE) / 2;
  
  // Distances for remaining cards
  if (abs > 1) {
    dist += (abs - 1) * (w * SIDE_SCALE + gap);
  }
  
  return offset > 0 ? dist : -dist;
}

// ─── Corner bracket decoration ────────────────────────────────────────────────

function CornerBrackets({ cardWidth }) {
  const sz     = Math.max(14, Math.round(cardWidth * 0.095));
  const inset   = Math.max(8,  Math.round(cardWidth * 0.042));
  const tick    = 2;
  const color   = 'var(--color-gold)';

  const defs = [
    { pos: { top: inset, left: inset }, b: [tick, tick, 0, 0] },
    { pos: { top: inset, right: inset }, b: [tick, 0, 0, tick] },
    { pos: { bottom: inset, left: inset }, b: [0, tick, tick, 0] },
    { pos: { bottom: inset, right: inset }, b: [0, 0, tick, tick] },
  ];

  return (
    <>
      {defs.map(({ pos, b }, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            width: sz,
            height: sz,
            borderStyle: 'solid',
            borderColor: color,
            borderTopWidth: b[0],
            borderLeftWidth: b[1],
            borderBottomWidth: b[2],
            borderRightWidth: b[3],
            ...pos,
          }}
        />
      ))}
    </>
  );
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function CardThumb({ slide }) {
  const { from = '#0c4a1a', via = '#3aa15a', to = '#a8e0c0' } = slide.palette ?? {};

  // Video slides use the poster image; image slides use src directly.
  const mediaRef = slide.type === 'video' ? slide.poster : slide.src;

  const sharedImgProps = {
    alt: slide.title,
    draggable: false,
    className:
      'absolute inset-0 h-full w-full select-none object-cover opacity-0 transition-opacity duration-500 data-[loaded=true]:opacity-100',
    onLoad: (e) => {
      if (e.currentTarget.naturalWidth > 1) e.currentTarget.dataset.loaded = 'true';
    },
    onError: (e) => { e.currentTarget.style.display = 'none'; },
  };

  let mediaEl = null;
  if (typeof mediaRef === 'string' && mediaRef) {
    mediaEl = <img src={mediaRef} {...sharedImgProps} />;
  } else if (mediaRef?.sources?.length) {
    const sources = mediaRef.sources;
    mediaEl = (
      <picture>
        {sources.slice(0, -1).map((s, i) => (
          <source key={i} srcSet={s.src} type={s.type} />
        ))}
        <img src={sources.at(-1)?.src ?? ''} {...sharedImgProps} />
      </picture>
    );
  }

  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(158deg, ${from} 0%, ${via} 52%, ${to} 100%)` }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 66% 22%, rgba(255,228,148,0.26) 0%, transparent 55%)' }}
      />
      {mediaEl}
    </div>
  );
}

// ─── Single card ──────────────────────────────────────────────────────────────

function CarouselCard({ slide, offset, isEdge, cardWidth, onClick }) {
  const absOff = Math.abs(offset);
  const isActive = absOff === 0;

  const targetX = calculateX(offset, cardWidth);
  const scale = isActive ? 1 : SIDE_SCALE;
  const overlayOp = isActive ? 0 : isEdge ? 0.75 : 0.45;
  const z = isActive ? 20 : isEdge ? 5 : 10;
  
  // Dynamic blur filter for inactive cards
  const blurValue = isActive ? 'blur(0px)' : isEdge ? 'blur(3px)' : 'blur(1.5px)';

  const cardH      = Math.round(cardWidth * CARD_RATIO);
  const titleSize  = Math.max(14, Math.round(cardWidth * 0.082));
  const labelSize  = Math.max(12, Math.round(cardWidth * 0.044));
  const btnPadX    = Math.round(cardWidth * 0.100);
  const btnPadY    = Math.round(cardWidth * 0.040);

  return (
    <motion.div
      initial={{ x: targetX, scale: scale, opacity: 0 }}
      animate={{ x: targetX, scale: scale, zIndex: z, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={SPRING}
      onClick={isActive ? undefined : onClick}
      style={{
        position: 'absolute',
        bottom: FLOOR_PAD,
        left: '50%',
        width: cardWidth,
        height: cardH,
        marginLeft: -(cardWidth / 2),
        borderRadius: Math.max(8, Math.round(cardWidth * 0.05)),
        overflow: 'hidden',
        cursor: isActive ? 'default' : 'pointer',
        transformOrigin: '50% 100%',
        willChange: 'transform',
        filter: blurValue,
        transition: 'filter 0.4s ease-out'
      }}
      role={isActive ? undefined : 'button'}
      aria-label={isActive ? undefined : `Go to: ${slide.title}`}
      tabIndex={isActive ? -1 : 0}
      onKeyDown={isActive ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
    >
      <CardThumb slide={slide} />

      <motion.div
        animate={{ opacity: overlayOp }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 bg-black"
        aria-hidden
      />

      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        aria-hidden
        style={{
          height: '65%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
        }}
      />

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-3 px-2 z-10">
        {isActive ? (
          <>
            <span
              className="font-body uppercase text-[var(--color-gold)] drop-shadow-md"
              style={{ fontSize: labelSize, letterSpacing: '0.20em' }}
            >
              {slide.subject || 'Wildlife'}
            </span>
            <p
              className="mt-1 text-center font-display font-black leading-tight text-white px-1 drop-shadow-xl"
              style={{ fontSize: titleSize }}
            >
              {slide.title}
            </p>
            <Link
              href={slide.cta?.href ?? '#'}
              onClick={(e) => e.stopPropagation()}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-full font-bold uppercase text-[#1a1208] transition-all duration-200 hover:brightness-110 active:scale-95 shadow-lg"
              style={{
                background: 'var(--color-gold)',
                fontSize: labelSize,
                letterSpacing: '0.14em',
                paddingLeft: btnPadX,
                paddingRight: btnPadX,
                paddingTop: btnPadY,
                paddingBottom: btnPadY,
              }}
            >
              <span style={{ fontSize: Math.round(labelSize * 0.82) }}>≡</span>
              {slide.cta?.label ?? 'Explore'}
              <ArrowRight style={{ width: labelSize, height: labelSize }} aria-hidden />
            </Link>
          </>
        ) : (
          <p
            className="line-clamp-2 text-center font-display font-bold leading-tight text-white/50 px-2 drop-shadow-md"
            style={{ fontSize: Math.max(8, Math.round(cardWidth * 0.052)) }}
          >
            {slide.title}
          </p>
        )}
      </div>

      <AnimatePresence>
        {isActive && (
          <motion.div
            key="brackets"
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={FAST}
            className="pointer-events-none absolute inset-0 z-20"
          >
            <CornerBrackets cardWidth={cardWidth} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isActive && (
          <motion.div
            key="glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FAST}
            className="pointer-events-none absolute inset-0 z-10"
            aria-hidden
            style={{
              borderRadius: Math.max(8, Math.round(cardWidth * 0.05)),
              boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 10px 30px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(212,175,55,0.45)',
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function NetflixRowCarousel() {
  const { slides, index: heroIndex, goTo, next, prev, count } = useHero();
  
  const trackRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [maxSide, setMaxSide] = useState(3);
  
  const pointerX = useRef(null);
  const didSwipe = useRef(false);

  // virtualIndex decouples the carousel array state from the actual hero state, 
  // enabling an infinite continuous track without hard loops
  const [virtualIndex, setVirtualIndex] = useState(0);

  // Sync virtualIndex when heroIndex changes to take the shortest continuous path
  useEffect(() => {
    if (count === 0) return;
    const currentHeroIndex = ((virtualIndex % count) + count) % count;
    let diff = heroIndex - currentHeroIndex;
    
    // Choose the shortest path (wrap around if needed)
    if (diff > count / 2) diff -= count;
    else if (diff < -count / 2) diff += count;
    
    if (diff !== 0) {
      setVirtualIndex((v) => v + diff);
    }
  }, [heroIndex, count, virtualIndex]);

  // Pure mathematical responsiveness via ResizeObserver
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const calc = () => {
      const W = el.offsetWidth;
      let mSide, divisor;
      
      if (W < 640) { 
         mSide = 1; 
      } else if (W < 1024) {
         mSide = 2; 
      } else {
         mSide = 3; 
      }
      
      // Compute required denominator such that target mSide is precisely 50% visually obscured
      const distRatio = 0.5 + mSide * GAP_RATIO + (mSide - 0.5) * SIDE_SCALE;
      divisor = 2 * distRatio;
      
      setCardWidth(W / divisor);
      setMaxSide(mSide);
    };
    calc();
    
    // Use requestAnimationFrame loop or resize observer
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visibleItems = useMemo(() => {
    if (count === 0 || cardWidth === 0) return [];
    const items = [];
    // Only render items from -maxSide to +maxSide centered at virtualIndex
    for (let i = virtualIndex - maxSide; i <= virtualIndex + maxSide; i++) {
        const realIdx = ((i % count) + count) % count;
        items.push({
            vIndex: i,
            realIdx,
            slide: slides[realIdx],
            offset: i - virtualIndex,
        });
    }
    return items;
  }, [virtualIndex, maxSide, count, cardWidth, slides]);

  const onPointerDown = useCallback((e) => {
    pointerX.current = e.clientX;
    didSwipe.current = false;
  }, []);

  const onPointerUp = useCallback((e) => {
    if (pointerX.current === null) return;
    const delta = e.clientX - pointerX.current;
    if (Math.abs(delta) > SWIPE_THR) {
      didSwipe.current = true;
      delta < 0 ? next() : prev();
    }
    pointerX.current = null;
  }, [next, prev]);

  const guardClick = useCallback((cb) => () => {
    if (didSwipe.current) { didSwipe.current = false; return; }
    cb();
  }, []);

  if (count === 0) return null;

  const cardH   = Math.round(cardWidth * CARD_RATIO);
  const trackH  = cardWidth > 0 ? cardH + FLOOR_PAD + ROOF_PAD : 300;
  // Edge gradient should securely cover half of the side scale width
  const edgeW   = cardWidth > 0 ? Math.round(cardWidth * SIDE_SCALE * 0.9) : 0;

  return (
    <section
      aria-label="Wildlife carousel"
      style={{
        background: 'var(--color-bg)',
        paddingTop: 24,
        paddingBottom: 36,
      }}
    >
      <div className="relative mx-auto w-full max-w-[1440px]">
        {/* Left target arrow */}
        <button
          aria-label="Previous slide"
          onClick={prev}
          className="absolute left-1 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-white transition-all duration-300 hover:scale-110 hover:bg-white/10 active:scale-95 sm:left-4"
          style={{ top: ROOF_PAD + Math.round(cardH * 0.38) }}
        >
          <ChevronLeft className="h-7 w-7" />
        </button>

        {/* Right target arrow */}
        <button
          aria-label="Next slide"
          onClick={next}
          className="absolute right-1 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-white transition-all duration-300 hover:scale-110 hover:bg-white/10 active:scale-95 sm:right-4"
          style={{ top: ROOF_PAD + Math.round(cardH * 0.38) }}
        >
          <ChevronRight className="h-7 w-7" />
        </button>

        <div
          ref={trackRef}
          className="relative overflow-hidden select-none"
          style={{ height: trackH }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { pointerX.current = null; }}
        >
          <AnimatePresence mode="popLayout">
            {visibleItems.map(({ vIndex, slide, offset, realIdx }) => (
              <CarouselCard
                key={`${slide.id}-${vIndex}`}
                vIndex={vIndex}
                slide={slide}
                offset={offset}
                isEdge={Math.abs(offset) === maxSide}
                cardWidth={cardWidth}
                onClick={guardClick(() => goTo(realIdx))}
              />
            ))}
          </AnimatePresence>

          {/* Left pure dark fade overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-30"
            style={{
              width: edgeW,
              background: 'linear-gradient(to right, var(--color-bg) 0%, transparent 100%)',
            }}
          />
          {/* Right pure dark fade overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-30"
            style={{
              width: edgeW,
              background: 'linear-gradient(to left, var(--color-bg) 0%, transparent 100%)',
            }}
          />
        </div>

        <div role="tablist" aria-label="Carousel slide selector" className="flex justify-center gap-2.5 pt-5">
          {slides.map((_, i) => {
            const active = i === heroIndex;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={active}
                aria-label={`Slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`cursor-pointer rounded-full transition-all duration-500 h-1 sm:h-1.5 ${
                  active ? 'w-6 bg-[var(--color-gold)] shadow-[0_0_8px_var(--color-gold)] sm:w-8' : 'w-1.5 bg-white/30 hover:bg-white/60 sm:w-2'
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

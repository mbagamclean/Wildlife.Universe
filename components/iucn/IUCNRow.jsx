'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IUCNCard } from './IUCNCard';

const DARK_BG = '#030803';
const SCROLL_AMT = 580;

function SkeletonCard({ isLight }) {
  return (
    <div
      className="shrink-0 rounded-xl"
      style={{
        width: 'clamp(180px, 72vw, 280px)',
        aspectRatio: '16 / 9',
        background: isLight
          ? 'linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.11) 50%, rgba(0,0,0,0.06) 75%)'
          : 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.11) 50%, rgba(255,255,255,0.05) 75%)',
        backgroundSize: '200% 100%',
        animation: 'wu-shimmer 1.6s ease-in-out infinite',
      }}
    />
  );
}

export function IUCNRow({ statusConfig, species, loading, isLight }) {
  const { code, label, longDesc, color, textColor, glow } = statusConfig;

  const trackRef = useRef(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  const syncScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncScrollState();
    const ro = new ResizeObserver(syncScrollState);
    ro.observe(el);
    el.addEventListener('scroll', syncScrollState, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', syncScrollState);
    };
  }, [syncScrollState, loading, species]);

  const items = loading ? Array.from({ length: 7 }) : species;

  /* ── Panel background ── */
  const panelStyle = isLight
    ? {
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${color}30`,
        boxShadow: `0 4px 32px rgba(0,0,0,0.08), 0 0 60px ${color}08, inset 0 1px 0 rgba(255,255,255,0.9)`,
      }
    : {
        background: `linear-gradient(135deg, ${color}0a 0%, rgba(3,8,3,0.6) 60%)`,
        border: `1px solid ${color}25`,
        boxShadow: `0 0 60px ${color}08, inset 0 1px 0 ${color}15`,
      };

  /* ── Edge fade color ── */
  const fadeLeft  = isLight ? 'linear-gradient(to right, rgba(255,255,255,0.95), transparent)'  : `linear-gradient(to right, ${DARK_BG}ee, transparent)`;
  const fadeRight = isLight ? 'linear-gradient(to left,  rgba(255,255,255,0.95), transparent)'  : `linear-gradient(to left,  ${DARK_BG}ee, transparent)`;

  /* ── Nav button style ── */
  const navBtnStyle = (visible) =>
    isLight
      ? {
          background: 'rgba(255,255,255,0.95)',
          border: `1.5px solid ${color}50`,
          color,
          backdropFilter: 'blur(12px)',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          boxShadow: `0 4px 16px rgba(0,0,0,0.10), 0 0 10px ${color}20`,
        }
      : {
          background: 'rgba(6,6,6,0.90)',
          border: `1.5px solid ${color}45`,
          color: textColor,
          backdropFilter: 'blur(12px)',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${color}20`,
        };

  return (
    <div className="rounded-2xl" style={panelStyle}>
      {/* ── PANEL HEADER ── */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-start gap-4">
          {/* Accent bar */}
          <div
            className="mt-1 w-[3px] shrink-0 self-stretch rounded-full"
            style={{ background: `linear-gradient(to bottom, ${color}, ${color}20)` }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span
                className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-black tracking-[0.14em]"
                style={{
                  background: `${color}20`,
                  color: textColor,
                  border: `1.5px solid ${color}50`,
                  boxShadow: `0 0 12px ${color}20`,
                }}
              >
                {code}
              </span>

              <h3
                className="font-display text-xl font-black tracking-tight sm:text-2xl md:text-3xl"
                style={{
                  color: isLight ? 'var(--color-fg)' : textColor,
                  textShadow: isLight ? 'none' : `0 0 30px ${color}40`,
                }}
              >
                {label} Species
              </h3>

              {!loading && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={isLight
                    ? { background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.45)' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }
                  }
                >
                  {species.length} {species.length === 1 ? 'species' : 'species'}
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed max-w-2xl"
              style={{ color: isLight ? 'var(--color-fg-soft)' : 'rgba(255,255,255,0.48)' }}
            >
              {longDesc}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div
          className="mt-6 h-px"
          style={{
            background: isLight
              ? `linear-gradient(to right, ${color}40, rgba(0,0,0,0.06) 80%)`
              : `linear-gradient(to right, ${color}30, transparent 80%)`,
          }}
        />
      </div>

      {/* ── CAROUSEL ── */}
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 transition-opacity duration-300"
          style={{ background: fadeLeft, opacity: canLeft ? 1 : 0 }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 transition-opacity duration-300"
          style={{ background: fadeRight, opacity: canRight ? 1 : 0 }}
        />

        <button
          onClick={() => trackRef.current?.scrollBy({ left: -SCROLL_AMT, behavior: 'smooth' })}
          className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
          style={navBtnStyle(canLeft)}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => trackRef.current?.scrollBy({ left: SCROLL_AMT, behavior: 'smooth' })}
          className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
          style={navBtnStyle(canRight)}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={trackRef}
          className="wu-no-scrollbar flex gap-3 overflow-x-auto px-6 py-5"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {items.map((post, i) =>
            post
              ? <IUCNCard key={post.id} post={post} statusConfig={statusConfig} index={i} />
              : <SkeletonCard key={i} isLight={isLight} />
          )}
        </div>
      </div>
    </div>
  );
}

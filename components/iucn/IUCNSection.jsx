'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import { db } from '@/lib/storage/db';
import { Container } from '@/components/ui/Container';
import { IUCNRow } from './IUCNRow';
import { IUCN_CONFIG, IUCN_ORDER } from './iucnConfig';

const DARK_BG = '#030803';
const FADE_MS = 220;

function StatusButton({ cfg, active, count, onClick, isLight }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center gap-1 rounded-xl px-2.5 py-2.5 md:px-4 md:py-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      style={{
        background: active
          ? `${cfg.color}1e`
          : isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${active ? cfg.color + '70' : isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.09)'}`,
        boxShadow: active
          ? `0 0 28px ${cfg.glow}, 0 0 10px ${cfg.color}28, inset 0 0 16px ${cfg.color}0a`
          : isLight ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
        minWidth: 'clamp(50px, 12vw, 60px)',
        cursor: 'pointer',
        transition: 'background 250ms ease-out, border-color 250ms ease-out, box-shadow 300ms ease-out, transform 150ms ease-out',
        '--tw-ring-color': cfg.color,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.transform = 'scale(1.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseDown={(e)  => { e.currentTarget.style.transform = 'scale(0.94)'; }}
      onMouseUp={(e)    => { e.currentTarget.style.transform = 'scale(1.06)'; }}
    >
      {active && (
        <span
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ boxShadow: `0 0 20px ${cfg.color}45`, animation: 'wu-glowPulse 2s ease-in-out infinite' }}
        />
      )}

      <span
        className="relative text-[13px] font-black tracking-[0.1em]"
        style={{
          color: active ? cfg.textColor : isLight ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.52)',
          transition: 'color 250ms ease-out',
          textShadow: active ? `0 0 14px ${cfg.color}80` : 'none',
        }}
      >
        {cfg.code}
      </span>

      {count !== undefined && (
        <span
          className="relative text-[9px] font-semibold"
          style={{
            color: active ? `${cfg.textColor}99` : isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.2)',
            transition: 'color 250ms ease-out',
          }}
        >
          {count} spp
        </span>
      )}
    </button>
  );
}

export function IUCNSection() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLight = mounted ? resolvedTheme === 'light' : false;

  const [grouped,  setGrouped]  = useState({});
  const [status,   setStatus]   = useState('loading');
  const [activeCode,   setActiveCode]   = useState(null);
  const [renderedCode, setRenderedCode] = useState(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const timerRef   = useRef(null);
  const sectionRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.06 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const all = await db.posts.listAllWithIUCN();
      const groups = {};
      for (const post of all) {
        const s = post.iucnStatus;
        if (!groups[s]) groups[s] = [];
        groups[s].push(post);
      }
      for (const s of Object.keys(groups)) {
        groups[s].sort((a, b) => (b.views || 0) - (a.views || 0));
      }
      setGrouped(groups);
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('wu:storage-changed', loadData);
    return () => window.removeEventListener('wu:storage-changed', loadData);
  }, [loadData]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleStatusClick = (code) => {
    clearTimeout(timerRef.current);

    if (code === activeCode) {
      setActiveCode(null);
      setPanelVisible(false);
      timerRef.current = setTimeout(() => setRenderedCode(null), FADE_MS);
      return;
    }

    if (!renderedCode) {
      setActiveCode(code);
      setRenderedCode(code);
      timerRef.current = setTimeout(() => setPanelVisible(true), 20);
      return;
    }

    setPanelVisible(false);
    timerRef.current = setTimeout(() => {
      setActiveCode(code);
      setRenderedCode(code);
      timerRef.current = setTimeout(() => setPanelVisible(true), 20);
    }, FADE_MS);
  };

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: isLight ? 'var(--color-bg)' : DARK_BG }}
    >
      {/* Dark mode only: top/bottom blends */}
      {!isLight && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44"
            style={{ background: `linear-gradient(to bottom, var(--color-bg) 0%, rgba(3,8,3,0.55) 58%, ${DARK_BG} 100%)` }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44"
            style={{ background: `linear-gradient(to top, var(--color-bg) 0%, rgba(3,8,3,0.55) 58%, ${DARK_BG} 100%)` }} />
        </>
      )}

      {/* Grid texture */}
      <div className="pointer-events-none absolute inset-0"
        style={{
          opacity: isLight ? 0.018 : 0.03,
          backgroundImage: `
            repeating-linear-gradient(0deg,  transparent, transparent 39px, rgba(0,128,0,0.5) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0,128,0,0.5) 40px)
          `,
        }}
      />

      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-1/4 top-1/3 h-96 w-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, #dc2020, transparent)', opacity: isLight ? 0.06 : 0.04 }} />
      <div className="pointer-events-none absolute right-1/4 bottom-1/3 h-80 w-80 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, #28a028, transparent)', opacity: isLight ? 0.07 : 0.04 }} />

      {/* Active status bottom glow */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
        style={{
          background: activeCode
            ? `radial-gradient(ellipse at 50% 100%, ${IUCN_CONFIG[activeCode].color}${isLight ? '18' : '12'}, transparent 70%)`
            : 'none',
          transition: `background ${FADE_MS * 1.5}ms ease-out`,
        }}
      />

      {/* ── CONTENT ── */}
      <div
        className="relative z-10 py-12 md:py-16"
        style={{
          opacity:   inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.7s ease-out, transform 0.7s ease-out',
        }}
      >
        <Container>
          {/* ── SECTION HEADER ── */}
          <div className="mb-10 text-center">
            <p
              className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'rgba(40,160,40,0.9)' }}
            >
              <span className="inline-block h-px w-8" style={{ background: 'rgba(40,160,40,0.6)' }} />
              International Union for Conservation of Nature
              <span className="inline-block h-px w-8" style={{ background: 'rgba(40,160,40,0.6)' }} />
            </p>

            <h2
              className="font-display text-4xl font-black leading-none tracking-tight sm:text-5xl md:text-6xl"
              style={{ color: isLight ? 'var(--color-fg)' : '#f0f4f0' }}
            >
              IUCN RedList Species
            </h2>

            <p
              className="mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base"
              style={{ color: isLight ? 'var(--color-fg-soft)' : 'rgba(255,255,255,0.45)' }}
            >
              The world&apos;s most comprehensive inventory of the global conservation status
              of biological species — updated continuously since 1964.
            </p>

            <div
              className="mx-auto mt-6 h-px max-w-2xl"
              style={{
                background: isLight
                  ? 'linear-gradient(to right, transparent, rgba(0,0,0,0.10), transparent)'
                  : 'linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent)',
              }}
            />

            {/* ── STATUS BUTTONS ── */}
            <div className="mt-8 flex flex-wrap justify-center gap-2 md:gap-3">
              {IUCN_ORDER.map((code) => (
                <StatusButton
                  key={code}
                  cfg={IUCN_CONFIG[code]}
                  active={activeCode === code}
                  count={status === 'ready' ? (grouped[code]?.length ?? 0) : undefined}
                  onClick={() => handleStatusClick(code)}
                  isLight={isLight}
                />
              ))}
            </div>

            <p className="mt-4 text-[11px]"
              style={{ color: isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.22)' }}
            >
              {activeCode
                ? `Showing ${IUCN_CONFIG[activeCode].label} species — click again to close`
                : 'Select a conservation status above to explore species'}
            </p>
          </div>

          {/* ── PANEL ── */}
          {renderedCode && (
            <div
              className="mb-10"
              style={{
                opacity:         panelVisible ? 1 : 0,
                transform:       panelVisible ? 'translateY(0) scaleY(1)' : 'translateY(-10px) scaleY(0.97)',
                transformOrigin: 'top center',
                transition:      `opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out`,
              }}
            >
              <IUCNRow
                statusConfig={IUCN_CONFIG[renderedCode]}
                species={grouped[renderedCode] || []}
                loading={status === 'loading'}
                isLight={isLight}
              />
            </div>
          )}

          {/* ── FOOTER ── */}
          <div className="mt-4 text-center">
            <p className="text-[11px]"
              style={{ color: isLight ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.18)' }}
            >
              Species data sourced from IUCN Red List of Threatened Species™ &nbsp;·&nbsp;
              Data shown for educational purposes
            </p>
          </div>
        </Container>
      </div>
    </section>
  );
}

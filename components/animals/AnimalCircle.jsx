'use client';

import { useState } from 'react';
import Link from 'next/link';

function resolveSrc(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  const s = cover.sources;
  return s?.length ? s[s.length - 1]?.src || null : null;
}

const SIZE_CONFIG = {
  xl:     { diameter: 300, nameClass: 'text-xl font-black',              badge: 'text-xs px-3 py-1',         glow: 40 },
  large:  { diameter: 215, nameClass: 'text-base font-bold',             badge: 'text-[10px] px-2.5 py-0.5', glow: 28 },
  medium: { diameter: 152, nameClass: 'text-sm font-bold',               badge: 'text-[9px] px-2 py-0.5',    glow: 20 },
  small:  { diameter: 82,  nameClass: 'text-[10px] font-semibold leading-tight', badge: 'hidden',            glow: 12 },
  fluid:  { diameter: null, nameClass: 'text-sm font-bold',              badge: 'text-[9px] px-2 py-0.5',    glow: 20 },
};

export function AnimalCircle({ post, size = 'medium', index = 0, style }) {
  const cfg     = SIZE_CONFIG[size] || SIZE_CONFIG.medium;
  const src     = resolveSrc(post.cover);
  const palette = post.coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' };
  const label   = post.label || post.category || '';
  const isFluid = size === 'fluid';
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = src && !imgFailed;

  const fixedStyle = !isFluid
    ? { width: cfg.diameter, height: cfg.diameter, minWidth: cfg.diameter, minHeight: cfg.diameter }
    : {};

  /* Shortened display name: first 2 words max */
  const shortName = post.title.split(' ').slice(0, 2).join(' ');

  return (
    <Link
      href={`/posts/${post.slug}`}
      className={`group relative block cursor-pointer ${isFluid ? 'w-full' : 'shrink-0'}`}
      style={{
        ...(isFluid ? { aspectRatio: '1' } : fixedStyle),
        animation: 'wu-fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both',
        animationDelay: `${index * 100}ms`,
        ...style,
      }}
      title={post.title}
    >
      {/* Circle shell */}
      <div
        className="relative h-full w-full overflow-hidden transition-all duration-500 group-hover:scale-[1.07]"
        style={{
          ...fixedStyle,
          borderRadius: '50%',
          boxShadow: `0 4px ${cfg.glow}px rgba(0,0,0,0.18), 0 0 0 2px rgba(0,128,0,0.18)`,
        }}
      >
        {/* ── Background: image or gradient fallback ── */}
        {showImage ? (
          <img
            src={src}
            alt={post.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(145deg, ${palette.from} 0%, ${palette.via} 55%, ${palette.to} 100%)`,
            }}
          >
            {/* Radial light reflection */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.28) 0%, transparent 58%)',
              }}
            />
            {/* Large initial — subtle watermark */}
            <div className="absolute inset-0 flex items-center justify-center select-none">
              <span
                className="font-black leading-none"
                style={{
                  fontSize: 'clamp(28px, 38%, 56px)',
                  color: palette.to,
                  opacity: 0.22,
                  textShadow: `0 2px 8px ${palette.from}`,
                }}
              >
                {post.title.slice(0, 1).toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* ── Persistent name label (no-image only) ── */}
        {!showImage && (
          <div
            className="absolute inset-x-0 bottom-0 flex items-end justify-center"
            style={{
              padding: '0 8% 13%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0) 100%)',
            }}
          >
            <p
              className="w-full text-center text-[9px] font-semibold leading-tight text-white/90"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}
            >
              {shortName}
            </p>
          </div>
        )}

        {/* ── Hover overlay: badge + full title ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.62)',
            backdropFilter: 'blur(2px)',
          }}
        >
          {label && size !== 'small' && (
            <div className="absolute" style={{ top: '14%' }}>
              <span
                className={`rounded-full bg-[#008000]/90 font-semibold text-white backdrop-blur-sm ${cfg.badge}`}
              >
                {label}
              </span>
            </div>
          )}
          <p
            className="text-center text-white"
            style={{
              textShadow: '0 1px 6px rgba(0,0,0,0.95)',
              maxWidth: '82%',
              fontSize: post.title.length <= 12 ? '13px'
                      : post.title.length <= 22 ? '11px'
                      : post.title.length <= 32 ? '10px' : '9px',
              fontWeight: 700,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              padding: '0 6%',
            }}
          >
            {post.title}
          </p>
        </div>

        {/* Glow ring on hover */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ boxShadow: 'inset 0 0 0 3px rgba(0,200,80,0.55)' }}
        />
      </div>
    </Link>
  );
}

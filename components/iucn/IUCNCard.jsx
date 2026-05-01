import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const CATEGORY_LABELS = {
  animals: 'Animal',
  birds:   'Bird',
  plants:  'Plant',
  insects: 'Insect',
  fish:    'Fish',
};

function resolveSrc(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  return cover.sources?.[cover.sources.length - 1]?.src || null;
}

export function IUCNCard({ post, statusConfig, index = 0 }) {
  const { color, textColor, badgeBg, glow, code } = statusConfig;
  const palette = post.coverPalette || { from: '#0a0a0a', via: '#1a1a1a', to: '#2a2a2a' };
  const src     = resolveSrc(post.cover);
  const catTag  = CATEGORY_LABELS[post.category] || post.label;
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="block shrink-0 cursor-pointer"
      style={{
        width: 'clamp(180px, 72vw, 280px)',
        scrollSnapAlign: 'start',
        animation: `wu-slideInX 0.45s cubic-bezier(0.22,1,0.36,1) both`,
        animationDelay: `${Math.min(index * 55, 380)}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* overflow-hidden clips the title when it's pushed downward */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          aspectRatio: '16 / 9',
          boxShadow: hovered
            ? `0 16px 48px rgba(0,0,0,0.6), 0 0 32px ${glow}`
            : '0 4px 24px rgba(0,0,0,0.45)',
          transform: hovered ? 'scale(1.03) translateY(-2px)' : 'scale(1) translateY(0)',
          transition: 'transform 220ms ease-out, box-shadow 260ms ease-out',
        }}
      >
        {/* Status color bar */}
        <div
          className="absolute top-0 inset-x-0 h-[2px] z-20"
          style={{ background: `linear-gradient(to right, ${color}, ${color}70)` }}
        />

        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 55%, ${palette.to} 100%)`,
          }}
        />

        {/* Cover image */}
        {src && (
          <Image
            src={src}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 80vw, 300px"
            className="object-cover"
            style={{
              transform: hovered ? 'scale(1.07)' : 'scale(1)',
              transition: 'transform 600ms cubic-bezier(0.22,1,0.36,1)',
            }}
            loading="lazy"
          />
        )}

        {/* Vignette */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12) 0%, transparent 55%)',
          }}
        />

        {/* Bottom scrim — deepens on hover to keep text readable */}
        <div
          className="absolute inset-0"
          style={{
            background: hovered
              ? `linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.72) 52%, rgba(0,0,0,0.12) 78%, transparent 100%)`
              : `linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.48) 40%, rgba(0,0,0,0.06) 68%, transparent 100%)`,
            transition: 'background 300ms ease-out',
          }}
        />

        {/* Top-left: IUCN badge */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span
            className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-widest"
            style={{
              background: badgeBg,
              color: textColor,
              border: `1px solid ${color}45`,
              backdropFilter: 'blur(6px)',
              boxShadow: `0 0 8px ${color}20`,
            }}
          >
            {code}
          </span>
        </div>

        {/* Top-right: Category tag */}
        {catTag && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span
              className="inline-block rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
              style={{
                background: 'rgba(0,0,0,0.55)',
                color: 'rgba(255,255,255,0.65)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {catTag}
            </span>
          </div>
        )}

        {/*
          Content block — default: pushed DOWN so title peeks at the very bottom edge.
          Hover: slides UP to full position and description becomes visible.
          overflow-hidden on the parent clips whatever goes below the card boundary.
        */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 p-3"
          style={{
            transform: hovered ? 'translateY(0)' : 'translateY(22px)',
            transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <h4
            className="font-display text-sm font-black leading-tight text-white line-clamp-1"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.95)' }}
          >
            {post.title}
          </h4>

          <p
            className="mt-1 line-clamp-2 text-[10px] leading-relaxed"
            style={{
              color: 'rgba(255,255,255,0.68)',
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'translateY(0)' : 'translateY(4px)',
              transition: 'opacity 220ms ease-out 60ms, transform 220ms ease-out 60ms',
            }}
          >
            {post.description}
          </p>
        </div>

        {/* Hover glow ring */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            boxShadow: hovered ? `inset 0 0 0 1.5px ${color}60` : `inset 0 0 0 1.5px ${color}00`,
            transition: 'box-shadow 250ms ease-out',
          }}
        />

        {/* Color shimmer */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(125deg, transparent 40%, ${color}07 60%, transparent 70%)`,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 300ms ease-out',
          }}
        />
      </div>
    </Link>
  );
}

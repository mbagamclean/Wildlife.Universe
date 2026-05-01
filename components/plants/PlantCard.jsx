import Link from 'next/link';
import Image from 'next/image';

const LABEL_COLORS = {
  Trees:       { bg: 'rgba(10,60,10,0.82)',   text: '#7ddf8a' },
  Carnivorous: { bg: 'rgba(60,10,10,0.82)',   text: '#f08080' },
  Aquatic:     { bg: 'rgba(10,20,70,0.82)',   text: '#80b0f8' },
  Rare:        { bg: 'rgba(40,10,60,0.82)',   text: '#c090f8' },
  Parasitic:   { bg: 'rgba(60,10,20,0.82)',   text: '#f09090' },
  Endemic:     { bg: 'rgba(60,20,20,0.82)',   text: '#e09070' },
  Ecosystems:  { bg: 'rgba(10,50,40,0.82)',   text: '#70d0b8' },
  default:     { bg: 'rgba(10,50,10,0.82)',   text: '#90d890' },
};

function resolveCoverSrc(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  return cover.sources?.[cover.sources.length - 1]?.src || null;
}

export function PlantCard({ post, index = 0 }) {
  const palette  = post.coverPalette || { from: '#031a0d', via: '#0c4a1a', to: '#3aa15a' };
  const src      = resolveCoverSrc(post.cover);
  const labelCfg = LABEL_COLORS[post.label] || LABEL_COLORS.default;

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="group block shrink-0"
      style={{
        width: 'clamp(220px, 30vw, 300px)',
        minWidth: 0,
        animation: `wu-fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both`,
        animationDelay: `${Math.min(index, 6) * 80}ms`,
      }}
    >
      {/* Card shell — overflow-hidden clips the content block that is pushed down */}
      <div
        className="relative overflow-hidden rounded-2xl transition-shadow duration-500
                   group-hover:shadow-[0_20px_56px_rgba(0,0,0,0.30)]"
        style={{ aspectRatio: '3 / 4' }}
      >
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, ${palette.from} 0%, ${palette.via} 55%, ${palette.to} 100%)`,
          }}
        />

        {/* Cover image */}
        {src && (
          <Image
            src={src}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 72vw, (max-width: 1024px) 46vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />
        )}

        {/* Botanical shine overlay */}
        <div
          className="absolute inset-0 opacity-[0.07] transition-opacity duration-500 group-hover:opacity-[0.03]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 20%, rgba(255,255,255,0.6) 0%, transparent 40%),
              radial-gradient(circle at 75% 75%, rgba(255,255,255,0.3) 0%, transparent 35%)
            `,
          }}
        />

        {/* Base scrim */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top,
              rgba(0,0,0,0.80) 0%,
              rgba(0,0,0,0.44) 36%,
              rgba(0,0,0,0.10) 60%,
              transparent 100%)`,
          }}
        />

        {/* Deeper scrim on hover — makes description text readable */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `linear-gradient(to top,
              rgba(0,0,0,0.96) 0%,
              rgba(0,0,0,0.70) 48%,
              rgba(0,0,0,0.20) 72%,
              transparent 100%)`,
          }}
        />

        {/* Label badge — always visible at top, never moves */}
        <div className="absolute top-3 left-3 z-10">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest backdrop-blur-sm"
            style={{
              background: labelCfg.bg,
              color: labelCfg.text,
              border: `1px solid ${labelCfg.text}22`,
            }}
          >
            {post.label}
          </span>
        </div>

        {/*
          Content block — title → description → button, in that order top-to-bottom.

          Default (no hover):
            Pushed down 82px so only the title (~24px) sits ~20px above the card bottom.
            Description and button are below the card edge, hidden by overflow-hidden.

          Hover:
            Slides up to translate-y-0. Title rises and is now fully visible higher up.
            Description fades in below the title. Button fades in below description.

          All three items keep their natural height at all times — no max-height tricks —
          so the slide is a pure transform and stays perfectly smooth.
        */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4
                     translate-y-[82px] transition-transform duration-300
                     group-hover:translate-y-0"
          style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
        >
          {/* 1 — Title (always visible near bottom on no-hover, rises on hover) */}
          <h3
            className="font-display text-base font-black leading-snug text-white sm:text-lg"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
          >
            {post.title}
          </h3>

          {/* 2 — Description (below title, fades in on hover) */}
          <p
            className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/75
                       opacity-0 transition-opacity duration-250 group-hover:opacity-100"
            style={{ transitionDelay: '80ms' }}
          >
            {post.description}
          </p>

          {/* 3 — Discover button (below description, fades in on hover with slight delay) */}
          <div
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold
                       opacity-0 transition-opacity duration-250 group-hover:opacity-100"
            style={{ color: '#7ddf8a', transitionDelay: '130ms' }}
          >
            Discover
            <svg
              className="h-3 w-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </div>
        </div>

        {/* Hover ring */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0
                     transition-opacity duration-500 group-hover:opacity-100"
          style={{ boxShadow: 'inset 0 0 0 1.5px rgba(125,223,138,0.35)' }}
        />
      </div>
    </Link>
  );
}

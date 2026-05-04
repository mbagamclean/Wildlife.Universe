import Link from 'next/link';
import { ShareButton } from '@/components/ui/ShareButton';
import { ResponsiveImage } from '@/components/ui/ResponsiveImage';
import { User } from 'lucide-react';

const BADGE_MAP = {
  animals:    ['#1a5c34', '#2e9958'],
  birds:      ['#0a4a9c', '#1a72d8'],
  plants:     ['#1b5e20', '#43a047'],
  insects:    ['#5e1a8c', '#9333c0'],
  mammals:    ['#7c3210', '#c05220'],
  raptors:    ['#b84000', '#e06018'],
  amphibians: ['#006060', '#1a9e9e'],
  trees:      ['#1b4d20', '#3a8040'],
  fish:       ['#00458c', '#1070c0'],
  reptiles:   ['#4d5800', '#7a8c00'],
  arachnids:  ['#5c1a6e', '#9428b0'],
  marine:     ['#003c6e', '#0c6eba'],
};

function badgeStyle(post) {
  const key = (post.label || post.category || '').toLowerCase().trim();
  const c = BADGE_MAP[key];
  return c
    ? `linear-gradient(135deg, ${c[0]} 0%, ${c[1]} 100%)`
    : 'linear-gradient(135deg, #006000 0%, #3a9e3a 100%)';
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

function hasCover(cover) {
  if (!cover) return false;
  if (typeof cover === 'string') return true;
  return Array.isArray(cover.sources) && cover.sources.length > 0;
}

export function LatestPostCard({ post, index = 0 }) {
  const gradient = badgeStyle(post);
  const palette  = post.coverPalette || { from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' };
  const showCover = hasCover(post.cover);
  const label    = post.label || post.category || '';

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="group block h-full"
      style={{
        animation: 'wu-fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both',
        animationDelay: `${index * 95}ms`,
      }}
    >
      <article
        className="flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-500
                   group-hover:shadow-[0_16px_40px_rgba(0,128,0,0.14)]"
        style={{
          background: 'var(--color-bg-deep)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07), 0 0 0 1px var(--glass-border)',
        }}
      >
        {/* ─── IMAGE ─────────────────────────────── */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {showCover ? (
            <ResponsiveImage
              media={post.cover}
              alt={post.title || ''}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.2,1,0.2,1)]
                         group-hover:scale-[1.15]"
            />
          ) : (
            <div
              className="h-full w-full transition-transform duration-[600ms] ease-[cubic-bezier(0.2,1,0.2,1)] group-hover:scale-[1.15]"
              style={{
                background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 52%, ${palette.to} 100%)`,
              }}
            >
              {/* inner sheen */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 28% 28%, rgba(255,255,255,0.28) 0%, transparent 62%)',
                }}
              />
            </div>
          )}

          {/* Subtle image vignette */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 50%)',
            }}
          />

          {/* ─── CATEGORY BADGE ──────────────────── */}
          {label && (
            <span
              className="absolute left-3 top-3 rounded-full px-3 py-[5px] text-[11px]
                         font-semibold tracking-wide text-white shadow-md
                         transition-transform duration-300 group-hover:scale-105"
              style={{ background: gradient }}
            >
              {label}
            </span>
          )}
        </div>

        {/* ─── BODY ──────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-2.5 px-5 pb-5 pt-4">
          <h3
            className="font-display text-[1.25rem] font-bold leading-snug line-clamp-2
                       text-[var(--color-fg)] transition-colors duration-300
                       group-hover:text-[var(--color-primary)]"
          >
            {post.title}
          </h3>

          <p className="text-[0.95rem] leading-relaxed text-[var(--color-fg-soft)] line-clamp-3">
            {post.description}
          </p>

          {/* ─── META ──────────────────────────────── */}
          <div
            className="mt-auto flex items-center justify-between pt-3.5
                       text-[0.85rem] text-[var(--color-fg-soft)]"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            {/* Left Side: Date alone */}
            <time dateTime={post.createdAt} className="opacity-80">
              {fmtDate(post.createdAt)}
            </time>

            {/* Right Side: Publisher logic + Share */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium">
                <User className="h-3 w-3 opacity-70" />
                {post.author?.name || 'Wildlife Universe'}
              </span>
              <span className="flex items-center" style={{ zIndex: 10 }}>
                <ShareButton title={post.title} slug={post.slug} className="h-6 w-6 text-[var(--color-fg-soft)] hover:text-white" />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ShareButton } from '@/components/ui/ShareButton';
import { GlassPanel } from '@/components/ui/GlassPanel';

export function PostCard({ post }) {
  const palette = post.coverPalette || {
    from: '#0c4a1a',
    via: '#3aa15a',
    to: '#d4af37',
  };
  return (
    <Link href={`/posts/${post.slug}`} className="group block">
      <GlassPanel className="flex h-full flex-col overflow-hidden p-0 transition-all duration-500 hover:scale-[1.02] hover:border-[var(--color-primary)]/40 hover:shadow-2xl hover:shadow-[var(--color-primary)]/15">
        <div
          className="relative aspect-[16/10] overflow-hidden"
          style={{
            background: post.cover
              ? undefined
              : `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 55%, ${palette.to} 100%)`,
          }}
        >
          {post.cover ? (
            typeof post.cover === 'string' ? (
              <img
                src={post.cover}
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : post.cover.type === 'video' ? (
              <video
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                autoPlay
                muted
                loop
                playsInline
              >
                {post.cover.sources?.map((s, i) => (
                  <source key={i} src={s.src} type={s.type} />
                ))}
              </video>
            ) : (
              <picture>
                {(post.cover.sources || []).slice(0, -1).map((s, i) => (
                  <source key={i} srcSet={s.src} type={s.type} />
                ))}
                <img
                  src={post.cover.sources?.[Math.max(0, (post.cover.sources?.length || 1) - 1)]?.src || ''}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </picture>
            )
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_60%)]" />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            {post.label || post.category}
          </span>
          {post.featured && (
            <span className="absolute right-3 top-3 rounded-full bg-[var(--color-gold)]/90 px-2.5 py-1 text-xs font-semibold text-[#1a1208] backdrop-blur">
              Featured
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-6">
          <h3 className="font-display text-xl font-bold leading-snug text-balance text-[var(--color-fg)]">
            {post.title}
          </h3>
          <p className="line-clamp-3 text-sm text-[var(--color-fg-soft)] text-balance">
            {post.description}
          </p>
          <div className="mt-auto flex items-center justify-between pointer-events-auto">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-transform group-hover:translate-x-0.5">
              View Post <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="z-10">
              <ShareButton title={post.title} slug={post.slug} className="h-7 w-7 text-[var(--color-fg-soft)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10" />
            </span>
          </div>
        </div>
      </GlassPanel>
    </Link>
  );
}

import { ImageResponse } from 'next/og';
import { fetchPostBySlug } from '@/lib/seo-data';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';
export const alt = `${SITE_NAME} — story`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function pickCoverUrl(post) {
  const cover = post?.cover;
  if (!cover) return null;
  if (typeof cover === 'string') {
    if (/^https?:\/\//i.test(cover)) return cover;
    return `${SITE_URL}${cover.startsWith('/') ? '' : '/'}${cover}`;
  }
  if (cover?.type === 'video') return null;
  const src = cover?.sources?.[cover?.sources?.length - 1]?.src;
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
}

function clampTitle(s, max = 90) {
  if (!s) return 'Untitled';
  const t = String(s).trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export default async function PostOG({ params }) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug).catch(() => null);

  // Fallback "not found" image — still 1200x630 so consumers don't break.
  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'linear-gradient(135deg, #061206 0%, #0f3818 50%, #1a4a10 100%)',
            color: '#ffffff',
            fontFamily: 'Helvetica, Arial, sans-serif',
          }}
        >
          <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: '-0.03em', display: 'flex' }}>
            Wildlife Universe
          </div>
          <div style={{ marginTop: 18, fontSize: 28, color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
            Story not found
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const coverUrl = pickCoverUrl(post);
  const title = clampTitle(post.title || 'Untitled', 100);
  const category = (post.category || '').toString().toUpperCase();
  const label = post.label ? String(post.label).toUpperCase() : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background:
            'linear-gradient(135deg, #061206 0%, #0f3818 50%, #1a4a10 100%)',
          color: '#ffffff',
          fontFamily: 'Helvetica, Arial, sans-serif',
          overflow: 'hidden',
        }}
      >
        {coverUrl && (
          // Background cover image
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Dark gradient overlay for legibility (left → right falloff) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.30) 100%), linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            padding: '72px 80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Top: category */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {category && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 22px',
                  borderRadius: 999,
                  background: 'rgba(212,175,55,0.18)',
                  border: '2px solid rgba(212,175,55,0.55)',
                  color: '#f0d273',
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '0.22em',
                }}
              >
                {category}
              </div>
            )}
            {label && (
              <div
                style={{
                  display: 'flex',
                  padding: '10px 22px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.10)',
                  border: '2px solid rgba(255,255,255,0.20)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                }}
              >
                {label}
              </div>
            )}
          </div>

          {/* Middle: title */}
          <div
            style={{
              maxWidth: 1040,
              fontSize: title.length > 60 ? 64 : 80,
              fontWeight: 900,
              lineHeight: 1.06,
              letterSpacing: '-0.03em',
              textShadow: '0 4px 24px rgba(0,0,0,0.6)',
              display: 'flex',
            }}
          >
            {title}
          </div>

          {/* Bottom: brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'rgba(255,255,255,0.78)',
              fontSize: 22,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: '#d4af37',
                  display: 'flex',
                }}
              />
              <span style={{ fontWeight: 800, letterSpacing: '0.04em', display: 'flex' }}>
                {SITE_NAME}
              </span>
            </div>
            {post.author?.name && (
              <div style={{ display: 'flex', fontSize: 20 }}>by {post.author.name}</div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

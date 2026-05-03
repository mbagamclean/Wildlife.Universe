'use client';

import { useEffect, useRef, useMemo } from 'react';

// ── URL / source detection ───────────────────────────────────────────────────
function detectSource(src, sources) {
  if (sources?.length && !src) return { provider: 'html5', sources };
  if (!src) return null;

  if (typeof src === 'object') {
    if (src.type === 'video' && src.sources) return { provider: 'html5', sources: src.sources };
    if (src.sources) return { provider: 'html5', sources: src.sources };
    return null;
  }

  const s = src.trim();

  // YouTube — watch?v=, embed/, shorts/, live/, youtu.be/
  const yt = s.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (yt) return { provider: 'youtube', id: yt[1] };

  // Vimeo
  const vimeo = s.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { provider: 'vimeo', id: vimeo[1] };

  // TikTok
  const tiktok = s.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tiktok || s.includes('tiktok.com/')) {
    const id = tiktok?.[1] || s.match(/\/video\/(\d+)/)?.[1];
    return { provider: 'tiktok', id, rawUrl: s };
  }

  // Instagram Reel / TV
  const igReel = s.match(/instagram\.com\/(?:reel|tv)\/([A-Za-z0-9_-]+)/);
  if (igReel) return { provider: 'instagram-reel', id: igReel[1] };

  // Instagram Post
  const igPost = s.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/);
  if (igPost) return { provider: 'instagram-post', id: igPost[1] };

  // Facebook
  if (s.includes('facebook.com/') || s.includes('fb.watch/')) {
    return { provider: 'facebook', rawUrl: s };
  }

  // Twitter / X
  if (s.includes('twitter.com/') || s.includes('x.com/')) {
    return { provider: 'twitter', rawUrl: s };
  }

  // HTML5 video file
  return { provider: 'html5', url: s };
}

// ── Aspect ratios & layout constraints per provider ──────────────────────────
const PROVIDER_CONFIG = {
  youtube:           { ratio: '16/9', maxWidth: null    },
  vimeo:             { ratio: '16/9', maxWidth: null    },
  html5:             { ratio: '16/9', maxWidth: null    },
  facebook:          { ratio: '16/9', maxWidth: null    },
  twitter:           { ratio: '16/9', maxWidth: null    },
  tiktok:            { ratio: '9/16', maxWidth: '400px' },
  'instagram-reel':  { ratio: '9/16', maxWidth: '400px' },
  'instagram-post':  { ratio: '4/5',  maxWidth: '480px' },
};

function paddingFromRatio(ratioStr) {
  const [w, h] = ratioStr.split('/').map(Number);
  return `${(h / w) * 100}%`;
}

// ── Platform badge config ────────────────────────────────────────────────────
const BADGES = {
  youtube:           { label: 'YouTube',   bg: '#ff0000' },
  vimeo:             { label: 'Vimeo',     bg: '#1ab7ea' },
  tiktok:            { label: 'TikTok',    bg: '#ff0050' },
  'instagram-reel':  { label: 'Instagram', bg: '#e4405f' },
  'instagram-post':  { label: 'Instagram', bg: '#e4405f' },
  facebook:          { label: 'Facebook',  bg: '#1877f2' },
  twitter:           { label: 'X',         bg: '#000000' },
};

// ── HTML5 video via Plyr ─────────────────────────────────────────────────────
function PlyrHtml5({ url, sources, poster, autoplay, muted }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const sourcesKey = JSON.stringify(sources);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let dead = false;

    import('plyr').then(({ default: Plyr }) => {
      if (dead || !el.isConnected) return;
      playerRef.current = new Plyr(el, {
        controls: [
          'play-large', 'play', 'progress', 'current-time',
          'duration', 'mute', 'volume', 'settings', 'pip', 'fullscreen',
        ],
        settings: ['speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        autoplay: !!autoplay,
        muted: !!muted,
        resetOnEnd: false,
        keyboard: { focused: true, global: false },
        tooltips: { controls: true, seek: true },
        ratio: '16:9',
      });
    });

    return () => {
      dead = true;
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  }, [url, sourcesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <video
      ref={videoRef}
      poster={poster}
      playsInline
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      {sources
        ? sources.map((s, i) => <source key={i} src={s.src} type={s.type} />)
        : url && <source src={url} />}
    </video>
  );
}

// ── YouTube / Vimeo via Plyr ─────────────────────────────────────────────────
function PlyrEmbed({ provider, id }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let dead = false;

    import('plyr').then(({ default: Plyr }) => {
      if (dead || !el.isConnected) return;
      const target = el.querySelector('[data-plyr-provider]');
      if (!target) return;
      playerRef.current = new Plyr(target, {
        controls: [
          'play-large', 'play', 'progress', 'current-time',
          'duration', 'mute', 'volume', 'settings', 'fullscreen',
        ],
        youtube: {
          noCookie: true, rel: 0, showinfo: 0,
          iv_load_policy: 3, modestbranding: 1,
        },
        vimeo: {
          byline: false, portrait: false,
          title: false, speed: true, transparent: false,
        },
        resetOnEnd: false,
        keyboard: { focused: true, global: false },
        tooltips: { controls: true, seek: true },
      });
    });

    return () => {
      dead = true;
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  }, [provider, id]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <div
        data-plyr-provider={provider}
        data-plyr-embed-id={id}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

// ── TikTok iframe ────────────────────────────────────────────────────────────
function TikTokEmbed({ id, rawUrl }) {
  if (!id) return <SocialFallback href={rawUrl} label="TikTok" color="#ff0050" />;
  return (
    <iframe
      src={`https://www.tiktok.com/embed/v2/${id}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

// ── Instagram iframe ─────────────────────────────────────────────────────────
function InstagramEmbed({ id, type }) {
  const pathType = type === 'instagram-reel' ? 'reel' : 'p';
  return (
    <iframe
      src={`https://www.instagram.com/${pathType}/${id}/embed/`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
      allow="autoplay; encrypted-media"
      allowFullScreen
      scrolling="no"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

// ── Facebook iframe ──────────────────────────────────────────────────────────
function FacebookEmbed({ rawUrl }) {
  const fbSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(rawUrl)}&show_text=false&width=560`;
  return (
    <iframe
      src={fbSrc}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', overflow: 'hidden' }}
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      allowFullScreen
      scrolling="no"
    />
  );
}

// ── Twitter/X — no video iframe API, show a linked card ─────────────────────
function TwitterEmbed({ rawUrl }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#000', gap: 16, padding: 24,
    }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      <a
        href={rawUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#1d9bf0', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
      >
        View on X (Twitter) →
      </a>
    </div>
  );
}

// ── Generic link fallback ────────────────────────────────────────────────────
function SocialFallback({ href, label, color }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#000',
        color, textDecoration: 'none', gap: 8, fontSize: 14, fontWeight: 700,
      }}
    >
      Watch on {label} →
    </a>
  );
}

// ── Main VideoPlayer export ──────────────────────────────────────────────────
/**
 * Universal video player.
 *
 * Accepts:
 *   src        – URL string (YouTube, Vimeo, TikTok, Instagram, Facebook, X, or direct .mp4/.webm)
 *              – or upload-API object { type:'video', sources:[{src,type}] }
 *   sources    – array of {src, type} for HTML5 multi-source
 *   poster     – poster image URL (HTML5 only)
 *   aspectRatio – override, e.g. '16/9', '9/16', '4/5', '1/1'
 *   autoplay   – boolean
 *   muted      – boolean
 *   rounded    – add border-radius (default true)
 *   showBadge  – show platform badge (default true)
 *   className  – outer wrapper class
 */
export function VideoPlayer({
  src,
  sources,
  poster,
  className = '',
  aspectRatio,
  autoplay,
  muted,
  rounded = true,
  showBadge = true,
}) {
  const info = useMemo(
    () => detectSource(src, sources),
    [src, JSON.stringify(sources)] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!info) return null;

  const cfg     = PROVIDER_CONFIG[info.provider] || PROVIDER_CONFIG.html5;
  const ratio   = aspectRatio || cfg.ratio;
  const maxW    = cfg.maxWidth;
  const padTop  = paddingFromRatio(ratio);
  const badge   = showBadge ? BADGES[info.provider] : null;

  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: maxW || undefined,
        margin: maxW ? '0 auto' : undefined,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: padTop,
          background: '#000',
          borderRadius: rounded ? 12 : 0,
          overflow: 'hidden',
        }}
      >
        {/* ── Provider renderers ── */}
        {info.provider === 'html5' && (
          <PlyrHtml5
            url={info.url}
            sources={info.sources}
            poster={poster}
            autoplay={autoplay}
            muted={muted}
          />
        )}

        {(info.provider === 'youtube' || info.provider === 'vimeo') && (
          <PlyrEmbed provider={info.provider} id={info.id} />
        )}

        {info.provider === 'tiktok' && (
          <TikTokEmbed id={info.id} rawUrl={info.rawUrl} />
        )}

        {(info.provider === 'instagram-reel' || info.provider === 'instagram-post') && (
          <InstagramEmbed id={info.id} type={info.provider} />
        )}

        {info.provider === 'facebook' && (
          <FacebookEmbed rawUrl={info.rawUrl} />
        )}

        {info.provider === 'twitter' && (
          <TwitterEmbed rawUrl={info.rawUrl} />
        )}

        {/* ── Platform badge ── */}
        {badge && (
          <div style={{
            position: 'absolute', top: 10, left: 10, zIndex: 10,
            padding: '3px 8px', borderRadius: 5,
            background: badge.bg, color: '#fff',
            fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
            textTransform: 'uppercase', pointerEvents: 'none',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}>
            {badge.label}
          </div>
        )}
      </div>
    </div>
  );
}

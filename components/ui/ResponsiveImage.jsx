/**
 * Renders a media object produced by /api/upload as a fully responsive
 * <picture>: AVIF preferred, WebP fallback, original-resolution and any
 * capped variants (e.g. 1600w) emitted in a srcset so the browser picks
 * the smallest file that still serves the layout cleanly.
 *
 * Props:
 *   media   — { type: 'image', sources, responsive, width, height } from upload,
 *             OR a plain URL string (legacy).
 *   alt     — accessible alt text.
 *   sizes   — CSS sizes attribute. Default targets full-width-or-1600 layouts.
 *   loading — 'lazy' (default) | 'eager' (above the fold)
 *   decoding — 'async' (default) | 'sync'
 *   className, style, etc. — forwarded to the <img>.
 */
export function ResponsiveImage({
  media,
  alt = '',
  className = '',
  sizes = '(max-width: 1600px) 100vw, 1600px',
  loading = 'lazy',
  decoding = 'async',
  ...rest
}) {
  if (!media) return null;

  // Legacy: a plain URL string
  if (typeof media === 'string') {
    return (
      <img
        src={media}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
        {...rest}
      />
    );
  }

  if (media.type !== 'image') return null;

  const { sources = [], responsive = {}, width, height } = media;

  // Sort responsive widths low → high so srcset is well-ordered
  const widths = Object.keys(responsive).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  function srcset(mime) {
    const parts = [];
    for (const w of widths) {
      const src = responsive[w]?.find((s) => s.type === mime)?.src;
      if (src) parts.push(`${src} ${w}w`);
    }
    const orig = sources.find((s) => s.type === mime)?.src;
    if (orig && width) parts.push(`${orig} ${width}w`);
    else if (orig) parts.push(orig);
    return parts.join(', ');
  }

  const avifSrcset = srcset('image/avif');
  const webpSrcset = srcset('image/webp');
  const fallbackSrc =
    sources.find((s) => s.type === 'image/webp')?.src
    || sources.find((s) => s.type === 'image/avif')?.src
    || sources[0]?.src;

  return (
    <picture>
      {avifSrcset && <source type="image/avif" srcSet={avifSrcset} sizes={sizes} />}
      {webpSrcset && <source type="image/webp" srcSet={webpSrcset} sizes={sizes} />}
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        width={width || undefined}
        height={height || undefined}
        loading={loading}
        decoding={decoding}
        {...rest}
      />
    </picture>
  );
}

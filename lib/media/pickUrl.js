/**
 * Single source of truth for resolving the various shapes the upload
 * pipeline emits down to a single string URL we can safely drop into
 * <img src=…> or <video poster=…>.
 *
 * Why this exists: heroes.src and heroes.poster (and posts.cover) are
 * JSONB columns that can hold either a legacy string URL or a full
 * upload-result object — { type, sources:[{src,type}], poster, … }.
 * Several render sites used to do `<img src={value}>` directly on the
 * raw value, which produced the literal string "[object Object]" when
 * the value was an object — the broken-image icon you'd see in the
 * admin and on the homepage. This helper is the choke point.
 *
 * The helper deliberately rejects video URLs (.mp4 / .webm / .mov / …)
 * — those are never valid as image src or poster URLs and would only
 * produce a broken icon.
 */

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogg|m3u8|mkv)(\?|#|$)/i;

function isImageUrl(s) {
  if (typeof s !== 'string' || s.length === 0) return false;
  // Only http(s), protocol-relative, root-relative, or data: URLs are
  // legitimate <img src=…> values. This rejects accidentally-stringified
  // JSON ("{...}"), object-toString output ("[object Object]"), and
  // anything else that would produce a broken-image icon.
  if (!/^(https?:|\/\/|\/|data:image\/)/i.test(s)) return false;
  return !VIDEO_EXT_RE.test(s);
}

/**
 * Pull a string image URL out of any shape the upload/storage layer
 * produces. Returns '' when no usable URL is found — callers must
 * guard against the empty string before rendering an <img>.
 */
export function resolveImageUrl(v) {
  if (!v) return '';

  if (typeof v === 'string') {
    return isImageUrl(v) ? v : '';
  }

  if (typeof v === 'object') {
    // Video upload-result objects expose their auto-generated poster
    // at .poster. Always take that first — it's already a string URL.
    if (typeof v.poster === 'string' && isImageUrl(v.poster)) return v.poster;

    // Image upload-result objects expose their AVIF + WebP variants in
    // .sources. We pick the LAST source because the pipeline orders
    // them avif → webp, and WebP has the broadest support of the two.
    const sources = Array.isArray(v.sources) ? v.sources : null;
    if (sources && sources.length > 0) {
      // Prefer any source that looks like an image; the last source
      // first, then walk back. Skip video sources entirely.
      for (let i = sources.length - 1; i >= 0; i--) {
        const s = sources[i];
        const url = s && typeof s.src === 'string' ? s.src : '';
        if (isImageUrl(url)) return url;
      }
    }

    // Some legacy shapes use .url instead of .src.
    if (typeof v.url === 'string' && isImageUrl(v.url)) return v.url;
    if (typeof v.src === 'string' && isImageUrl(v.src)) return v.src;
  }

  return '';
}

/**
 * Pick the right poster URL for a hero / slide. Prefers the admin's
 * uploaded poster image, falls back to the auto-generated poster the
 * video transcode pipeline produces, falls back to nothing. Use for
 * both <video poster=…> and the carousel card thumbnail.
 */
export function pickHeroPosterUrl(slideOrHero) {
  if (!slideOrHero) return '';
  return (
    resolveImageUrl(slideOrHero.poster) ||
    resolveImageUrl(slideOrHero.src) ||
    ''
  );
}

/**
 * Pick the right thumbnail for a hero in the admin list. Image heroes
 * use src; video heroes use the poster fallback chain.
 */
export function pickHeroThumbUrl(hero) {
  if (!hero) return '';
  if (hero.type === 'video') return pickHeroPosterUrl(hero);
  return resolveImageUrl(hero.src) || resolveImageUrl(hero.poster);
}

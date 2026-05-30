/**
 * Sitemap-side data helpers — image and video sources for the
 * /image-sitemap.xml and /video-sitemap.xml route handlers.
 *
 * Pulls from:
 *   - media_library (every uploaded asset, regardless of where it landed)
 *   - posts.cover (per-post cover images / videos)
 *   - heroes (homepage hero media)
 *
 * These functions are READ-ONLY and use the anon-key Supabase client
 * (no cookies / no request context) so they're safe inside route
 * handlers and the sitemap metadata file.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/seo';
import { fetchPublishedPosts } from '@/lib/seo-data';

let _client = null;
function client() {
  if (!_client) {
    _client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
  }
  return _client;
}

function absolutize(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function pickPostUrl(post) {
  if (!post?.slug) return null;
  const category = String(post.category || 'posts').toLowerCase();
  const labelSlug = post.label
    ? String(post.label).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : null;
  if (labelSlug) return `${SITE_URL}/${category}/${labelSlug}/${post.slug}`;
  return `${SITE_URL}/${category}/${post.slug}`;
}

function pickCoverUrl(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return absolutize(cover);
  if (cover?.type === 'video') return null;
  const src = cover?.sources?.[cover?.sources?.length - 1]?.src;
  return src ? absolutize(src) : null;
}

function pickCoverPoster(cover) {
  if (!cover || typeof cover === 'string') return null;
  return absolutize(cover.poster) || null;
}

function pickCoverVideo(cover) {
  if (!cover || typeof cover === 'string') return null;
  if (cover?.type !== 'video') return null;
  const src = cover?.sources?.[cover?.sources?.length - 1]?.src;
  return src ? absolutize(src) : null;
}

// Pull every <img src="..."> from a post body so we can associate each
// inline image with the post that hosts it, instead of dumping every
// media_library asset onto the homepage URL.
function extractImageUrlsFromBody(body) {
  if (!body || typeof body !== 'string') return [];
  const urls = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[1]) urls.push(m[1]);
  }
  return urls;
}

/**
 * All images Wildlife Universe should expose to Google Image Search.
 *
 * Per Google's image-sitemap spec each <image:image> must be inside the
 * <url> for the *page that hosts the image* — not a generic dump page.
 * We satisfy that by scanning each published post's body for <img src>
 * URLs and emitting one entry per (post, image) pair, plus the cover.
 *
 * media_library entries that aren't referenced by any post body are
 * intentionally dropped — orphan images on the homepage URL is exactly
 * what makes Google ignore an image sitemap (low-value mass association).
 *
 * Returns an array of:
 *   { loc, image: { url, title, caption } }
 */
export async function fetchSitemapImages() {
  const out = [];
  const emitted = new Set(); // dedupe by `loc|imageUrl`

  let posts = [];
  try {
    // Need `body` to extract inline <img src> — can't use the slim shape.
    posts = await fetchPublishedPosts();
  } catch {
    posts = [];
  }

  for (const post of posts) {
    const postLoc = pickPostUrl(post);
    if (!postLoc) continue;
    const title = post.title || 'Wildlife Universe';
    const caption = post.excerpt || post.description || title;

    // Cover image first
    const cover = pickCoverUrl(post.cover);
    if (cover) {
      const key = `${postLoc}|${cover}`;
      if (!emitted.has(key)) {
        emitted.add(key);
        out.push({ loc: postLoc, image: { url: cover, title, caption } });
      }
    }

    // Then every inline <img> in the body
    for (const raw of extractImageUrlsFromBody(post.body)) {
      const url = absolutize(raw);
      if (!url) continue;
      const key = `${postLoc}|${url}`;
      if (emitted.has(key)) continue;
      emitted.add(key);
      out.push({ loc: postLoc, image: { url, title, caption } });
    }
  }

  return out;
}

/**
 * All videos Wildlife Universe should expose to Google Video Search.
 *
 * Combines:
 *   - every video in media_library
 *   - cover videos on published posts
 *   - homepage hero videos
 *
 * Returns an array of video sitemap entries:
 *   { loc, video: { thumbnail_loc, title, description, content_loc, duration } }
 */
export async function fetchSitemapVideos() {
  const out = [];
  const seen = new Set();

  // 1) Post cover videos
  let posts = [];
  try {
    posts = await fetchPublishedPosts();
  } catch {
    posts = [];
  }
  for (const post of posts) {
    const videoUrl = pickCoverVideo(post.cover);
    if (!videoUrl || seen.has(videoUrl)) continue;
    seen.add(videoUrl);
    out.push({
      loc: pickPostUrl(post),
      video: {
        thumbnail_loc: pickCoverPoster(post.cover) || `${SITE_URL}/og-default.jpg`,
        title: post.title || 'Wildlife Universe video',
        description: post.description || post.title || 'Wildlife Universe video',
        content_loc: videoUrl,
      },
    });
  }

  // 2) Homepage hero videos
  try {
    const { data } = await client()
      .from('heroes')
      .select('headline, subject, src, sources, type, link, created_at')
      .eq('type', 'video')
      .order('created_at', { ascending: false })
      .limit(50);
    for (const h of data || []) {
      const src =
        h.src ||
        h.sources?.[h.sources.length - 1]?.src ||
        null;
      const videoUrl = absolutize(src);
      if (!videoUrl || seen.has(videoUrl)) continue;
      seen.add(videoUrl);
      out.push({
        loc: absolutize(h.link) || `${SITE_URL}/`,
        video: {
          thumbnail_loc: `${SITE_URL}/og-default.jpg`,
          title: h.headline || h.subject || 'Wildlife Universe',
          description: h.headline || h.subject || 'Wildlife Universe video',
          content_loc: videoUrl,
        },
      });
    }
  } catch {
    // heroes missing — ignore
  }

  // 3) Inline <video>/<source src> in post bodies
  function extractVideoUrlsFromBody(body) {
    if (!body || typeof body !== 'string') return [];
    const urls = [];
    const re = /<(?:video|source)[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(body)) !== null) {
      if (m[1]) urls.push(m[1]);
    }
    return urls;
  }
  for (const post of posts) {
    const postLoc = pickPostUrl(post);
    if (!postLoc) continue;
    for (const raw of extractVideoUrlsFromBody(post.body)) {
      const videoUrl = absolutize(raw);
      if (!videoUrl || seen.has(videoUrl)) continue;
      seen.add(videoUrl);
      out.push({
        loc: postLoc,
        video: {
          thumbnail_loc: pickCoverPoster(post.cover) || pickCoverUrl(post.cover) || `${SITE_URL}/og-default.jpg`,
          title: post.title || 'Wildlife Universe',
          description: post.excerpt || post.description || post.title || 'Wildlife Universe video',
          content_loc: videoUrl,
        },
      });
    }
  }

  // media_library videos without a known post association are intentionally
  // dropped — every <video:loc> Google receives must point at the page that
  // hosts the video, and dumping orphan videos on the homepage poisons the
  // sitemap.
  return out;
}

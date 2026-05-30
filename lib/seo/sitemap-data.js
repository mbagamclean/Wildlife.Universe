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

// Sitemap-only narrow fetch — pulls just the columns the image/video
// sitemap needs. Pulling `*` (with `body`) for every post puts ~50MB
// into the serverless function and the route silently returns an empty
// <urlset>. We deliberately skip `body` here: inline-image extraction
// is a nice-to-have and the autopilot posts don't embed inline images
// anyway. Cover images are the load-bearing signal for Image Search.
async function fetchPostsForMediaSitemap() {
  try {
    const sb = client();
    const { data } = await sb
      .from('posts')
      .select('slug, category, label, title, cover, excerpt, description, updated_at, created_at')
      .neq('status', 'draft')
      .order('created_at', { ascending: false });
    return (data || []).map((r) => ({
      slug: r.slug,
      category: r.category,
      label: r.label,
      title: r.title,
      cover: r.cover,
      excerpt: r.excerpt,
      description: r.description,
      updatedAt: r.updated_at || r.created_at,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.warn('[sitemap-data] fetchPostsForMediaSitemap failed:', err?.message);
    return [];
  }
}

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

/**
 * All images Wildlife Universe should expose to Google Image Search.
 *
 * Per Google's image-sitemap spec each <image:image> must be inside
 * the <url> for the *page that hosts the image* — not a generic dump
 * page. We emit one entry per published post whose cover image is set,
 * keyed to the post's canonical URL. Orphan media_library entries are
 * intentionally dropped — pointing them at `/` (the prior behaviour)
 * is the lowest-quality signal you can send Google Image Search.
 *
 * Inline body-image extraction was tried and dropped: the autopilot
 * posts mostly don't embed inline <img> tags, and fetching every
 * post.body just to scan for the rare match pushes the serverless
 * function past its memory budget and the route returns empty.
 *
 * Returns an array of:
 *   { loc, image: { url, title, caption } }
 */
export async function fetchSitemapImages() {
  const out = [];
  const emitted = new Set(); // dedupe by `loc|imageUrl`

  const posts = await fetchPostsForMediaSitemap();

  for (const post of posts) {
    const postLoc = pickPostUrl(post);
    if (!postLoc) continue;
    const cover = pickCoverUrl(post.cover);
    if (!cover) continue;
    const key = `${postLoc}|${cover}`;
    if (emitted.has(key)) continue;
    emitted.add(key);
    out.push({
      loc: postLoc,
      image: {
        url: cover,
        title: post.title || 'Wildlife Universe',
        caption: post.excerpt || post.description || post.title || '',
      },
    });
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
  const posts = await fetchPostsForMediaSitemap();
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

  // Inline body-video extraction was tried and dropped for the same
  // reason as image-sitemap: scanning post.body for <video>/<source>
  // requires fetching the whole body field for every post, which OOMs
  // the route. Cover videos cover the dominant case; orphan media_library
  // videos are dropped on purpose (per the same Image Search reasoning —
  // pointing every video at `/` is low-quality signalling).
  return out;
}

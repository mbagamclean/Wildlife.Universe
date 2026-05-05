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
  return `${SITE_URL}/posts/${post.slug}`;
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
 * Combines:
 *   - every image in media_library
 *   - the cover image of every published post (in case it's externally hosted)
 *
 * Returns an array of:
 *   { loc, image: { url, title, caption } }
 *
 * `loc` = the page where the image appears (post URL when available, else home).
 */
export async function fetchSitemapImages() {
  const out = [];
  const seen = new Set();

  // 1) Post covers — each tied to its post URL
  let posts = [];
  try {
    posts = await fetchPublishedPosts();
  } catch {
    posts = [];
  }
  for (const post of posts) {
    const url = pickCoverUrl(post.cover);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      loc: pickPostUrl(post),
      image: {
        url,
        title: post.title || 'Wildlife Universe',
        caption: post.description || post.title || '',
      },
    });
  }

  // 2) media_library images — tied to home page (no per-asset post mapping yet)
  try {
    const { data } = await client()
      .from('media_library')
      .select('file_url, alt_text, caption, created_at')
      .eq('media_kind', 'image')
      .order('created_at', { ascending: false })
      .limit(2000);
    for (const m of data || []) {
      const url = absolutize(m.file_url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({
        loc: `${SITE_URL}/`,
        image: {
          url,
          title: m.alt_text || 'Wildlife Universe',
          caption: m.caption || m.alt_text || '',
        },
      });
    }
  } catch {
    // media_library missing in this environment — ignore
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

  // 3) media_library videos
  try {
    const { data } = await client()
      .from('media_library')
      .select('file_url, alt_text, caption, duration_sec, variants, created_at')
      .eq('media_kind', 'video')
      .order('created_at', { ascending: false })
      .limit(1000);
    for (const m of data || []) {
      const url = absolutize(m.file_url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const poster = absolutize(m.variants?.poster) || `${SITE_URL}/og-default.jpg`;
      out.push({
        loc: `${SITE_URL}/`,
        video: {
          thumbnail_loc: poster,
          title: m.alt_text || 'Wildlife Universe',
          description: m.caption || m.alt_text || 'Wildlife Universe video',
          content_loc: url,
          duration: m.duration_sec || undefined,
        },
      });
    }
  } catch {
    // ignore
  }

  return out;
}

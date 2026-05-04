import { SITE_URL } from '@/lib/seo';
import { fetchPublishedPosts } from '@/lib/seo-data';
import { categories, labelSlug } from '@/lib/mock/categories';

// If the post list ever grows beyond ~50k entries, switch to chunked
// sitemaps via `generateSitemaps`:
// https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap#generating-multiple-sitemaps

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

export default async function sitemap() {
  const now = new Date();
  const entries = [];

  // Home
  entries.push({
    url: `${SITE_URL}/`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // Static pages — only include the ones that exist in /app
  const staticPaths = ['/rss', '/subscribe', '/search'];
  for (const path of staticPaths) {
    entries.push({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    });
  }

  const posts = await fetchPublishedPosts();

  // Build a map of category slug → first published post's cover (used as a
  // representative image for the category landing entry).
  const categoryCover = {};
  for (const post of posts) {
    if (!post?.category) continue;
    if (categoryCover[post.category]) continue;
    const url = pickCoverUrl(post);
    if (url) categoryCover[post.category] = url;
  }

  // Category index pages + label pages
  for (const cat of categories) {
    const catEntry = {
      url: `${SITE_URL}/${cat.slug}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    };
    if (categoryCover[cat.slug]) catEntry.images = [categoryCover[cat.slug]];
    entries.push(catEntry);

    for (const label of cat.labels) {
      entries.push({
        url: `${SITE_URL}/${cat.slug}/${labelSlug(label)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  // Posts (with image extension where available)
  for (const post of posts) {
    if (!post?.slug) continue;
    const lastMod = post.updatedAt || post.createdAt || now;
    const entry = {
      url: `${SITE_URL}/posts/${post.slug}`,
      lastModified: new Date(lastMod),
      changeFrequency: 'weekly',
      priority: 0.8,
    };
    const coverUrl = pickCoverUrl(post);
    if (coverUrl) entry.images = [coverUrl];
    entries.push(entry);
  }

  return entries;
}

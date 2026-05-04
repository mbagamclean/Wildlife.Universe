import { SITE_URL } from '@/lib/seo';
import { fetchPublishedPosts } from '@/lib/seo-data';
import { categories, labelSlug } from '@/lib/mock/categories';

// If the post list ever grows beyond ~50k entries, switch to chunked
// sitemaps via `generateSitemaps`:
// https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap#generating-multiple-sitemaps
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
  const staticPaths = ['/rss', '/subscribe'];
  for (const path of staticPaths) {
    entries.push({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    });
  }

  // Category index pages + label pages
  for (const cat of categories) {
    entries.push({
      url: `${SITE_URL}/${cat.slug}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    });
    for (const label of cat.labels) {
      entries.push({
        url: `${SITE_URL}/${cat.slug}/${labelSlug(label)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  // Posts
  const posts = await fetchPublishedPosts();
  for (const post of posts) {
    if (!post?.slug) continue;
    const lastMod = post.updatedAt || post.createdAt || now;
    entries.push({
      url: `${SITE_URL}/posts/${post.slug}`,
      lastModified: new Date(lastMod),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  return entries;
}

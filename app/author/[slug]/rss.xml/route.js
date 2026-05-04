import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_LOGO,
} from '@/lib/seo';
import {
  fetchPostsByAuthor,
  fetchAuthorDisplayName,
} from '@/lib/seo-data';

export const dynamic = 'force-dynamic';
export const revalidate = 1800;

function escapeXml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(s) {
  if (s === null || s === undefined) return '<![CDATA[]]>';
  return `<![CDATA[${String(s).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

function rfc822Date(d) {
  try {
    return new Date(d).toUTCString();
  } catch {
    return new Date().toUTCString();
  }
}

function isoDate(d) {
  try {
    return new Date(d).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickCoverImageUrl(post) {
  const cover = post?.cover;
  if (!cover) return DEFAULT_OG_IMAGE;
  if (typeof cover === 'string') {
    if (/^https?:\/\//i.test(cover)) return cover;
    return `${SITE_URL}${cover.startsWith('/') ? '' : '/'}${cover}`;
  }
  if (cover?.type === 'video') return DEFAULT_OG_IMAGE;
  const src = cover?.sources?.[cover?.sources?.length - 1]?.src;
  if (!src) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(src)) return src;
  return `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
}

function isImageUrl(url) {
  return /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url);
}

function buildItemXml(post) {
  const link = `${SITE_URL}/posts/${post.slug}`;
  const title = escapeXml(post.title || 'Untitled');
  const author = post.author?.name || (typeof post.author === 'string' ? post.author : SITE_NAME);
  const category = post.category || '';
  const label = post.label || '';
  const cover = pickCoverImageUrl(post);
  const desc = post.description || stripHtml(post.body).slice(0, 300);
  const pubDate = rfc822Date(post.createdAt);
  const updated = isoDate(post.updatedAt || post.createdAt);

  const enclosure = isImageUrl(cover)
    ? `<enclosure url="${escapeXml(cover)}" type="image/${(cover.split('.').pop() || 'jpeg').toLowerCase().replace('jpg', 'jpeg').split('?')[0]}" length="0"/>`
    : '';

  const mediaContent = isImageUrl(cover)
    ? `<media:content url="${escapeXml(cover)}" medium="image">
        <media:title type="plain">${title}</media:title>
      </media:content>`
    : '';

  return `    <item>
      <title>${title}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${cdata(desc)}</description>
      <content:encoded>${cdata(post.body || desc)}</content:encoded>
      <dc:creator>${cdata(author)}</dc:creator>
      ${category ? `<category>${escapeXml(category)}</category>` : ''}
      ${label ? `<category>${escapeXml(label)}</category>` : ''}
      <pubDate>${pubDate}</pubDate>
      <atom:updated>${updated}</atom:updated>
      ${enclosure}
      ${mediaContent}
    </item>`;
}

export async function GET(_req, { params }) {
  const { slug } = await params;

  if (!slug) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const posts = await fetchPostsByAuthor(slug, { limit: 50 });
  if (!posts.length) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const displayName =
    (await fetchAuthorDisplayName(slug)) ||
    slug.split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : '')).join(' ');

  const channelLink = `${SITE_URL}/author/${slug}`;
  const feedUrl = `${SITE_URL}/author/${slug}/rss.xml`;
  const channelTitle = `${SITE_NAME} — ${displayName}`;
  const channelDesc = `Wildlife stories by ${displayName} on ${SITE_NAME}. ${DEFAULT_DESCRIPTION}`;
  const lastBuild = rfc822Date(posts[0]?.updatedAt || posts[0]?.createdAt || new Date());

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:sy="http://purl.org/rss/1.0/modules/syndication/">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDesc)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <ttl>60</ttl>
    <sy:updatePeriod>hourly</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${escapeXml(DEFAULT_LOGO)}</url>
      <title>${escapeXml(channelTitle)}</title>
      <link>${escapeXml(channelLink)}</link>
    </image>
${posts.map(buildItemXml).join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
    },
  });
}

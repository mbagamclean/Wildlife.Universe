import { notFound, redirect, RedirectType } from 'next/navigation';
import { categories, findLabelBySlug, labelSlug } from '@/lib/mock/categories';
import { LabelView } from '@/components/posts/LabelView';
import { PostView } from '@/components/posts/PostView';
import { RelatedPosts } from '@/components/posts/RelatedPosts';
import { PostFaq } from '@/components/posts/PostFaq';
import {
  fetchPostBySlug,
  fetchPostsForLabelPage,
  fetchRelatedPosts,
  fetchInternalLinkCatalog,
  fetchLabelRichBySlug,
} from '@/lib/seo-data';
import { postUrl } from '@/lib/posts/url';
import {
  buildPostMetadata,
  buildCategoryMetadata,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  JsonLd,
  SITE_NAME,
} from '@/lib/seo';

function readPage(sp) {
  const n = Number.parseInt(sp?.page, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = categories.find((c) => c.slug === 'posts');

  // Label landing page lives at the same /posts/<slug> route
  const label = findLabelBySlug(slug, cat.labels);
  if (label) {
    const rich = await fetchLabelRichBySlug('posts', slug).catch(() => null);
    return buildCategoryMetadata(cat, { label, slug }, { page: readPage(sp), rich });
  }

  const post = await fetchPostBySlug(slug);
  if (!post) {
    return { title: 'Post not found', robots: { index: false, follow: false } };
  }
  // For non-'posts' category posts the canonical URL is /<category>/<slug>;
  // we still build their metadata here so the 301 path emits the right
  // OG/twitter cards if a crawler somehow doesn't follow the redirect.
  return buildPostMetadata(post);
}

// Post-restructure this route exists mainly to render label landings
// (e.g. /posts/how-questions) and to 301-redirect legacy /posts/<slug>
// URLs to their canonical 3-segment form. Both branches need ?page=N
// (label landings) or a runtime DB lookup (redirects), so we render
// dynamically on every request — no generateStaticParams, no ISR
// caching. That sidesteps the DYNAMIC_SERVER_USAGE conflict that
// happens when an empty generateStaticParams meets searchParams use.
export const dynamic = 'force-dynamic';

export default async function PostDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = categories.find((c) => c.slug === 'posts');
  const label = findLabelBySlug(slug, cat.labels);

  if (label) {
    const page = readPage(sp);
    const [labelPage, rich] = await Promise.all([
      fetchPostsForLabelPage('posts', label, { page }),
      fetchLabelRichBySlug('posts', slug).catch(() => null),
    ]);
    const { posts, totalPages } = labelPage;
    if (page > 1 && page > totalPages) notFound();

    const breadcrumb = buildBreadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: cat.name, url: `/${cat.slug}` },
      { name: label, url: `/${cat.slug}/${labelSlug(label)}` },
    ]);
    return (
      <>
        <JsonLd data={breadcrumb} />
        <LabelView
          category="posts"
          categoryName={cat.name}
          label={label}
          allLabels={cat.labels}
          posts={posts}
          page={page}
          totalPages={totalPages}
          heroImage={rich?.heroImageUrl || null}
          heroImageMobile={rich?.heroImageMobileUrl || null}
          shortDescription={rich?.shortDescription || ''}
          imageAlt={rich?.imageAlt || ''}
        />
      </>
    );
  }

  // The server already fetches the post for JSON-LD/breadcrumbs — pass it
  // (and a slice of related siblings) into PostView as initial props so
  // the article body renders in the SSR HTML instead of waiting on a
  // client-side db.posts.get(slug) + listByCategory chain.
  // Fetch the post and the internal-link catalog in parallel. The
  // catalog drives Wikipedia-style internal linking inside the body —
  // we hand it to PostView and it bakes anchors into the rendered HTML
  // without a client round-trip.
  const [post, internalLinkCatalog] = await Promise.all([
    fetchPostBySlug(slug),
    fetchInternalLinkCatalog().catch(() => []),
  ]);

  // Restructure 2026-05-27: every published post now has a canonical
  // URL built by postUrl() — /<category>/<label>/<slug> for labeled
  // posts (most of them) or /<category>/<slug> for label-less ones.
  // Anyone hitting the legacy /posts/<slug> URL gets a permanent 301
  // so external links, backlinks, and prior Google indexing all flow
  // to the new home without ranking loss. Includes posts-category
  // posts when their canonical URL has a label segment.
  if (post) {
    const canonical = postUrl(post);
    if (canonical && canonical !== `/posts/${slug}`) {
      redirect(canonical, RedirectType.replace);
    }
  }

  // Thread the merged author (static defaults + admin overrides) into
  // the Article JSON-LD so admin edits — bio, title, photo, expertise —
  // appear in the Person entity Google reads. Falls back to the static
  // module if the override fetch fails.
  const mergedAuthor = post
    ? await (await import('@/lib/seo/authors-runtime')).fetchAuthorBySlug(post.author_id || post.authorId)
    : null;
  const jsonLd = post ? buildArticleJsonLd(post, { author: mergedAuthor }) : null;
  const crumbs = post
    ? buildBreadcrumbJsonLd([
        { name: 'Home', url: '/' },
        { name: post.category || 'Posts', url: `/${post.category || 'posts'}` },
        ...(post.label
          ? [
              {
                name: post.label,
                url: `/${post.category || 'posts'}/${labelSlug(post.label)}`,
              },
            ]
          : []),
        { name: post.title || 'Post', url: postUrl(post) },
      ])
    : null;
  const related = post ? await fetchRelatedPosts(post, { limit: 8 }) : [];
  const faqJsonLd = post ? buildFaqJsonLd(post.faq) : null;

  // PostView's internal sibling-related panel only shows 3 — hand it the
  // top 3 from the already-fetched related list so it doesn't make its
  // own listByCategory call on mount.
  const initialRelatedForView = post
    ? related.filter((r) => r.slug !== post.slug).slice(0, 3)
    : [];

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      {crumbs && <JsonLd data={crumbs} />}
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <PostView
        slug={slug}
        initialPost={post}
        initialRelated={initialRelatedForView}
        internalLinkCatalog={internalLinkCatalog}
      />
      {post?.faq && <PostFaq faq={post.faq} />}
      <RelatedPosts posts={related} />
    </>
  );
}

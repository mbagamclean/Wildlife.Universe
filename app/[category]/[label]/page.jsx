/**
 * /<category>/<label-or-orphan-post-slug>
 *
 * Two outcomes:
 *   1. <label> matches a known label for <category>  →  LabelView
 *      (e.g., /animals/mammals — list of mammal posts)
 *   2. <label> matches a published post in <category> that DIDN'T have
 *      a label set OR is the canonical 2-segment URL of a label-less
 *      post  →  render PostView (no redirect)
 *   3. <label> matches a published post in <category> that HAS a label
 *      →  301 redirect to /<category>/<label>/<slug> (canonical form)
 *   4. Otherwise  →  404
 *
 * The directory name stays `[label]` for git-history continuity; the
 * `label` route param is treated semantically as "slug for this 2-seg
 * page — could be a real label, or a legacy post URL to redirect."
 */
import { notFound, redirect, RedirectType } from 'next/navigation';
import { categories, labelSlug, findLabelBySlug } from '@/lib/mock/categories';
import { LabelView } from '@/components/posts/LabelView';
import { PostView } from '@/components/posts/PostView';
import { PostFaq } from '@/components/posts/PostFaq';
import { RelatedPosts } from '@/components/posts/RelatedPosts';
import {
  buildCategoryMetadata,
  buildPostMetadata,
  buildBreadcrumbJsonLd,
  buildArticleJsonLd,
  buildFaqJsonLd,
  JsonLd,
} from '@/lib/seo';
import {
  fetchPostsForLabelPage,
  fetchPostByCategoryAndSlug,
  fetchRelatedPosts,
  fetchInternalLinkCatalog,
  fetchLabelRichBySlug,
} from '@/lib/seo-data';
import { postUrl } from '@/lib/posts/url';

function readPage(sp) {
  const n = Number.parseInt(sp?.page, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function generateMetadata({ params, searchParams }) {
  const { category: catSlug, label: rawSlug } = await params;
  const sp = await searchParams;
  const page = readPage(sp);
  const cat = categories.find((c) => c.slug === catSlug);
  if (!cat) return {};

  const label = findLabelBySlug(rawSlug, cat.labels);
  if (label) {
    return buildCategoryMetadata(cat, { label, slug: rawSlug }, { page });
  }

  // Maybe it's a label-less post at the canonical 2-segment URL.
  const post = await fetchPostByCategoryAndSlug(catSlug, rawSlug);
  if (!post) return { title: 'Not found', robots: { index: false, follow: false } };
  return buildPostMetadata(post);
}

// ISR — admin saves call revalidatePath for instant invalidation.
export const revalidate = 60;

export default async function CategorySlugPage({ params, searchParams }) {
  const { category: catSlug, label: rawSlug } = await params;
  const sp = await searchParams;
  const page = readPage(sp);

  const cat = categories.find((c) => c.slug === catSlug);
  if (!cat) notFound();

  // 1) Label-first: keeps /<category>/<label-slug> label listings working.
  const label = findLabelBySlug(rawSlug, cat.labels);
  if (label) {
    const [labelPage, rich] = await Promise.all([
      fetchPostsForLabelPage(cat.slug, label, { page }),
      fetchLabelRichBySlug(cat.slug, rawSlug).catch(() => null),
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
          category={cat.slug}
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

  // 2) Not a label — try resolving as a post in this category.
  const post = await fetchPostByCategoryAndSlug(catSlug, rawSlug);
  if (!post) notFound();

  // 3) If the post has a label, the canonical URL is 3-segment. 301
  //    redirect there so SEO consolidates on the canonical form.
  if (post.label) {
    redirect(postUrl(post), RedirectType.replace);
  }

  // 4) Label-less post — render at the 2-segment URL (canonical form).
  const internalLinkCatalog = await fetchInternalLinkCatalog().catch(() => []);
  const jsonLd = buildArticleJsonLd(post);
  const crumbs = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: cat.name, url: `/${cat.slug}` },
    { name: post.title || 'Post', url: postUrl(post) },
  ]);
  const faqJsonLd = buildFaqJsonLd(post.faq);
  const related = await fetchRelatedPosts(post, { limit: 8 });
  const initialRelatedForView = related
    .filter((r) => r.slug !== post.slug)
    .slice(0, 3);

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      {crumbs && <JsonLd data={crumbs} />}
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <PostView
        slug={post.slug}
        initialPost={post}
        initialRelated={initialRelatedForView}
        internalLinkCatalog={internalLinkCatalog}
      />
      {post?.faq && <PostFaq faq={post.faq} />}
      <RelatedPosts posts={related} />
    </>
  );
}

import { notFound } from 'next/navigation';
import { categories, findLabelBySlug, labelSlug } from '@/lib/mock/categories';
import { LabelView } from '@/components/posts/LabelView';
import { PostView } from '@/components/posts/PostView';
import { RelatedPosts } from '@/components/posts/RelatedPosts';
import { PostFaq } from '@/components/posts/PostFaq';
import {
  fetchPostBySlug,
  fetchPostsForLabelPage,
  fetchRelatedPosts,
} from '@/lib/seo-data';
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
    return buildCategoryMetadata(cat, { label, slug }, { page: readPage(sp) });
  }

  const post = await fetchPostBySlug(slug);
  if (!post) {
    return { title: 'Post not found', robots: { index: false, follow: false } };
  }
  return buildPostMetadata(post);
}

// ISR — refresh post detail every 5 min. Admin save endpoints call
// revalidatePath('/posts/[slug]') for instant invalidation when the
// editor publishes or updates a post.
export const revalidate = 300;

export default async function PostDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = categories.find((c) => c.slug === 'posts');
  const label = findLabelBySlug(slug, cat.labels);

  if (label) {
    const page = readPage(sp);
    const { posts, totalPages } = await fetchPostsForLabelPage('posts', label, { page });
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
        />
      </>
    );
  }

  // For post detail pages we still hand off to the existing client-side
  // PostView, but inject server-rendered JSON-LD for crawlers.
  const post = await fetchPostBySlug(slug);
  const jsonLd = post ? buildArticleJsonLd(post) : null;
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
        { name: post.title || 'Post', url: `/posts/${post.slug}` },
      ])
    : null;
  const related = post ? await fetchRelatedPosts(post, { limit: 8 }) : [];
  const faqJsonLd = post ? buildFaqJsonLd(post.faq) : null;

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      {crumbs && <JsonLd data={crumbs} />}
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <PostView slug={slug} />
      {post?.faq && <PostFaq faq={post.faq} />}
      <RelatedPosts posts={related} />
    </>
  );
}

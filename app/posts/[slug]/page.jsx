import { notFound } from 'next/navigation';
import { categories, findLabelBySlug, labelSlug } from '@/lib/mock/categories';
import { LabelView } from '@/components/posts/LabelView';
import { PostView } from '@/components/posts/PostView';
import { fetchPostBySlug } from '@/lib/seo-data';
import {
  buildPostMetadata,
  buildCategoryMetadata,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  JsonLd,
  SITE_NAME,
} from '@/lib/seo';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === 'posts');

  // Label landing page lives at the same /posts/<slug> route
  const label = findLabelBySlug(slug, cat.labels);
  if (label) {
    return buildCategoryMetadata(cat, { label, slug });
  }

  const post = await fetchPostBySlug(slug);
  if (!post) {
    return { title: 'Post not found', robots: { index: false, follow: false } };
  }
  return buildPostMetadata(post);
}

export default async function PostDetailPage({ params }) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === 'posts');
  const label = findLabelBySlug(slug, cat.labels);

  if (label) {
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

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      {crumbs && <JsonLd data={crumbs} />}
      <PostView slug={slug} />
    </>
  );
}

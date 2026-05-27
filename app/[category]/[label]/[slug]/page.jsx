/**
 * /<category>/<label>/<slug>  —  canonical labeled-post detail page.
 *
 * Three URL pieces must align with the database row:
 *   - <category> must equal post.category
 *   - <label> must equal labelSlug(post.label)
 *   - <slug>  must equal post.slug
 *
 * If <label> doesn't match the post's actual label (e.g. someone hits
 * `/animals/reptiles/african-elephant` for a mammals post), we 301
 * redirect to the canonical URL — keeps SEO consolidated even when
 * external links use the wrong taxonomy segment.
 */
import { notFound, redirect, RedirectType } from 'next/navigation';
import { categories, labelSlug, findLabelBySlug } from '@/lib/mock/categories';
import { PostView } from '@/components/posts/PostView';
import { PostFaq } from '@/components/posts/PostFaq';
import { RelatedPosts } from '@/components/posts/RelatedPosts';
import {
  buildPostMetadata,
  buildBreadcrumbJsonLd,
  buildArticleJsonLd,
  buildFaqJsonLd,
  JsonLd,
} from '@/lib/seo';
import {
  fetchPostByCategoryAndSlug,
  fetchRelatedPosts,
  fetchInternalLinkCatalog,
  fetchPublishedPostsByCategory,
} from '@/lib/seo-data';
import { postUrl } from '@/lib/posts/url';

export async function generateMetadata({ params }) {
  const { category: catSlug, slug } = await params;
  const post = await fetchPostByCategoryAndSlug(catSlug, slug);
  if (!post) return { title: 'Not found', robots: { index: false, follow: false } };
  return buildPostMetadata(post);
}

// Pre-render every labeled post at build time so they ship as proper
// static HTML with edge caching. Skips category='posts' (those are
// handled by /posts/[label]/[slug] indirectly via /[category]/[label]/[slug]
// — same dynamic route, different category value at runtime).
export async function generateStaticParams() {
  const params = [];
  for (const cat of categories) {
    try {
      const posts = await fetchPublishedPostsByCategory(cat.slug, { slim: true });
      for (const p of posts) {
        if (!p.slug || !p.label) continue;
        params.push({
          category: cat.slug,
          label: labelSlug(p.label),
          slug: p.slug,
        });
      }
    } catch { /* skip on error */ }
  }
  return params;
}

// ISR — refresh post detail every 5 min. Admin save endpoints call
// revalidatePath when the editor publishes or updates a post.
export const revalidate = 300;

export default async function LabeledPostPage({ params }) {
  const { category: catSlug, label: lblSlug, slug } = await params;

  const cat = categories.find((c) => c.slug === catSlug);
  if (!cat) notFound();

  // Verify <label> is a real label slug for this category. If not,
  // 404 — we don't want random words in the label slot to render.
  const label = findLabelBySlug(lblSlug, cat.labels);
  if (!label) notFound();

  const [post, internalLinkCatalog] = await Promise.all([
    fetchPostByCategoryAndSlug(catSlug, slug),
    fetchInternalLinkCatalog().catch(() => []),
  ]);
  if (!post) notFound();

  // If the post's actual label doesn't match the URL segment, redirect
  // to the canonical URL so external links with mis-typed labels get
  // consolidated SEO-wise.
  const canonical = postUrl(post);
  if (canonical !== `/${catSlug}/${lblSlug}/${slug}`) {
    redirect(canonical, RedirectType.replace);
  }

  const jsonLd = buildArticleJsonLd(post);
  const crumbs = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: cat.name, url: `/${cat.slug}` },
    { name: label, url: `/${cat.slug}/${labelSlug(label)}` },
    { name: post.title || 'Post', url: canonical },
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

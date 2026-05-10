import { notFound } from 'next/navigation';
import { categories, labelSlug, findLabelBySlug } from '@/lib/mock/categories';
import { LabelView } from '@/components/posts/LabelView';
import {
  buildCategoryMetadata,
  buildBreadcrumbJsonLd,
  JsonLd,
} from '@/lib/seo';
import { fetchPostsForLabelPage } from '@/lib/seo-data';

function readPage(sp) {
  const n = Number.parseInt(sp?.page, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function generateMetadata({ params, searchParams }) {
  const { category: catSlug, label: lblSlug } = await params;
  const sp = await searchParams;
  const page = readPage(sp);
  const cat = categories.find((c) => c.slug === catSlug);
  if (!cat) return {};
  const label = findLabelBySlug(lblSlug, cat.labels);
  if (!label) return {};
  return buildCategoryMetadata(cat, { label, slug: lblSlug }, { page });
}

// ISR — admin saves call revalidatePath for instant invalidation.
export const revalidate = 60;

export default async function LabelPage({ params, searchParams }) {
  const { category: catSlug, label: lblSlug } = await params;
  const sp = await searchParams;
  const page = readPage(sp);

  const cat = categories.find((c) => c.slug === catSlug);
  if (!cat) notFound();

  const label = findLabelBySlug(lblSlug, cat.labels);
  if (!label) notFound();

  const { posts, totalPages } = await fetchPostsForLabelPage(cat.slug, label, { page });
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
      />
    </>
  );
}

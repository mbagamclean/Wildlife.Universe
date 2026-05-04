import { notFound } from 'next/navigation';
import { categories, labelSlug, findLabelBySlug } from '@/lib/mock/categories';
import { LabelView } from '@/components/posts/LabelView';
import {
  buildCategoryMetadata,
  buildBreadcrumbJsonLd,
  JsonLd,
} from '@/lib/seo';

export async function generateMetadata({ params }) {
  const { category: catSlug, label: lblSlug } = await params;
  const cat = categories.find((c) => c.slug === catSlug);
  if (!cat) return {};
  const label = findLabelBySlug(lblSlug, cat.labels);
  if (!label) return {};
  return buildCategoryMetadata(cat, { label, slug: lblSlug });
}

export default async function LabelPage({ params }) {
  const { category: catSlug, label: lblSlug } = await params;

  const cat = categories.find((c) => c.slug === catSlug);
  if (!cat) notFound();

  const label = findLabelBySlug(lblSlug, cat.labels);
  if (!label) notFound();

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
      />
    </>
  );
}

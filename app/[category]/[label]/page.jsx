import { notFound } from 'next/navigation';
import { categories, labelSlug, findLabelBySlug } from '@/lib/mock/categories';
import { LabelView } from '@/components/posts/LabelView';

export async function generateMetadata({ params }) {
  const { category: catSlug, label: lblSlug } = await params;
  const cat = categories.find((c) => c.slug === catSlug);
  if (!cat) return {};
  const label = findLabelBySlug(lblSlug, cat.labels);
  if (!label) return {};
  return { title: `${label} · ${cat.name} — Wildlife Universe` };
}

export default async function LabelPage({ params }) {
  const { category: catSlug, label: lblSlug } = await params;

  const cat = categories.find((c) => c.slug === catSlug);
  if (!cat) notFound();

  const label = findLabelBySlug(lblSlug, cat.labels);
  if (!label) notFound();

  return (
    <LabelView
      category={cat.slug}
      categoryName={cat.name}
      label={label}
      allLabels={cat.labels}
    />
  );
}

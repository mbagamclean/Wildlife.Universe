import { notFound } from 'next/navigation';
import { categories, findLabelBySlug } from '@/lib/mock/categories';
import { LabelView } from '@/components/posts/LabelView';
import { PostView } from '@/components/posts/PostView';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === 'posts');
  const label = findLabelBySlug(slug, cat.labels);
  if (label) return { title: `${label} · Posts — Wildlife Universe` };
  return { title: 'Post' };
}

export default async function PostDetailPage({ params }) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === 'posts');
  const label = findLabelBySlug(slug, cat.labels);

  if (label) {
    return (
      <LabelView
        category="posts"
        categoryName={cat.name}
        label={label}
        allLabels={cat.labels}
      />
    );
  }

  return <PostView slug={slug} />;
}

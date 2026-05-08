import { notFound } from 'next/navigation';
import { CategoryView } from '@/components/posts/CategoryView';
import { categories } from '@/lib/mock/categories';
import { buildCategoryMetadata } from '@/lib/seo';
import { fetchPostsForCategoryPage } from '@/lib/seo-data';

const CATEGORY_SLUG = 'insects';
const BLURB =
  'A miniature universe of pollinators, decomposers, and architects shaping every ecosystem.';

function readPage(sp) {
  const n = Number.parseInt(sp?.page, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const page = readPage(sp);
  const cat = categories.find((c) => c.slug === CATEGORY_SLUG);
  return buildCategoryMetadata(cat, null, { page });
}

export default async function InsectsPage({ searchParams }) {
  const sp = await searchParams;
  const page = readPage(sp);
  const cat = categories.find((c) => c.slug === CATEGORY_SLUG);
  const { posts, totalPages } = await fetchPostsForCategoryPage(CATEGORY_SLUG, { page });
  if (page > 1 && page > totalPages) notFound();

  return (
    <CategoryView
      category={CATEGORY_SLUG}
      name={cat.name}
      labels={cat.labels}
      blurb={BLURB}
      posts={posts}
      page={page}
      totalPages={totalPages}
    />
  );
}

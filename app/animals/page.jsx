import { notFound } from 'next/navigation';
import { CategoryView } from '@/components/posts/CategoryView';
import { categories } from '@/lib/mock/categories';
import { buildCategoryMetadata } from '@/lib/seo';
import { fetchPostsForCategoryPage, fetchCategoryRichBySlug } from '@/lib/seo-data';

const CATEGORY_SLUG = 'animals';
const BLURB =
  'From apex predators to the smallest invertebrates — stories from the mammalian, reptilian, and aquatic worlds.';

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

// ISR — refresh once a minute. Admin save endpoints call
// revalidatePath('/<slug>') for instant invalidation when an editor
// updates the category metadata or publishes a post.
export const revalidate = 60;

export default async function AnimalsPage({ searchParams }) {
  const sp = await searchParams;
  const page = readPage(sp);
  const cat = categories.find((c) => c.slug === CATEGORY_SLUG);
  const [{ posts, totalPages }, rich] = await Promise.all([
    fetchPostsForCategoryPage(CATEGORY_SLUG, { page }),
    fetchCategoryRichBySlug(CATEGORY_SLUG),
  ]);
  if (page > 1 && page > totalPages) notFound();

  return (
    <CategoryView
      category={CATEGORY_SLUG}
      name={rich?.name || cat.name}
      labels={cat.labels}
      blurb={BLURB}
      posts={posts}
      page={page}
      totalPages={totalPages}
      heroImage={rich?.heroImageUrl || null}
      heroImageMobile={rich?.heroImageMobileUrl || null}
      shortDescription={rich?.shortDescription || ''}
    />
  );
}

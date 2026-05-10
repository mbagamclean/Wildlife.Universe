import { notFound } from 'next/navigation';
import { CategoryView } from '@/components/posts/CategoryView';
import { categories } from '@/lib/mock/categories';
import { buildCategoryMetadata } from '@/lib/seo';
import { fetchPostsForCategoryPage, fetchCategoryRichBySlug } from '@/lib/seo-data';

const CATEGORY_SLUG = 'plants';
const BLURB =
  'The slow giants and silent partners of our forests, meadows, and mountains.';

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

// ISR — admin saves call revalidatePath for instant invalidation.
export const revalidate = 60;

export default async function PlantsPage({ searchParams }) {
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

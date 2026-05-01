import { CategoryView } from '@/components/posts/CategoryView';
import { categories } from '@/lib/mock/categories';

export const metadata = { title: 'Birds' };

export default function BirdsPage() {
  const cat = categories.find((c) => c.slug === 'birds');
  return (
    <CategoryView
      category="birds"
      name={cat.name}
      labels={cat.labels}
      blurb="From sovereign skies to coastal flats — the architects of flight in their many forms."
    />
  );
}

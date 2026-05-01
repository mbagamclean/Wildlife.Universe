import { CategoryView } from '@/components/posts/CategoryView';
import { categories } from '@/lib/mock/categories';

export const metadata = { title: 'Insects' };

export default function InsectsPage() {
  const cat = categories.find((c) => c.slug === 'insects');
  return (
    <CategoryView
      category="insects"
      name={cat.name}
      labels={cat.labels}
      blurb="A miniature universe of pollinators, decomposers, and architects shaping every ecosystem."
    />
  );
}

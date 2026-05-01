import { CategoryView } from '@/components/posts/CategoryView';
import { categories } from '@/lib/mock/categories';

export const metadata = { title: 'Animals' };

export default function AnimalsPage() {
  const cat = categories.find((c) => c.slug === 'animals');
  return (
    <CategoryView
      category="animals"
      name={cat.name}
      labels={cat.labels}
      blurb="From apex predators to the smallest invertebrates — stories from the mammalian, reptilian, and aquatic worlds."
    />
  );
}

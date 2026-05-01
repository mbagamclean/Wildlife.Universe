import { CategoryView } from '@/components/posts/CategoryView';
import { categories } from '@/lib/mock/categories';

export const metadata = { title: 'Plants' };

export default function PlantsPage() {
  const cat = categories.find((c) => c.slug === 'plants');
  return (
    <CategoryView
      category="plants"
      name={cat.name}
      labels={cat.labels}
      blurb="The slow giants and silent partners of our forests, meadows, and mountains."
    />
  );
}

import { CategoryView } from '@/components/posts/CategoryView';
import { categories } from '@/lib/mock/categories';

export const metadata = { title: 'Posts' };

export default function PostsPage() {
  const cat = categories.find((c) => c.slug === 'posts');
  return (
    <CategoryView
      category="posts"
      name={cat.name}
      labels={cat.labels}
      blurb="Cinematic storytelling and field reporting from across the living world."
    />
  );
}

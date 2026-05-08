import { Container } from '@/components/ui/Container';
import { PostCard } from './PostCard';

export function RelatedPosts({ posts }) {
  if (!posts || posts.length === 0) return null;
  return (
    <nav
      aria-label="Related articles"
      className="border-t border-[var(--glass-border)] bg-[var(--color-bg-deep)] py-16"
    >
      <Container>
        <h2 className="mb-8 font-display text-3xl font-black text-[var(--color-fg)] sm:text-4xl">
          Related articles
        </h2>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post) => (
            <li key={post.id} className="contents">
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  );
}

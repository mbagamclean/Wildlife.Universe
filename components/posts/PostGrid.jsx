import { PostCard } from './PostCard';
import { EmptyPostState } from './EmptyPostState';

export function PostGrid({ posts, emptyTitle, emptyMessage }) {
  if (!posts || posts.length === 0) {
    return <EmptyPostState title={emptyTitle} message={emptyMessage} />;
  }
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

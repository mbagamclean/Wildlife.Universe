import { PostList } from '@/components/admin/PostList';

export const metadata = { title: 'Posts · Admin' };

export default function AdminPostsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-black sm:text-4xl">Posts</h1>
        <p className="mt-2 text-sm text-[var(--color-fg-soft)]">
          Create stories, mark them featured, and assign them to category labels.
        </p>
      </div>
      <PostList />
    </div>
  );
}

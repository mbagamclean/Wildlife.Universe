'use client';
import { PostList } from '@/components/admin/PostList';

export default function AdminPostsPage() {
  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          CONTENT
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Posts</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Create, edit and manage all posts.</p>
      </div>
      <PostList />
    </div>
  );
}

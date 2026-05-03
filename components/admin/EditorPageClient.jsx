'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PostEditor } from '@/components/admin/PostEditor';
import { db } from '@/lib/storage/db';

export function EditorPageClient({ postId }) {
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.posts.getById(postId).then(p => {
      setPost(p);
      setLoading(false);
    });
  }, [postId]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', fontSize: 14, color: 'var(--adm-text-muted)',
      }}>
        Loading post…
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', fontSize: 14, color: '#ef4444',
      }}>
        Post not found.
      </div>
    );
  }

  const listPath = post.category ? `/admin/content/${post.category}` : '/admin/content/posts';

  return (
    <PostEditor
      initial={post}
      onSave={async (payload) => {
        await db.posts.update(post.id, payload);
        router.push(listPath);
      }}
      onCancel={() => router.back()}
    />
  );
}

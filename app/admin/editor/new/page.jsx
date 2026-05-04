'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PostEditor } from '@/components/admin/PostEditor';
import { db } from '@/lib/storage/db';

function NewEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || undefined;
  const title = searchParams.get('title') || undefined;

  const listPath = category ? `/admin/content/${category}` : '/admin/content/posts';

  const initial = (category || title) ? { ...(category && { category }), ...(title && { title }) } : undefined;

  return (
    <PostEditor
      initial={initial}
      onSave={async (payload) => {
        await db.posts.create(payload);
        router.push(listPath);
      }}
      onCancel={() => router.back()}
    />
  );
}

export default function NewEditorPage() {
  return (
    <Suspense>
      <NewEditorInner />
    </Suspense>
  );
}

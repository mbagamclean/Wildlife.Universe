import { EditorPageClient } from '@/components/admin/EditorPageClient';

export default async function EditEditorPage({ params }) {
  const { id } = await params;
  return <EditorPageClient postId={id} />;
}

'use client';
import { ContentListPage } from '@/components/admin/content/ContentListPage';

export default function AdminAnimalsPage() {
  return (
    <ContentListPage
      title="Animals"
      subtitle="Manage animal content and wildlife entries"
      category="animals"
      noun="Animal"
    />
  );
}

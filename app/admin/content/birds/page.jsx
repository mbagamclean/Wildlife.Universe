'use client';
import { ContentListPage } from '@/components/admin/content/ContentListPage';

export default function AdminBirdsPage() {
  return (
    <ContentListPage
      title="Birds"
      subtitle="Manage bird species and avian content"
      category="birds"
      noun="Bird"
    />
  );
}

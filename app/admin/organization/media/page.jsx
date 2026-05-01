'use client';
import { MediaUpload } from '@/components/admin/MediaUpload';

export default function AdminMediaPage() {
  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          ORGANIZATION
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Media</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Upload and manage media files.</p>
      </div>
      <div className="rounded-2xl p-6" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
        <MediaUpload />
      </div>
    </div>
  );
}

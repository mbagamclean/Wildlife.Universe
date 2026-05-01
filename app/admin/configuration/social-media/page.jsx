'use client';
import { Share2 } from 'lucide-react';

export default function AdminSocialMediaPage() {
  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          CONFIGURATION
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Social Media Automation</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Schedule and automate posts across social platforms.</p>
      </div>
      <div
        className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl"
        style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: '#00800018' }}>
          <Share2 className="h-7 w-7" style={{ color: '#008000' }} />
        </div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--adm-text)' }}>Social Media Automation</h2>
        <p className="max-w-xs text-center text-sm" style={{ color: 'var(--adm-text-muted)' }}>Schedule and automate posts across social platforms.</p>
        <span className="rounded-full bg-[#d4af37]/15 px-3 py-1 text-xs font-bold text-[#d4af37]">Coming Soon</span>
      </div>
    </div>
  );
}

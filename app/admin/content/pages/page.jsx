'use client';
import Link from 'next/link';
import { Globe, ArrowRight } from 'lucide-react';

const PAGES = [
  { title: 'Home', href: '/', desc: 'Landing page with hero rotation' },
  { title: 'Posts', href: '/posts', desc: 'All posts category page' },
  { title: 'Animals', href: '/animals', desc: 'Animals category page' },
  { title: 'Birds', href: '/birds', desc: 'Birds category page' },
  { title: 'Plants', href: '/plants', desc: 'Plants category page' },
  { title: 'Insects', href: '/insects', desc: 'Insects category page' },
  { title: 'About', href: '/about', desc: 'About Wildlife Universe' },
  { title: 'Privacy Policy', href: '/privacy', desc: 'Legal — privacy policy' },
  { title: 'Terms of Service', href: '/terms', desc: 'Legal — terms of service' },
];

export default function AdminPagesPage() {
  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          CONTENT
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Pages</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Quick links to all website pages.</p>
      </div>
      <div className="rounded-2xl" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
        {PAGES.map((p, i) => (
          <Link
            key={p.href}
            href={p.href}
            target="_blank"
            className="flex items-center gap-4 px-5 py-4 transition-colors"
            style={i < PAGES.length - 1 ? { borderBottom: '1px solid var(--adm-border)' } : {}}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--adm-hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: '#00800015' }}>
              <Globe className="h-4 w-4 text-[#008000]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{p.title}</p>
              <p className="text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{p.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4" style={{ color: 'var(--adm-text-subtle)' }} />
          </Link>
        ))}
      </div>
    </div>
  );
}

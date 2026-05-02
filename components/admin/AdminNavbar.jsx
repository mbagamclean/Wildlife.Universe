'use client';

import Image from 'next/image';
import { Menu } from 'lucide-react';
import { useTheme } from 'next-themes';

export function AdminNavbar({ onMenu }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <header
      className="flex h-14 flex-shrink-0 items-center gap-3 px-4"
      style={{
        background: isDark ? '#111214' : '#ffffff',
        borderBottom: `1px solid ${isDark ? '#2c2e32' : '#ede8df'}`,
        boxShadow: isDark
          ? '0 1px 0 rgba(212,175,55,0.08), 0 2px 8px rgba(0,0,0,0.4)'
          : '0 1px 0 rgba(212,175,55,0.15), 0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Hamburger */}
      <button
        onClick={onMenu}
        aria-label="Open navigation"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors active:scale-95"
        style={{
          color: isDark ? '#9a9aab' : '#888',
          background: 'transparent',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : '#f5efe2'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Logo + CMS wordmark */}
      <div className="flex items-center gap-2.5">
        <Image
          src="/logo.png"
          alt="Wildlife Universe"
          width={150}
          height={40}
          style={{ objectFit: 'contain' }}
          priority
        />

        {/* Thin divider */}
        <span
          style={{
            display: 'block',
            width: '1px',
            height: '22px',
            background: isDark ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.45)',
            borderRadius: '1px',
          }}
        />

        {/* CMS label — Playfair Display to echo the wildlife brand serif */}
        <span
          style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '1rem',
            fontWeight: 700,
            fontStyle: 'italic',
            letterSpacing: '0.04em',
            background: isDark
              ? 'linear-gradient(135deg, #d4af37 0%, #f0d060 50%, #c9a227 100%)'
              : 'linear-gradient(135deg, #b8860b 0%, #d4af37 50%, #a07010 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            userSelect: 'none',
          }}
        >
          CMS
        </span>
      </div>

      <div className="flex-1" />

      {/* Live indicator */}
      <div
        className="flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: '#008000' }}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#008000] opacity-40" />
          <span className="relative h-2 w-2 rounded-full bg-[#008000]" />
        </span>
        Live
      </div>
    </header>
  );
}

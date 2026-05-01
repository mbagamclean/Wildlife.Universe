'use client';

import Image from 'next/image';
import { Menu } from 'lucide-react';
import { useTheme } from 'next-themes';

export function AdminNavbar({ onMenu }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <header
      className="flex h-20 flex-shrink-0 items-center gap-4 px-4"
      style={{
        background: isDark ? '#111214' : '#ffffff',
        borderBottom: `1px solid ${isDark ? '#2c2e32' : '#e5ddd0'}`,
        boxShadow: isDark ? '0 1px 6px rgba(0,0,0,0.35)' : '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Hamburger */}
      <button
        onClick={onMenu}
        aria-label="Open navigation"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors active:scale-95"
        style={{
          color: isDark ? '#9a9aab' : '#666',
          background: 'transparent',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : '#f5efe2'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo only — no text */}
      <Image
        src="/logo.png"
        alt="Wildlife Universe CMS"
        width={260}
        height={69}
        style={{ objectFit: 'contain' }}
        priority
      />

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

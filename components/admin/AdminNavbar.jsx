'use client';

import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth/AuthContext';

const ROLE_BADGE = {
  ceo: {
    label: 'CEO',
    gradient: 'linear-gradient(135deg, #c9a227 0%, #f0d060 45%, #d4af37 75%, #a07010 100%)',
    border: 'rgba(212,175,55,0.55)',
    glow: 'rgba(212,175,55,0.25)',
  },
  admin: {
    label: 'ADMIN',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 45%, #60a5fa 75%, #1d4ed8 100%)',
    border: 'rgba(96,165,250,0.5)',
    glow: 'rgba(59,130,246,0.2)',
  },
};

const STAFF_BADGE = {
  label: 'STAFF',
  gradient: 'linear-gradient(135deg, #6b7280 0%, #d1d5db 40%, #e5e7eb 65%, #9ca3af 100%)',
  border: 'rgba(209,213,219,0.55)',
  glow: 'rgba(209,213,219,0.15)',
};

function getRoleBadge(role) {
  if (!role) return null;
  return ROLE_BADGE[role] ?? STAFF_BADGE;
}

export function AdminNavbar({ onMenu, sidebarOpen, isDesktop }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { user } = useAuth();
  const badge = getRoleBadge(user?.role);

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
      {/* Menu toggle — hidden on desktop (sidebar is always visible there) */}
      <button
        onClick={onMenu}
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg active:scale-90"
        style={{ display: isDesktop ? 'none' : undefined }}
        style={{
          color: sidebarOpen ? (isDark ? '#ebebef' : '#1a1a1a') : (isDark ? '#9a9aab' : '#777'),
          background: sidebarOpen
            ? (isDark ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.1)')
            : 'transparent',
          border: sidebarOpen
            ? `1px solid ${isDark ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.35)'}`
            : '1px solid transparent',
          transition: 'color 0.2s ease, background 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!sidebarOpen) {
            e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : '#f5efe2';
          }
        }}
        onMouseLeave={(e) => {
          if (!sidebarOpen) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        {/* Menu bars icon */}
        <span
          style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: sidebarOpen ? 0 : 1,
            transform: sidebarOpen ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
            transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <Menu strokeWidth={2} style={{ width: 22, height: 22 }} />
        </span>

        {/* X close icon */}
        <span
          style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: sidebarOpen ? 1 : 0,
            transform: sidebarOpen ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
            transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <X strokeWidth={2.5} style={{ width: 22, height: 22 }} />
        </span>
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

        {/* Role badge — pill container + gradient text via nested span */}
        {badge && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '999px',
              border: `1px solid ${badge.border}`,
              boxShadow: `0 0 8px ${badge.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              userSelect: 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                background: badge.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {badge.label}
            </span>
          </span>
        )}
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

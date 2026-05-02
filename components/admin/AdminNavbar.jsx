'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Menu, X, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth/AuthContext';

// ─── Role badge config ────────────────────────────────────────────────────────
const ROLE_BADGE = {
  ceo: {
    label: 'CEO',
    gradient: 'linear-gradient(135deg, #c9a227 0%, #f0d060 45%, #d4af37 75%, #a07010 100%)',
    border: 'rgba(212,175,55,0.55)',
    glow:   'rgba(212,175,55,0.25)',
  },
  admin: {
    label: 'ADMIN',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 45%, #60a5fa 75%, #1d4ed8 100%)',
    border: 'rgba(96,165,250,0.5)',
    glow:   'rgba(59,130,246,0.2)',
  },
};

const STAFF_BADGE = {
  label: 'STAFF',
  gradient: 'linear-gradient(135deg, #6b7280 0%, #d1d5db 40%, #e5e7eb 65%, #9ca3af 100%)',
  border: 'rgba(209,213,219,0.55)',
  glow:   'rgba(209,213,219,0.15)',
};

function getRoleBadge(role) {
  if (!role) return null;
  return ROLE_BADGE[role] ?? STAFF_BADGE;
}

// ─── Theme toggle ─────────────────────────────────────────────────────────────
const THEME_OPTIONS = [
  { value: 'light',  Icon: Sun,     label: 'Light mode'    },
  { value: 'dark',   Icon: Moon,    label: 'Dark mode'     },
  { value: 'system', Icon: Monitor, label: 'System default' },
];

const THUMB_W = 28; // px — width of each segment and the sliding indicator

function ThemeToggle({ isDark }) {
  const { theme, setTheme } = useTheme();
  // next-themes needs to be mounted before theme is readable
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Render a same-size invisible placeholder until mounted to avoid layout shift
  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        style={{ width: THUMB_W * 3 + 4, height: 30, flexShrink: 0 }}
      />
    );
  }

  const activeIdx = THEME_OPTIONS.findIndex((o) => o.value === theme);

  return (
    <div
      role="group"
      aria-label="Color theme"
      style={{
        position:     'relative',
        display:      'inline-flex',
        alignItems:   'center',
        flexShrink:    0,
        height:        30,
        padding:       2,
        borderRadius: '999px',
        background:    isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        border:       `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)'}`,
        // Smooth container appearance/disappearance when theme changes
        transition:   'background 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* Sliding highlight — GPU-composited transform only */}
      <span
        aria-hidden="true"
        style={{
          position:     'absolute',
          left:          2,
          top:           2,
          width:         THUMB_W,
          height:       'calc(100% - 4px)',
          borderRadius: '999px',
          background:    isDark
            ? 'rgba(255,255,255,0.15)'
            : '#ffffff',
          boxShadow: isDark
            ? '0 1px 4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 1px 3px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)',
          // Spring slide — overshoots slightly, feels physical
          transform:    `translateX(${Math.max(0, activeIdx) * THUMB_W}px)`,
          transition:   'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), background 0.25s ease, box-shadow 0.25s ease',
          pointerEvents: 'none',
          willChange:   'transform',
        }}
      />

      {/* Segment buttons */}
      {THEME_OPTIONS.map(({ value, Icon, label }, idx) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            style={{
              position:        'relative',
              zIndex:           1,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              width:            THUMB_W,
              height:           26,
              border:          'none',
              padding:          0,
              background:      'transparent',
              borderRadius:    '999px',
              cursor:          'pointer',
              color: isActive
                ? (isDark ? '#ebebef' : '#1a1a1a')
                : (isDark ? '#5a5a6a' : '#b0b0b8'),
              transition:      'color 0.2s ease, transform 0.12s ease',
              // Subtle scale on press
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.88)'; }}
            onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Icon size={13} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
export function AdminNavbar({ onMenu, sidebarOpen, isDesktop }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { user }  = useAuth();
  const badge = getRoleBadge(user?.role);

  return (
    <header
      className="flex h-14 flex-shrink-0 items-center gap-3 px-4"
      style={{
        background:   isDark ? '#111214' : '#ffffff',
        borderBottom: `1px solid ${isDark ? '#2c2e32' : '#ede8df'}`,
        boxShadow: isDark
          ? '0 1px 0 rgba(212,175,55,0.08), 0 2px 8px rgba(0,0,0,0.4)'
          : '0 1px 0 rgba(212,175,55,0.15), 0 1px 4px rgba(0,0,0,0.04)',
        // Smooth theme transition on the navbar background
        transition:   'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Menu toggle — hidden on desktop (sidebar is always visible there) */}
      <button
        onClick={onMenu}
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg active:scale-90"
        style={{
          display:    isDesktop ? 'none' : undefined,
          color:      sidebarOpen ? (isDark ? '#ebebef' : '#1a1a1a') : (isDark ? '#9a9aab' : '#777'),
          background: sidebarOpen
            ? (isDark ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.1)')
            : 'transparent',
          border: sidebarOpen
            ? `1px solid ${isDark ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.35)'}`
            : '1px solid transparent',
          transition: 'color 0.2s ease, background 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
        }}
        onMouseEnter={(e) => { if (!sidebarOpen) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : '#f5efe2'; }}
        onMouseLeave={(e) => { if (!sidebarOpen) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Menu bars — fades + rotates out when open */}
        <span style={{
          position:   'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity:    sidebarOpen ? 0 : 1,
          transform:  sidebarOpen ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
          transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <Menu strokeWidth={2} style={{ width: 22, height: 22 }} />
        </span>

        {/* X — fades + rotates in when open */}
        <span style={{
          position:   'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity:    sidebarOpen ? 1 : 0,
          transform:  sidebarOpen ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
          transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <X strokeWidth={2.5} style={{ width: 22, height: 22 }} />
        </span>
      </button>

      {/* Logo + CMS wordmark + role badge */}
      <div className="flex items-center gap-2.5">
        <Image src="/logo.png" alt="Wildlife Universe" width={150} height={40}
          style={{ objectFit: 'contain' }} priority />

        {/* Hairline gold divider */}
        <span style={{
          display: 'block', width: 1, height: 22, borderRadius: 1,
          background: isDark ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.45)',
        }} />

        {/* CMS — Playfair italic, gold gradient */}
        <span style={{
          fontFamily: 'var(--font-playfair), Georgia, serif',
          fontSize: '1rem', fontWeight: 700, fontStyle: 'italic',
          letterSpacing: '0.04em',
          background: isDark
            ? 'linear-gradient(135deg, #d4af37 0%, #f0d060 50%, #c9a227 100%)'
            : 'linear-gradient(135deg, #b8860b 0%, #d4af37 50%, #a07010 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', userSelect: 'none',
        }}>
          CMS
        </span>

        {/* Role badge */}
        {badge && (
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: '999px',
            border: `1px solid ${badge.border}`,
            boxShadow: `0 0 8px ${badge.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            userSelect: 'none',
          }}>
            <span style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em',
              background: badge.gradient,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {badge.label}
            </span>
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: Theme toggle + Live indicator */}
      <div className="flex items-center gap-3">
        <ThemeToggle isDark={isDark} />

        {/* Thin separator */}
        <span style={{
          display: 'block', width: 1, height: 18, borderRadius: 1,
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }} />

        {/* Live */}
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#008000' }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#008000] opacity-40" />
            <span className="relative h-2 w-2 rounded-full bg-[#008000]" />
          </span>
          Live
        </div>
      </div>
    </header>
  );
}

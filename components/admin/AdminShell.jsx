'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { AdminGuard } from './AdminGuard';
import { AdminNavbar } from './AdminNavbar';
import { AdminSidebar } from './AdminSidebar';

const SIDEBAR_W = 270;

export function AdminShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const closeSidebar = () => setSidebarOpen(false);

  const cssVars = isDark
    ? {
        '--adm-bg':            '#111214',
        '--adm-surface':       '#1a1c1f',
        '--adm-surface-2':     '#212326',
        '--adm-surface-3':     '#28292e',
        '--adm-border':        '#2c2e32',
        '--adm-border-2':      '#363840',
        '--adm-text':          '#ebebef',
        '--adm-text-muted':    '#9a9aab',
        '--adm-text-subtle':   '#6b6b7a',
        '--adm-active-bg':     '#1e1a08',
        '--adm-active-border': '#d4af37',
        '--adm-hover-bg':      'rgba(255,255,255,0.04)',
        '--adm-shadow':        '0 1px 6px rgba(0,0,0,0.35)',
        '--adm-shadow-lg':     '0 4px 24px rgba(0,0,0,0.5)',
      }
    : {
        '--adm-bg':            '#f5efe2',
        '--adm-surface':       '#ffffff',
        '--adm-surface-2':     '#faf6ee',
        '--adm-surface-3':     '#f5ede0',
        '--adm-border':        '#f0e8d8',
        '--adm-border-2':      '#e5ddd0',
        '--adm-text':          '#1a1a1a',
        '--adm-text-muted':    '#888888',
        '--adm-text-subtle':   '#bbbbbb',
        '--adm-active-bg':     '#f5e6c8',
        '--adm-active-border': '#d4af37',
        '--adm-hover-bg':      '#faf6ee',
        '--adm-shadow':        '0 1px 6px rgba(0,0,0,0.06)',
        '--adm-shadow-lg':     '0 4px 24px rgba(0,0,0,0.1)',
      };

  return (
    <AdminGuard>
      <div
        className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
        style={{ background: 'var(--adm-bg)', ...cssVars }}
      >
        {/* ── Navbar ─────────────────────────────────────────────────────── */}
        <AdminNavbar
          sidebarOpen={sidebarOpen}
          onMenu={() => setSidebarOpen((v) => !v)}
        />

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">

          {/* Backdrop — always an overlay; fades in when sidebar opens */}
          <div
            aria-hidden="true"
            onClick={closeSidebar}
            style={{
              position:             'absolute',
              inset:                0,
              zIndex:               30,
              background:           isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)',
              backdropFilter:       sidebarOpen ? 'blur(4px)' : 'blur(0px)',
              WebkitBackdropFilter: sidebarOpen ? 'blur(4px)' : 'blur(0px)',
              opacity:              sidebarOpen ? 1 : 0,
              pointerEvents:        sidebarOpen ? 'auto' : 'none',
              transition:           'opacity 0.28s ease, backdrop-filter 0.28s ease',
            }}
          />

          {/* Sidebar — always a slide-in drawer, never a persistent column */}
          <aside style={{
            position:      'absolute',
            top:            0,
            bottom:         0,
            left:           0,
            zIndex:         40,
            width:          SIDEBAR_W,
            display:       'flex',
            flexDirection: 'column',
            background:    'var(--adm-surface)',
            borderRight:   '1px solid var(--adm-border)',
            willChange:    'transform',
            transform:      sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            boxShadow:      sidebarOpen ? '6px 0 40px rgba(0,0,0,0.18)' : 'none',
            transition:     sidebarOpen
              ? 'transform 0.32s cubic-bezier(0.22,1,0.36,1), box-shadow 0.32s ease'
              : 'transform 0.22s cubic-bezier(0.4,0,1,1), box-shadow 0.22s ease',
          }}>
            <AdminSidebar onClose={closeSidebar} />
          </aside>

          {/* Main content — always takes full width since sidebar is overlay */}
          <main
            className="relative flex-1 min-w-0 overflow-y-auto"
            style={{ overscrollBehavior: 'contain' }}
          >
            <div className="mx-auto w-full max-w-[1330px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}

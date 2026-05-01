'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { AdminGuard } from './AdminGuard';
import { AdminNavbar } from './AdminNavbar';
import { AdminSidebar } from './AdminSidebar';

export function AdminShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  /* CSS custom properties let every admin child component react to dark mode
     without each file needing its own useTheme call. */
  const cssVars = isDark
    ? {
        '--adm-bg':           '#111214',
        '--adm-surface':      '#1a1c1f',
        '--adm-surface-2':    '#212326',
        '--adm-surface-3':    '#28292e',
        '--adm-border':       '#2c2e32',
        '--adm-border-2':     '#363840',
        '--adm-text':         '#ebebef',
        '--adm-text-muted':   '#9a9aab',
        '--adm-text-subtle':  '#6b6b7a',
        '--adm-active-bg':    '#1e1a08',
        '--adm-active-border':'#d4af37',
        '--adm-hover-bg':     'rgba(255,255,255,0.04)',
        '--adm-shadow':       '0 1px 6px rgba(0,0,0,0.35)',
        '--adm-shadow-lg':    '0 4px 24px rgba(0,0,0,0.5)',
      }
    : {
        '--adm-bg':           '#f5efe2',
        '--adm-surface':      '#ffffff',
        '--adm-surface-2':    '#faf6ee',
        '--adm-surface-3':    '#f5ede0',
        '--adm-border':       '#f0e8d8',
        '--adm-border-2':     '#e5ddd0',
        '--adm-text':         '#1a1a1a',
        '--adm-text-muted':   '#888888',
        '--adm-text-subtle':  '#bbbbbb',
        '--adm-active-bg':    '#f5e6c8',
        '--adm-active-border':'#d4af37',
        '--adm-hover-bg':     '#faf6ee',
        '--adm-shadow':       '0 1px 6px rgba(0,0,0,0.06)',
        '--adm-shadow-lg':    '0 4px 24px rgba(0,0,0,0.1)',
      };

  return (
    <AdminGuard>
      <div
        className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
        style={{ background: 'var(--adm-bg)', ...cssVars }}
      >
        <AdminNavbar onMenu={() => setSidebarOpen(true)} />

        <div className="relative flex min-h-0 flex-1">
          {/* Backdrop */}
          {sidebarOpen && (
            <div
              className="absolute inset-0 z-30"
              style={{ background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Slide-in sidebar */}
          <div
            className="absolute inset-y-0 left-0 z-40 w-[220px] shadow-2xl"
            style={{
              background: 'var(--adm-surface)',
              borderRight: `1px solid var(--adm-border)`,
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>

          {/* Scrollable main */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}

'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const FONT_MAP = {
  'Inter (Default)':  'var(--font-inter), Inter, sans-serif',
  'Playfair Display': 'var(--font-playfair), "Playfair Display", Georgia, serif',
  'Georgia':          'Georgia, serif',
  'System UI':        'system-ui, sans-serif',
};

const THEME_MAP = {
  System: 'system',
  Light:  'light',
  Dark:   'dark',
};

function darken(hex, pct = 0.18) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - pct)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - pct)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - pct)));
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function applySettings(s, setTheme) {
  const root = document.documentElement;

  if (s.color) {
    const hex = s.color;
    const n   = parseInt(hex.replace('#', ''), 16);
    const r   = (n >> 16) & 0xff;
    const g   = (n >> 8)  & 0xff;
    const b   = n & 0xff;

    root.style.setProperty('--color-primary',      hex);
    root.style.setProperty('--color-primary-deep', darken(hex));
    root.style.setProperty('--color-primary-soft', `rgba(${r},${g},${b},0.12)`);
  }

  if (s.font && FONT_MAP[s.font]) {
    document.body.style.fontFamily = FONT_MAP[s.font];
  }

  if (s.theme && setTheme) {
    setTheme(THEME_MAP[s.theme] ?? 'system');
  }
}

export function SiteSettingsProvider({ children }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    function apply() {
      try {
        const raw = localStorage.getItem('wu:site_settings');
        if (raw) applySettings(JSON.parse(raw), setTheme);
      } catch { /* ignore */ }
    }

    apply();
    window.addEventListener('wu:storage-changed', apply);
    return () => window.removeEventListener('wu:storage-changed', apply);
  }, [setTheme]);

  return children;
}

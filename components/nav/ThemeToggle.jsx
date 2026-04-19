'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

const order = ['light', 'dark', 'system'];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="glass flex h-10 w-10 items-center justify-center rounded-full"
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  const current = theme || 'system';
  const next = order[(order.indexOf(current) + 1) % order.length];
  const Icon = current === 'light' ? Sun : current === 'dark' ? Moon : Monitor;

  return (
    <button
      aria-label={`Theme: ${current}. Click to switch to ${next}.`}
      onClick={() => setTheme(next)}
      className="glass group flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 hover:border-[var(--color-primary)]"
    >
      <Icon className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" />
    </button>
  );
}

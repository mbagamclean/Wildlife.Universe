'use client';

import { Check } from 'lucide-react';
import { avatars } from '@/lib/data/avatars';

export function AvatarPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {avatars.map(({ id, name, Component }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-label={`Choose ${name} avatar`}
            aria-pressed={selected}
            className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2 transition-all duration-300 ${
              selected
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8 scale-[1.04]'
                : 'border-transparent hover:border-[var(--color-primary)]/40 hover:scale-[1.04]'
            }`}
          >
            <Component size={64} className="rounded-full" />
            <span className="text-xs font-medium text-[var(--color-fg-soft)]">
              {name}
            </span>
            {selected && (
              <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

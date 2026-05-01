'use client';

import { countries } from '@/lib/data/countries';

export function CountrySelect({ value, onChange, id = 'country', required = false }) {
  return (
    <select
      id={id}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-4 py-3 text-sm text-[var(--color-fg)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
    >
      <option value="" disabled>
        Select your country
      </option>
      {countries.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

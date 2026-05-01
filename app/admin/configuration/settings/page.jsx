'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const THEMES = ['System', 'Light', 'Dark'];
const FONTS = ['Inter (Default)', 'Playfair Display', 'Georgia', 'System UI'];
const COLORS = [
  { name: 'Wildlife Green', value: '#008000' },
  { name: 'Ocean Blue',     value: '#1a6eb5' },
  { name: 'Desert Gold',    value: '#d4af37' },
  { name: 'Forest Deep',    value: '#1a4a1a' },
  { name: 'Sunset Orange',  value: '#e06030' },
];

const THEME_MAP = { System: 'system', Light: 'light', Dark: 'dark' };

export default function AdminSettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState('System');
  const [font, setFont]   = useState('Inter (Default)');
  const [color, setColor] = useState('#008000');
  const [saved, setSaved] = useState(false);
  const { setTheme } = useTheme();

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('wu:site_settings') || '{}');
      if (s.theme) setSelectedTheme(s.theme);
      if (s.font)  setFont(s.font);
      if (s.color) setColor(s.color);
    } catch { /* ignore */ }
  }, []);

  const save = () => {
    const settings = { theme: selectedTheme, font, color };
    localStorage.setItem('wu:site_settings', JSON.stringify(settings));
    setTheme(THEME_MAP[selectedTheme] ?? 'system');
    window.dispatchEvent(new CustomEvent('wu:storage-changed'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          CONFIGURATION
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Settings</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Manage website theme, fonts, and default colours.</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Theme */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-3 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Theme</p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTheme(t)}
                className="rounded-xl border px-5 py-2 text-sm font-semibold transition-all"
                style={
                  selectedTheme === t
                    ? { background: '#008000', color: '#fff', borderColor: '#008000' }
                    : { borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)', background: 'var(--adm-surface-2)' }
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Font */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-3 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Body Font</p>
          <div className="flex flex-wrap gap-2">
            {FONTS.map((f) => (
              <button
                key={f}
                onClick={() => setFont(f)}
                className="rounded-xl border px-5 py-2 text-sm font-semibold transition-all"
                style={
                  font === f
                    ? { background: '#008000', color: '#fff', borderColor: '#008000' }
                    : { borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)', background: 'var(--adm-surface-2)' }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Colour */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-3 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Primary Colour</p>
          <div className="flex flex-wrap gap-3">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all"
                style={
                  color === c.value
                    ? { borderColor: c.value, background: c.value + '15', color: 'var(--adm-text)' }
                    : { borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)', background: 'var(--adm-surface-2)' }
                }
              >
                <span className="h-4 w-4 flex-shrink-0 rounded-full" style={{ background: c.value }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <button
            onClick={save}
            className="rounded-xl bg-[#008000] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#006400] active:scale-95"
          >
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { categoriesDb } from '@/lib/storage/categoriesDb';
import { Plus, X } from 'lucide-react';

export default function AdminLabelsPage() {
  const [cats, setCats]     = useState([]);
  const [inputs, setInputs] = useState({});
  const [loaded, setLoaded] = useState(false);

  const reload = async () => {
    const data = await categoriesDb.list();
    setCats(data);
    setLoaded(true);
  };

  useEffect(() => {
    reload();

    const onUpdate = () => reload();
    window.addEventListener('wu:storage-changed', onUpdate);
    return () => window.removeEventListener('wu:storage-changed', onUpdate);
  }, []);

  const addLabel = async (slug) => {
    const val = (inputs[slug] || '').trim();
    if (!val) return;
    await categoriesDb.addLabel(slug, val);
    setInputs((prev) => ({ ...prev, [slug]: '' }));
    reload();
  };

  const removeLabel = async (slug, label) => {
    await categoriesDb.removeLabel(slug, label);
    reload();
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          ORGANIZATION
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Labels</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Add or remove labels within each category.</p>
      </div>

      {!loaded ? (
        <p className="text-sm" style={{ color: 'var(--adm-text-subtle)' }}>Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {cats.map((c) => (
            <div key={c.slug} className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
              <p className="mb-3 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>{c.name}</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {c.labels.map((l) => (
                  <span
                    key={l}
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: 'var(--adm-surface-3)', border: '1px solid var(--adm-border)', color: 'var(--adm-text-muted)' }}
                  >
                    {l}
                    <button
                      onClick={() => removeLabel(c.slug, l)}
                      className="text-[#bbb] hover:text-red-400 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {c.labels.length === 0 && (
                  <span className="text-xs" style={{ color: 'var(--adm-text-subtle)' }}>No labels</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={inputs[c.slug] || ''}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [c.slug]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addLabel(c.slug)}
                  placeholder="New label…"
                  className="flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                  style={{
                    background: 'var(--adm-surface-2)',
                    border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#d4af37'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
                />
                <button
                  onClick={() => addLabel(c.slug)}
                  className="flex items-center gap-1 rounded-lg bg-[#008000] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#006400]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

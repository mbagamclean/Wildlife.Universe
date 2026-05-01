'use client';
import { useState, useEffect } from 'react';
import { categoriesDb } from '@/lib/storage/categoriesDb';
import { Plus, Trash2 } from 'lucide-react';

const ICONS = { animals: '🦁', plants: '🌿', birds: '🐦', insects: '🦋', posts: '📝' };

export default function AdminCategoriesPage() {
  const [cats, setCats]       = useState([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const refresh = () => categoriesDb.list().then(setCats);
    refresh();
    window.addEventListener('wu:storage-changed', refresh);
    return () => window.removeEventListener('wu:storage-changed', refresh);
  }, []);

  const add = async () => {
    if (!newName.trim()) return;
    await categoriesDb.add(newName.trim());
    setNewName('');
  };

  const remove = async (slug) => {
    if (!confirm(`Remove "${slug}" category?`)) return;
    await categoriesDb.remove(slug);
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          ORGANIZATION
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Categories</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Add or remove content categories.</p>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="New category name…"
          className="flex-1 rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
          style={{
            background: 'var(--adm-surface)',
            border: '1px solid var(--adm-border)',
            color: 'var(--adm-text)',
            boxShadow: 'var(--adm-shadow)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#d4af37'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
        />
        <button
          onClick={add}
          className="flex items-center gap-2 rounded-xl bg-[#008000] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006400]"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="rounded-2xl" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
        {cats.map((c, i) => (
          <div
            key={c.slug}
            className="flex items-center gap-3 px-5 py-4"
            style={i < cats.length - 1 ? { borderBottom: '1px solid var(--adm-border)' } : {}}
          >
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg"
              style={{ background: 'var(--adm-surface-3)' }}
            >
              {ICONS[c.slug] || '📁'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold" style={{ color: 'var(--adm-text)' }}>{c.name}</p>
              <p className="text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{c.labels?.length || 0} labels · /{c.slug}</p>
            </div>
            <button
              onClick={() => remove(c.slug)}
              className="text-[#ccc] hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {cats.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>No categories yet.</p>
        )}
      </div>
    </div>
  );
}

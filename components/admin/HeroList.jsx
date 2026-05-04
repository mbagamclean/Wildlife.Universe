'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { db } from '@/lib/storage/db';
import { HERO_MODE, MAX_HEROES } from '@/lib/storage/keys';
import { HeroEditor } from './HeroEditor';

export function HeroList() {
  const [heroes, setHeroes] = useState([]);
  const [mode, setMode] = useState(HERO_MODE.DEFAULT);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const [list, m] = await Promise.all([db.heroes.list(), db.mode.get()]);
    setHeroes(list);
    setMode(m);
    setLoaded(true);
  };

  useEffect(() => { load(); }, []);

  const onModeChange = async (m) => {
    setMode(m);
    await db.mode.set(m);
  };

  const onCreate = async (payload) => {
    if (heroes.length >= MAX_HEROES) {
      alert(`You can have at most ${MAX_HEROES} hero items.`);
      return;
    }
    await db.heroes.create(payload);
    setCreating(false);
    await load();
  };

  const onUpdate = async (payload) => {
    await db.heroes.update(editing.id, payload);
    setEditing(null);
    await load();
  };

  const onDelete = async (h) => {
    if (!confirm(`Delete hero "${h.title}"?`)) return;
    await db.heroes.remove(h.id);
    await load();
  };

  const onToggleActive = async (h) => {
    await db.heroes.update(h.id, { active: h.active === false });
    await load();
  };

  // Drag-to-reorder
  const dragId = useRef(null);
  const onDragStart = (id) => () => { dragId.current = id; };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = (overId) => async (e) => {
    e.preventDefault();
    const fromId = dragId.current;
    dragId.current = null;
    if (!fromId || fromId === overId) return;
    const arr = heroes.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const fromIdx = arr.findIndex((x) => x.id === fromId);
    const toIdx = arr.findIndex((x) => x.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    const reordered = arr.map((it, i) => ({ ...it, position: i }));
    setHeroes(reordered);
    try {
      await db.heroes.reorder(reordered.map((it) => ({ id: it.id, position: it.position })));
    } finally {
      load();
    }
  };

  if (!loaded) {
    return <p className="text-sm text-[var(--color-fg-soft)]">Loading hero items…</p>;
  }

  if (creating) {
    return <HeroEditor onSave={onCreate} onCancel={() => setCreating(false)} />;
  }

  if (editing) {
    return <HeroEditor initial={editing} onSave={onUpdate} onCancel={() => setEditing(null)} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-fg-soft)]">Hero mode</p>
          <p className="text-sm text-[var(--color-fg)]">
            {mode === HERO_MODE.FEATURED
              ? 'Featured: pulls 5 random featured posts.'
              : 'Default: shows your curated hero items.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onModeChange(HERO_MODE.DEFAULT)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === HERO_MODE.DEFAULT
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--glass-border)] hover:bg-[var(--color-primary)]/10'
            }`}
          >
            Default
          </button>
          <button
            onClick={() => onModeChange(HERO_MODE.FEATURED)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === HERO_MODE.FEATURED
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--glass-border)] hover:bg-[var(--color-primary)]/10'
            }`}
          >
            Featured posts
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Hero items <span className="text-[var(--color-fg-soft)]">({heroes.length}/{MAX_HEROES})</span></h2>
        <button
          onClick={() => setCreating(true)}
          disabled={heroes.length >= MAX_HEROES}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[var(--color-primary)]/30 hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> New hero
        </button>
      </div>

      {heroes.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-[var(--color-fg-soft)]">
          No hero items yet. Click "New hero" to add one.
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--color-fg-soft)]">
            Drag the handle to reorder. Toggle the eye to hide a hero without deleting it.
          </p>
          <ul className="grid gap-3">
            {heroes.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((h) => {
              const isHidden = h.active === false;
              return (
                <li
                  key={h.id}
                  draggable
                  onDragStart={onDragStart(h.id)}
                  onDragOver={onDragOver}
                  onDrop={onDrop(h.id)}
                  className="glass flex items-center gap-3 rounded-2xl p-4"
                  style={{ opacity: isHidden ? 0.55 : 1 }}
                >
                  <span
                    className="cursor-grab text-[var(--color-fg-soft)] active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                    style={{ background: 'var(--glass-bg)', color: 'var(--color-fg-soft)' }}
                  >
                    {(h.position ?? 0) + 1}
                  </span>
                  <div
                    className="h-16 w-24 shrink-0 overflow-hidden rounded-xl"
                    style={{ background: `linear-gradient(135deg, ${h.palette?.from || '#0c4a1a'}, ${h.palette?.to || '#d4af37'})` }}
                  >
                    {h.src && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={h.src} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {h.title}
                      {isHidden && (
                        <span className="ml-2 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Hidden</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-[var(--color-fg-soft)]">{h.description}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onToggleActive(h)}
                      aria-label={isHidden ? 'Show on homepage' : 'Hide from homepage'}
                      title={isHidden ? 'Show on homepage' : 'Hide from homepage'}
                      className="glass flex h-9 w-9 items-center justify-center rounded-full"
                    >
                      {isHidden
                        ? <EyeOff className="h-4 w-4 text-[var(--color-fg-soft)]" />
                        : <Eye className="h-4 w-4 text-emerald-600" />}
                    </button>
                    <button
                      onClick={() => setEditing(h)}
                      aria-label="Edit"
                      className="glass flex h-9 w-9 items-center justify-center rounded-full hover:text-[var(--color-primary)]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(h)}
                      aria-label="Delete"
                      className="glass flex h-9 w-9 items-center justify-center rounded-full hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

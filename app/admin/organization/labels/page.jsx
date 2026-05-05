'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Pencil, Trash2, Check, Folder, Tag, AlertTriangle,
  Loader2, AlertCircle, Save,
} from 'lucide-react';
import { categoriesDb } from '@/lib/storage/categoriesDb';
import { labelSlug } from '@/lib/mock/categories';

export default function AdminLabelsPage() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state for "Add Label" per-category inline form
  const [adding, setAdding] = useState(null);             // category slug currently in add mode
  const [addInput, setAddInput] = useState('');

  // Inline rename state
  const [editing, setEditing] = useState(null);           // { categorySlug, originalName }
  const [editInput, setEditInput] = useState('');

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { categorySlug, label }

  // Add Category modal
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await categoriesDb.list();
      setCats(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const onUpdate = () => reload();
    window.addEventListener('wu:storage-changed', onUpdate);
    return () => window.removeEventListener('wu:storage-changed', onUpdate);
  }, [reload]);

  const startAdd = (slug) => {
    setAdding(slug);
    setAddInput('');
  };
  const cancelAdd = () => { setAdding(null); setAddInput(''); };
  const submitAdd = async (slug) => {
    const val = addInput.trim();
    if (!val) return;
    try {
      await categoriesDb.addLabel(slug, val);
      setAdding(null); setAddInput('');
      reload();
    } catch (e) { setError(e.message); }
  };

  const startEdit = (categorySlug, label) => {
    setEditing({ categorySlug, originalName: label });
    setEditInput(label);
  };
  const cancelEdit = () => { setEditing(null); setEditInput(''); };
  const submitEdit = async () => {
    const next = editInput.trim();
    if (!next || !editing) return cancelEdit();
    if (next === editing.originalName) return cancelEdit();
    try {
      await categoriesDb.removeLabel(editing.categorySlug, editing.originalName);
      await categoriesDb.addLabel(editing.categorySlug, next);
      cancelEdit();
      reload();
    } catch (e) { setError(e.message); }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await categoriesDb.removeLabel(deleteConfirm.categorySlug, deleteConfirm.label);
      setDeleteConfirm(null);
      reload();
    } catch (e) { setError(e.message); }
  };

  const submitNewCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      await categoriesDb.add(name);
      setShowAddCategory(false);
      setNewCategoryName('');
      reload();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="p-5 sm:p-8">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
            <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
            ORGANIZATION
          </p>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Labels</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            Create labels to further organize posts within categories.
          </p>
        </div>
        <button
          onClick={() => setShowAddCategory(true)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
          style={{ background: '#d4af37' }}
        >
          <Plus size={14} /> Add Category
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading && cats.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--adm-text-muted)' }} />
        </div>
      )}

      {!loading && cats.length === 0 && (
        <div className="rounded-2xl py-16 text-center" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
          <Folder size={42} className="mx-auto mb-3 opacity-40" style={{ color: 'var(--adm-text-subtle)' }} />
          <p className="text-base font-bold" style={{ color: 'var(--adm-text)' }}>No categories yet</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            Click <strong>Add Category</strong> to create your first content group.
          </p>
        </div>
      )}

      {/* ── Category sections ──────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {cats.map((cat) => (
          <CategorySection
            key={cat.slug}
            cat={cat}
            adding={adding === cat.slug}
            addInput={addInput}
            setAddInput={setAddInput}
            onStartAdd={() => startAdd(cat.slug)}
            onCancelAdd={cancelAdd}
            onSubmitAdd={() => submitAdd(cat.slug)}
            editing={editing && editing.categorySlug === cat.slug ? editing : null}
            editInput={editInput}
            setEditInput={setEditInput}
            onStartEdit={(label) => startEdit(cat.slug, label)}
            onCancelEdit={cancelEdit}
            onSubmitEdit={submitEdit}
            onAskDelete={(label) => setDeleteConfirm({ categorySlug: cat.slug, label })}
          />
        ))}
      </div>

      {/* ── Delete confirmation modal ───────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(220,38,38,0.12)' }}>
                <AlertTriangle size={24} style={{ color: '#dc2626' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black" style={{ color: 'var(--adm-text)' }}>Delete label?</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>
                  This will permanently delete the label{' '}
                  <strong style={{ color: 'var(--adm-text)' }}>&ldquo;{deleteConfirm.label}&rdquo;</strong>{' '}
                  from this category. Posts already tagged with it will keep the tag string but the label entry will be gone.
                </p>
              </div>
              <button onClick={() => setDeleteConfirm(null)} className="rounded-lg p-1.5">
                <X size={16} style={{ color: 'var(--adm-text-muted)' }} />
              </button>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold"
                style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
                style={{ background: '#dc2626' }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Category modal ──────────────────────────────── */}
      {showAddCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowAddCategory(false)}>
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-black" style={{ color: 'var(--adm-text)' }}>Add Category</h3>
              <button onClick={() => setShowAddCategory(false)} className="rounded-lg p-1.5">
                <X size={16} style={{ color: 'var(--adm-text-muted)' }} />
              </button>
            </div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>
              Category Name *
            </label>
            <input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitNewCategory()}
              placeholder="e.g. Marine Life"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#d4af37]"
              style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
            />
            <p className="mt-1 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
              Slug will be auto-generated: <code>{labelSlug(newCategoryName) || 'category-slug'}</code>
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowAddCategory(false)}
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold"
                style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={submitNewCategory}
                disabled={!newCategoryName.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
                style={{ background: '#d4af37', opacity: newCategoryName.trim() ? 1 : 0.5 }}
              >
                <Save size={13} /> Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategorySection({
  cat, adding, addInput, setAddInput, onStartAdd, onCancelAdd, onSubmitAdd,
  editing, editInput, setEditInput, onStartEdit, onCancelEdit, onSubmitEdit, onAskDelete,
}) {
  const labels = cat.labels || [];

  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}>
      {/* Category header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
        <div className="flex items-center gap-2">
          <Folder size={18} style={{ color: '#d4af37' }} />
          <h2 className="text-base font-bold" style={{ color: 'var(--adm-text)' }}>{cat.name}</h2>
          <span className="text-xs" style={{ color: 'var(--adm-text-subtle)' }}>
            ({labels.length} label{labels.length === 1 ? '' : 's'})
          </span>
        </div>
        {!adding && (
          <button
            onClick={onStartAdd}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
          >
            <Plus size={12} /> Add label
          </button>
        )}
      </div>

      {/* Add-label row */}
      {adding && (
        <div className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: 'var(--adm-border)', background: 'rgba(212,175,55,0.05)' }}>
          <Tag size={14} style={{ color: '#d4af37' }} />
          <input
            autoFocus
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmitAdd();
              if (e.key === 'Escape') onCancelAdd();
            }}
            placeholder="New label name…"
            className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#d4af37]"
            style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
          />
          <button
            onClick={onSubmitAdd}
            disabled={!addInput.trim()}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
            style={{ background: '#16a34a', opacity: addInput.trim() ? 1 : 0.5 }}
          >
            <Check size={12} /> Save
          </button>
          <button
            onClick={onCancelAdd}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Labels table */}
      {labels.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'transparent', color: 'var(--adm-text-subtle)' }}>
              <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">Label</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider hidden md:table-cell">Slug</th>
              <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((label) => {
              const isEditing = editing && editing.originalName === label;
              return (
                <tr key={label} className="border-t" style={{ borderColor: 'var(--adm-border)' }}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ background: 'rgba(22,163,74,0.10)' }}>
                        <Tag size={14} style={{ color: '#16a34a' }} />
                      </div>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editInput}
                          onChange={(e) => setEditInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onSubmitEdit();
                            if (e.key === 'Escape') onCancelEdit();
                          }}
                          className="flex-1 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[#d4af37]"
                          style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
                        />
                      ) : (
                        <span className="font-semibold" style={{ color: 'var(--adm-text)' }}>{label}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <code className="text-[12px]" style={{ color: 'var(--adm-text-muted)' }}>{labelSlug(label)}</code>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={onSubmitEdit}
                            title="Save"
                            className="rounded-lg p-1.5"
                            style={{ background: 'rgba(22,163,74,0.12)' }}
                          >
                            <Check size={14} style={{ color: '#16a34a' }} />
                          </button>
                          <button onClick={onCancelEdit} title="Cancel" className="rounded-lg p-1.5">
                            <X size={14} style={{ color: 'var(--adm-text-muted)' }} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => onStartEdit(label)} title="Rename" className="rounded-lg p-1.5">
                            <Pencil size={14} style={{ color: 'var(--adm-text-muted)' }} />
                          </button>
                          <button onClick={() => onAskDelete(label)} title="Delete" className="rounded-lg p-1.5">
                            <Trash2 size={14} style={{ color: '#dc2626' }} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        !adding && (
          <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>
            <Tag size={20} className="mx-auto mb-2 opacity-40" />
            No labels in this category yet.
          </div>
        )
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ExternalLink, Star } from 'lucide-react';
import { db } from '@/lib/storage/db';
import { PostEditor } from './PostEditor';

export function PostList() {
  const [posts, setPosts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const list = await db.posts.list();
    setPosts(list);
    setLoaded(true);
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (payload) => {
    await db.posts.create(payload);
    setCreating(false);
    await load();
  };

  const onUpdate = async (payload) => {
    await db.posts.update(editing.id, payload);
    setEditing(null);
    await load();
  };

  const onDelete = async (p) => {
    if (!confirm(`Delete post "${p.title}"?`)) return;
    await db.posts.remove(p.id);
    await load();
  };

  if (!loaded) {
    return <p className="text-sm text-[var(--color-fg-soft)]">Loading posts…</p>;
  }

  if (creating) {
    return <PostEditor onSave={onCreate} onCancel={() => setCreating(false)} />;
  }

  if (editing) {
    return <PostEditor initial={editing} onSave={onUpdate} onCancel={() => setEditing(null)} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Posts <span className="text-[var(--color-fg-soft)]">({posts.length})</span></h2>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[var(--color-primary)]/30 hover:bg-[var(--color-primary-deep)]"
        >
          <Plus className="h-4 w-4" /> New post
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-[var(--color-fg-soft)]">
          No posts yet. Click "New post" to create one.
        </div>
      ) : (
        <ul className="grid gap-3">
          {posts.map((p) => (
            <li key={p.id} className="glass flex items-center gap-4 rounded-2xl p-4">
              <div
                className="h-16 w-24 shrink-0 overflow-hidden rounded-xl"
                style={{ background: `linear-gradient(135deg, ${p.coverPalette?.from || '#0c4a1a'}, ${p.coverPalette?.to || '#d4af37'})` }}
              >
                {p.cover && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.cover} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  {p.featured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-gold)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-gold)]">
                      <Star className="h-2.5 w-2.5" /> Featured
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-[var(--color-fg-soft)]">
                  {p.category} → {p.label} · /{p.slug}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Link
                  href={`/posts/${p.slug}`}
                  target="_blank"
                  aria-label="View"
                  className="glass flex h-9 w-9 items-center justify-center rounded-full hover:text-[var(--color-primary)]"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setEditing(p)}
                  aria-label="Edit"
                  className="glass flex h-9 w-9 items-center justify-center rounded-full hover:text-[var(--color-primary)]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(p)}
                  aria-label="Delete"
                  className="glass flex h-9 w-9 items-center justify-center rounded-full hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

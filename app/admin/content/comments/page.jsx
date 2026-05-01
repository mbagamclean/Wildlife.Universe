'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/storage/db';
import { Trash2, User } from 'lucide-react';

export default function AdminCommentsPage() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    db.posts.list().then((posts) => {
      const all = [];
      posts.forEach((p) => {
        try {
          const c = JSON.parse(localStorage.getItem(`wu_comments_${p.slug}`) || '[]');
          c.forEach((comment) => all.push({ ...comment, postTitle: p.title, postSlug: p.slug }));
        } catch { /* ignore */ }
      });
      all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setItems(all);
      setLoaded(true);
    });
  }, []);

  const remove = (postSlug, id) => {
    try {
      const existing = JSON.parse(localStorage.getItem(`wu_comments_${postSlug}`) || '[]');
      const next = existing.filter((c) => c.id !== id);
      localStorage.setItem(`wu_comments_${postSlug}`, JSON.stringify(next));
      setItems((prev) => prev.filter((c) => !(c.id === id && c.postSlug === postSlug)));
    } catch { /* ignore */ }
  };

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
          <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
          CONTENT
        </p>
        <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>
          Comments <span className="text-lg font-semibold" style={{ color: 'var(--adm-text-subtle)' }}>({items.length})</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Review and moderate all reader comments.</p>
      </div>
      {!loaded ? (
        <p className="text-sm" style={{ color: 'var(--adm-text-subtle)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <div
          className="flex min-h-[200px] items-center justify-center rounded-2xl text-sm"
          style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)', color: 'var(--adm-text-subtle)' }}
        >
          No comments yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((c) => (
            <div
              key={`${c.postSlug}-${c.id}`}
              className="rounded-2xl p-4"
              style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'var(--adm-surface-3)' }}>
                  <User className="h-3.5 w-3.5" style={{ color: 'var(--adm-text-muted)' }} />
                </div>
                <span className="text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{c.author}</span>
                <span className="ml-auto text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={() => remove(c.postSlug, c.id)}
                  className="text-[#ccc] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--adm-text-muted)' }}>{c.body}</p>
              <p className="mt-2 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>On: {c.postTitle}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/storage/db';
import { PostEditor } from '@/components/admin/PostEditor';
import { Eye, Clock, Plus, Trash2 } from 'lucide-react';

function ContentTable({ posts, loaded, onDelete }) {
  if (!loaded) return <p className="py-8 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>Loading…</p>;
  if (posts.length === 0) return (
    <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
      <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>No posts in this category yet.</p>
    </div>
  );
  return (
    <div className="rounded-2xl" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
      {posts.map((p, i) => (
        <div
          key={p.id}
          className="flex items-center gap-3 px-5 py-3.5"
          style={i < posts.length - 1 ? { borderBottom: '1px solid var(--adm-border)' } : {}}
        >
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#008000]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{p.title}</p>
            <div className="mt-0.5 flex gap-2 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(p.createdAt).toLocaleDateString()}</span>
              {p.views > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{p.views}</span>}
            </div>
          </div>
          <button onClick={() => onDelete(p.id)} className="text-[#ccc] hover:text-red-400 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function AdminPlantsPage() {
  const [posts, setPosts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = () => db.posts.listByCategory('plants').then((p) => { setPosts(p); setLoaded(true); });
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Delete this post?')) return;
    await db.posts.remove(id);
    load();
  };

  if (creating) return (
    <div className="p-5 sm:p-8">
      <button onClick={() => setCreating(false)} className="mb-4 text-sm font-semibold text-[#d4af37] hover:underline">← Back</button>
      <PostEditor onSave={() => { setCreating(false); load(); }} />
    </div>
  );

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
            <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
            CONTENT
          </p>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>Plants</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>Manage plants category posts.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-[#008000] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#006400] active:scale-95"
        >
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>
      <ContentTable posts={posts} loaded={loaded} onDelete={remove} />
    </div>
  );
}

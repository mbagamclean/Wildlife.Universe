'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, FileText, X, Check } from 'lucide-react';
import { db } from '@/lib/storage/db';

/**
 * Post picker — searchable list of posts.
 *
 * Props:
 * - value: post object | null
 * - onChange(post)
 * - publishedOnly: boolean (default true)
 * - placeholder: string
 */
export function PostPicker({ value, onChange, publishedOnly = true, placeholder = 'Pick a post…' }) {
  const [posts, setPosts]   = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);

  useEffect(() => {
    db.posts.list().then((all) => {
      const filtered = publishedOnly ? all.filter((p) => p.status !== 'draft') : all;
      setPosts(filtered);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [publishedOnly]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts.slice(0, 30);
    return posts.filter((p) =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.slug || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [posts, query]);

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
      {value ? (
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: '#00800018' }}>
            <FileText className="h-4 w-4" style={{ color: '#008000' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Selected post</p>
            <p className="truncate text-sm font-bold" style={{ color: 'var(--adm-text)' }}>{value.title}</p>
            <p className="text-[11px]" style={{ color: 'var(--adm-text-muted)' }}>
              {value.category || 'Uncategorised'} · {(value.body || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
          <button
            onClick={() => { onChange(null); setOpen(true); }}
            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }}
          >
            <X className="h-3.5 w-3.5" /> Change
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--adm-text-subtle)' }} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="w-full rounded-xl py-2.5 pl-10 pr-3 text-sm focus:outline-none"
              style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
              onFocusCapture={(e) => { e.currentTarget.style.borderColor = '#d4af37'; }}
              onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
            />
          </div>

          {open && (
            <div className="mt-3 max-h-80 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--adm-border)' }}>
              {!loaded ? (
                <p className="p-4 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>Loading posts…</p>
              ) : matches.length === 0 ? (
                <p className="p-4 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>No posts match.</p>
              ) : (
                matches.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => { onChange(p); setOpen(false); setQuery(''); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--adm-hover-bg)]"
                    style={i < matches.length - 1 ? { borderBottom: '1px solid var(--adm-border)' } : {}}
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--adm-surface-2)' }}>
                      <FileText className="h-3.5 w-3.5" style={{ color: '#d4af37' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{p.title}</p>
                      <p className="truncate text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
                        {p.category || 'Uncategorised'} · {p.status || 'published'}
                      </p>
                    </div>
                    <Check className="h-4 w-4 opacity-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

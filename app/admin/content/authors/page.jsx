'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Pencil, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthorsListPage() {
  const [authors, setAuthors] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/authors', { credentials: 'include' });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || `HTTP ${res.status}`);
          return;
        }
        setAuthors(json.authors || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--adm-text-muted)' }}>
          Editorial team
        </p>
        <h1 style={{ margin: '0.3rem 0 0.5rem', fontSize: '1.75rem', fontWeight: 800, color: 'var(--adm-text)' }}>
          Author Profiles
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--adm-text-muted)', lineHeight: 1.6, maxWidth: 720 }}>
          The 13 named personas that drive bylines, JSON-LD author entities, and{' '}
          <Link href="/author" style={{ color: 'var(--adm-link)' }}>the public contributors index</Link>.
          Edits made here override the static defaults shipped in code — name, slug, and category-expertise
          stay constant (they affect post-author assignment), but every other field can be customised including
          headshot photos uploaded directly from this page.
        </p>
      </header>

      {error && (
        <div style={errBoxStyle}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {authors === null && !error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--adm-text-muted)' }}>
          <Loader2 size={16} className="wu-spin" /> Loading authors…
        </div>
      )}

      {authors && authors.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {authors.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/admin/content/authors/${a.slug}`}
                style={cardStyle}
                className="wu-author-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={avatarStyle}>
                    {a.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.photoUrl} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    ) : (
                      <User size={20} style={{ color: '#008000' }} />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--adm-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--adm-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.title || 'Contributor'}
                    </div>
                  </div>
                  {a.isOverridden ? (
                    <span title="This author has been customised" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#008000', fontWeight: 700 }}>
                      <CheckCircle2 size={12} /> Edited
                    </span>
                  ) : (
                    <span title="Defaults from code" style={{ fontSize: 10, color: 'var(--adm-text-muted)' }}>
                      Default
                    </span>
                  )}
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--adm-text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {a.bio || '—'}
                </p>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                    {(a.expertise || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 2).join(' · ')}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--adm-link)', fontWeight: 600 }}>
                    <Pencil size={11} /> Edit
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .wu-author-card { transition: border-color 0.18s, transform 0.18s; }
        .wu-author-card:hover { border-color: rgba(0,128,0,0.4) !important; transform: translateY(-1px); }
        .wu-spin { animation: wu-spin 1s linear infinite; }
        @keyframes wu-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const cardStyle = {
  display: 'block',
  padding: '14px 16px',
  borderRadius: 12,
  background: 'var(--adm-surface)',
  border: '1px solid var(--adm-border)',
  textDecoration: 'none',
  color: 'inherit',
  height: '100%',
};

const avatarStyle = {
  width: 48,
  height: 48,
  borderRadius: 12,
  background: 'rgba(0,128,0,0.12)',
  border: '1px solid rgba(0,128,0,0.3)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  flexShrink: 0,
};

const errBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 8,
  background: 'rgba(220,38,38,0.08)',
  border: '1px solid rgba(220,38,38,0.3)',
  color: '#dc2626',
  fontSize: 13,
  marginBottom: '1rem',
};

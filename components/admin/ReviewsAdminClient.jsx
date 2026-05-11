'use client';

/**
 * Admin reviews moderation — Wildlife.Universe port of the Mayobe Bros
 * ReviewsPage. Stats cards, status filter tabs, bulk action bar, and
 * per-row Approve / Reject / Spam / Delete buttons. Themed with
 * var(--adm-*) tokens.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Star, CheckCircle2, Clock, XCircle, AlertTriangle, Trash2,
  User, Calendar, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';

const FILTERS = [
  { key: 'all',      label: 'All',      icon: Star },
  { key: 'pending',  label: 'Pending',  icon: Clock },
  { key: 'approved', label: 'Approved', icon: CheckCircle2 },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
  { key: 'spam',     label: 'Spam',     icon: AlertTriangle },
];

const STATUS_BADGE = {
  approved: { bg: 'rgba(34,197,94,0.12)',  text: '#16a34a' },
  pending:  { bg: 'rgba(245,158,11,0.12)', text: '#d97706' },
  rejected: { bg: 'rgba(239,68,68,0.12)',  text: '#dc2626' },
  spam:     { bg: 'rgba(120,120,120,0.18)', text: 'var(--adm-text-muted)' },
};

const PAGE_SIZE = 10;

export function ReviewsAdminClient() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reviews', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setReviews(json.reviews || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function patchOne(id, body) {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Update failed');
  }

  async function deleteOne(id) {
    const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
  }

  async function updateStatus(id, status) {
    try {
      await patchOne(id, { status });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) { alert(err.message); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await deleteOne(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } catch (err) { alert(err.message); }
  }

  async function handleBulk(action) {
    if (selected.size === 0) return;
    const verb = action === 'delete' ? 'Delete' : 'Update';
    if (!window.confirm(`${verb} ${selected.size} review${selected.size === 1 ? '' : 's'}?`)) return;
    const ids = [...selected];
    try {
      if (action === 'delete') {
        await Promise.all(ids.map(deleteOne));
        setReviews((prev) => prev.filter((r) => !ids.includes(r.id)));
      } else {
        const status = action;
        await Promise.all(ids.map((id) => patchOne(id, { status })));
        setReviews((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, status } : r)));
      }
      setSelected(new Set());
    } catch (err) { alert(err.message); }
  }

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, spam: 0 };
    for (const r of reviews) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [reviews]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return reviews;
    return reviews.filter((r) => r.status === activeFilter);
  }, [reviews, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [activeFilter]);

  function toggleOne(id) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function renderStars(rating) {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--adm-text-subtle)] opacity-60'}
      />
    ));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" style={{
          padding: '12px 14px', borderRadius: 10,
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.40)',
          color: '#b91c1c', fontSize: 13,
        }}>{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Pending',  count: counts.pending,  color: STATUS_BADGE.pending.text },
          { label: 'Approved', count: counts.approved, color: STATUS_BADGE.approved.text },
          { label: 'Rejected', count: counts.rejected, color: STATUS_BADGE.rejected.text },
          { label: 'Spam',     count: counts.spam,     color: STATUS_BADGE.spam.text },
        ].map((s) => (
          <div key={s.label} style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.count}</div>
            <div style={{ fontSize: 12, color: 'var(--adm-text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const isActive = activeFilter === f.key;
          const count = f.key === 'all' ? reviews.length : (counts[f.key] || 0);
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 999,
                background: isActive ? 'var(--color-primary)' : 'var(--adm-surface)',
                color: isActive ? '#fff' : 'var(--adm-text)',
                border: '1px solid ' + (isActive ? 'var(--color-primary)' : 'var(--adm-border)'),
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Icon size={14} /> {f.label}
              <span style={{
                fontSize: 11, padding: '1px 7px', borderRadius: 999,
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--adm-border)',
                color: isActive ? '#fff' : 'var(--adm-text-muted)',
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(var(--color-primary-rgb, 124 58 237), 0.06)',
          border: '1px solid var(--color-primary)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-text)' }}>
            {selected.size} review{selected.size === 1 ? '' : 's'} selected
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => handleBulk('approved')} style={bulkBtn('#16a34a')}>Approve</button>
            <button onClick={() => handleBulk('rejected')} style={bulkBtn('#dc2626')}>Reject</button>
            <button onClick={() => handleBulk('spam')} style={bulkBtn('#d97706')}>Mark Spam</button>
            <button onClick={() => handleBulk('delete')} style={bulkBtn('#6b7280')}>Delete</button>
          </div>
        </div>
      )}

      {/* Review rows */}
      <div className="flex flex-col gap-3">
        {pageRows.map((r) => {
          const badge = STATUS_BADGE[r.status] || STATUS_BADGE.pending;
          return (
            <div key={r.id} style={{
              padding: 16, borderRadius: 12,
              background: 'var(--adm-surface)',
              border: '1px solid var(--adm-border)',
              borderLeft: '4px solid ' + badge.text,
            }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggleOne(r.id)}
                  style={{ marginTop: 4, accentColor: 'var(--color-primary)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <User size={14} className="text-[var(--adm-text-muted)]" />
                      <span style={{ fontWeight: 700, color: 'var(--adm-text)' }}>{r.user_name}</span>
                    </div>
                    <div style={{ display: 'inline-flex', gap: 1 }}>{renderStars(r.rating)}</div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
                      background: badge.bg, color: badge.text,
                    }}>{r.status}</span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--adm-text-muted)' }}>
                      <Calendar size={11} />
                      {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--adm-text)', lineHeight: 1.55 }}>{r.comment}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--adm-border)' }}>
                {r.status !== 'approved' && (
                  <button onClick={() => updateStatus(r.id, 'approved')} style={rowBtn('#16a34a')}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button onClick={() => updateStatus(r.id, 'rejected')} style={rowBtn('#dc2626')}>
                    <XCircle size={14} /> Reject
                  </button>
                )}
                {r.status !== 'spam' && (
                  <button onClick={() => updateStatus(r.id, 'spam')} style={rowBtn('#d97706')}>
                    <AlertTriangle size={14} /> Mark Spam
                  </button>
                )}
                <button onClick={() => handleDelete(r.id)} style={{ ...rowBtn('var(--adm-text-muted)'), marginLeft: 'auto' }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{
            padding: 40, textAlign: 'center', borderRadius: 12,
            background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
          }}>
            <Star size={42} className="mx-auto mb-3 text-[var(--adm-text-subtle)] opacity-40" />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--adm-text)' }}>No reviews found</p>
            <p style={{ fontSize: 12, color: 'var(--adm-text-muted)', marginTop: 4 }}>
              {activeFilter !== 'all' ? 'Try changing the filter' : 'Reviews will appear here after submission'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--adm-text-muted)' }}>
            Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={pageBtn(false)}
            ><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} style={pageBtn(p === page)}>{p}</button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={pageBtn(false)}
            ><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function bulkBtn(bg) {
  return {
    fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8,
    background: bg, color: '#fff', border: 'none', cursor: 'pointer',
  };
}

function rowBtn(color) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 8,
    background: 'transparent', color, border: '1px solid var(--adm-border)', cursor: 'pointer',
  };
}

function pageBtn(active) {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 32, height: 32, padding: '0 8px', borderRadius: 6,
    background: active ? 'var(--color-primary)' : 'var(--adm-surface)',
    color: active ? '#fff' : 'var(--adm-text)',
    border: '1px solid ' + (active ? 'var(--color-primary)' : 'var(--adm-border)'),
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
  };
}

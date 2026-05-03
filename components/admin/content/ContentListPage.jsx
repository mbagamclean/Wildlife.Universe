'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import {
  Search, Plus, Eye, Pencil, Trash2, Calendar,
  CheckCircle2, Circle, Star, Clock, SlidersHorizontal,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { db } from '@/lib/storage/db';
import { PostEditor } from '@/components/admin/PostEditor';

const PAGE_SIZE = 10;

const FILTER_TABS = [
  { key: 'all',       label: 'All',             Icon: SlidersHorizontal },
  { key: 'published', label: 'Published',        Icon: CheckCircle2      },
  { key: 'draft',     label: 'Drafts',           Icon: Circle            },
  { key: 'featured',  label: 'Featured',         Icon: Star              },
  { key: 'pending',   label: 'Pending Approval', Icon: Clock             },
];

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ post }) {
  const s = post.status || 'draft';
  let cfg;
  if (post.featured && s === 'published') {
    cfg = { label: 'Featured',  dot: '#d4af37', bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.28)', color: '#a07010' };
  } else if (s === 'published') {
    cfg = { label: 'Published', dot: '#008000', bg: 'rgba(0,128,0,0.10)',    border: 'rgba(0,128,0,0.22)',    color: '#008000' };
  } else if (s === 'pending') {
    cfg = { label: 'Pending',   dot: '#d97706', bg: 'rgba(217,119,6,0.10)', border: 'rgba(217,119,6,0.25)',  color: '#d97706' };
  } else {
    cfg = { label: 'Draft',     dot: '#9ca3af', bg: 'rgba(156,163,175,0.10)', border: 'rgba(156,163,175,0.28)', color: '#6b7280' };
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: 12, fontWeight: 500, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ── Pagination page numbers with ellipsis ─────────────────────────────────────
function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current, current - 1, current + 1].filter(n => n >= 1 && n <= total));
  return [...set].sort((a, b) => a - b).reduce((acc, n, i, arr) => {
    if (i > 0 && n - arr[i - 1] > 1) acc.push('…');
    acc.push(n);
    return acc;
  }, []);
}

// ── Action icon button ────────────────────────────────────────────────────────
function ActionBtn({ onClick, title, color, hoverBg, hoverColor, children, as: Tag = 'button', href, target }) {
  const props = {
    title,
    style: {
      width: 30, height: 30, borderRadius: 7, border: 'none',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color, background: 'transparent', cursor: 'pointer',
      textDecoration: 'none', transition: 'background 0.12s, color 0.12s',
      flexShrink: 0,
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = hoverBg;
      if (hoverColor) e.currentTarget.style.color = hoverColor;
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'transparent';
      if (hoverColor) e.currentTarget.style.color = color;
    },
    onClick,
  };
  if (Tag === 'a') {
    return <a href={href} target={target} rel="noopener noreferrer" {...props}>{children}</a>;
  }
  return <button {...props}>{children}</button>;
}

// ── Main component ────────────────────────────────────────────────────────────
export function ContentListPage({ title, subtitle, category, noun = 'Post' }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [posts,        setPosts]        = useState([]);
  const [loaded,       setLoaded]       = useState(false);
  const [search,       setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page,         setPage]         = useState(1);
  const [selected,     setSelected]     = useState(new Set());
  const [creating,     setCreating]     = useState(false);
  const [editing,      setEditing]      = useState(null);

  const load = useCallback(async () => {
    const data = category
      ? await db.posts.listByCategory(category)
      : await db.posts.list();
    setPosts(data);
    setLoaded(true);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  // ── Filter + search (client-side) ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = posts;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(p =>
        (p.title    || '').toLowerCase().includes(q) ||
        (p.label    || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }
    if (activeFilter === 'featured') {
      r = r.filter(p => p.featured);
    } else if (activeFilter !== 'all') {
      r = r.filter(p => (p.status || 'draft') === activeFilter);
    }
    return r;
  }, [posts, search, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 on filter / search change
  useEffect(() => { setPage(1); }, [search, activeFilter]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const allSelected = pageItems.length > 0 && pageItems.every(p => selected.has(p.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pageItems.map(p => p.id)));
  const toggleOne = (id) => setSelected(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.title}"?\nThis cannot be undone.`)) return;
    await db.posts.remove(p.id);
    await load();
  };

  // ── Formatters ────────────────────────────────────────────────────────────
  const fmtDate = (s) => {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCatDisplay = (p) =>
    category
      ? (p.label || p.category || '—')
      : p.category
        ? p.category.charAt(0).toUpperCase() + p.category.slice(1)
        : '—';

  const getViewHref = (p) => {
    const seg = p.category === 'posts' || !p.category ? 'posts' : p.category;
    return `/${seg}/${p.slug}`;
  };

  // ── Thumbnail flag (category pages only, not the all-Posts page) ─────────
  const showThumb = !!category;
  const colCount  = showThumb ? 8 : 7;

  // ── Shared style tokens ───────────────────────────────────────────────────
  const border  = '1px solid var(--adm-border)';
  const surface = {
    background: 'var(--adm-surface)',
    border,
    borderRadius: 14,
    boxShadow: isDark ? 'none' : '0 1px 6px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  };

  // ── Editor view ───────────────────────────────────────────────────────────
  if (creating || editing) {
    const isEdit = !!editing;
    return (
      <PostEditor
        initial={isEdit ? editing : (category ? { category } : undefined)}
        onSave={async (payload) => {
          if (isEdit) await db.posts.update(editing.id, payload);
          else        await db.posts.create(payload);
          setCreating(false);
          setEditing(null);
          await load();
        }}
        onCancel={() => { setCreating(false); setEditing(null); }}
      />
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="p-5 sm:p-8">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 16, marginBottom: 28,
      }}>
        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em',
            lineHeight: 1.15, marginBottom: 4,
            color: 'var(--adm-text)',
          }}>
            {title}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--adm-text-muted)', margin: 0 }}>
            {subtitle}
          </p>
        </div>

        <button
          onClick={() => setCreating(true)}
          style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 600,
            boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
            transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#1d4ed8';
            e.currentTarget.style.boxShadow  = '0 4px 14px rgba(37,99,235,0.45)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#2563eb';
            e.currentTarget.style.boxShadow  = '0 2px 8px rgba(37,99,235,0.35)';
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
          onMouseUp={e =>   { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <Plus size={16} strokeWidth={2.5} />
          New {noun}
        </button>
      </div>

      {/* ── Search + Filter bar ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '10px 14px', borderRadius: 12,
        background: 'var(--adm-surface)',
        border,
        marginBottom: 18,
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <Search size={14} style={{
            position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--adm-text-subtle)', pointerEvents: 'none',
          }} />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            style={{
              width: '100%', boxSizing: 'border-box',
              paddingLeft: 34, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              borderRadius: 8, fontSize: 13,
              color: 'var(--adm-text)', outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#2563eb';
              e.target.style.boxShadow   = '0 0 0 3px rgba(37,99,235,0.12)';
            }}
            onBlur={e => {
              e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
              e.target.style.boxShadow   = 'none';
            }}
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTER_TABS.map(({ key, label, Icon }) => {
            const active = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? '#2563eb' : 'transparent',
                  color: active ? '#fff' : 'var(--adm-text-muted)',
                  fontSize: 13, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--adm-hover-bg)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={13} strokeWidth={2} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Data table ───────────────────────────────────────────────────── */}
      <div style={surface}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: showThumb ? 740 : 680 }}>

            {/* Head */}
            <thead>
              <tr style={{ borderBottom: border }}>
                {/* Select all checkbox */}
                <th style={{ width: 46, padding: '13px 16px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={pageItems.length === 0}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                </th>

                {/* Thumbnail column header — category pages only */}
                {showThumb && <th style={{ width: 68, padding: '13px 8px 13px 0' }} />}

                {[
                  { label: 'TITLE',                      style: { textAlign: 'left', paddingLeft: 8 } },
                  { label: category ? 'LABEL' : 'CATEGORY', style: { textAlign: 'left', minWidth: 90 } },
                  { label: 'STATUS',                     style: { textAlign: 'left', minWidth: 110 } },
                  { label: 'VIEWS',                      style: { textAlign: 'left', minWidth: 70  } },
                  { label: 'DATE',                       style: { textAlign: 'left', minWidth: 110 } },
                  { label: 'ACTIONS',                    style: { textAlign: 'right', paddingRight: 18, minWidth: 106 } },
                ].map(col => (
                  <th key={col.label} style={{
                    padding: '13px 12px', fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.07em', color: 'var(--adm-text-subtle)',
                    ...col.style,
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {!loaded ? (
                <tr>
                  <td colSpan={colCount} style={{ padding: '52px 24px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: 14 }}>
                    Loading…
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={colCount} style={{ padding: '52px 24px', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: 14 }}>
                    {search || activeFilter !== 'all'
                      ? 'No matching results.'
                      : `No ${title.toLowerCase()} yet — click "+ New ${noun}" to create the first one.`}
                  </td>
                </tr>
              ) : pageItems.map((p, idx) => {
                const isSel = selected.has(p.id);
                const isLast = idx === pageItems.length - 1;
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: isLast ? 'none' : border,
                      background: isSel
                        ? (isDark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.04)')
                        : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!isSel) e.currentTarget.style.background = isDark
                        ? 'rgba(255,255,255,0.025)'
                        : 'rgba(0,0,0,0.012)';
                    }}
                    onMouseLeave={e => {
                      if (!isSel) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '13px 16px', textAlign: 'center', width: 46 }}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleOne(p.id)}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#2563eb' }}
                      />
                    </td>

                    {/* Thumbnail — category pages only */}
                    {showThumb && (
                      <td style={{ padding: '10px 8px 10px 0', width: 68 }}>
                        <div style={{
                          width: 56, height: 42, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                          background: p.coverPalette
                            ? `linear-gradient(135deg, ${p.coverPalette.from || '#0c4a1a'}, ${p.coverPalette.to || '#d4af37'})`
                            : 'var(--adm-surface-3)',
                        }}>
                          {p.cover && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.cover}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          )}
                        </div>
                      </td>
                    )}

                    {/* Title */}
                    <td style={{ padding: '13px 8px' }}>
                      <span style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontSize: 14, fontWeight: 500,
                        color: 'var(--adm-text)', lineHeight: 1.45,
                      }}>
                        {p.title}
                      </span>
                    </td>

                    {/* Category / Label */}
                    <td style={{ padding: '13px 12px' }}>
                      <span style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontSize: 13, color: 'var(--adm-text-muted)', lineHeight: 1.45,
                      }}>
                        {getCatDisplay(p)}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '13px 12px' }}>
                      <StatusPill post={p} />
                    </td>

                    {/* Views */}
                    <td style={{ padding: '13px 12px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 13, color: 'var(--adm-text-muted)',
                      }}>
                        <Eye size={13} strokeWidth={1.8} />
                        {p.views ?? 0}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '13px 12px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 13, color: 'var(--adm-text-muted)',
                      }}>
                        <Calendar size={13} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                        {fmtDate(p.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '13px 18px 13px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <ActionBtn
                          as="a"
                          href={getViewHref(p)}
                          target="_blank"
                          title="View on site"
                          color="#0d9488"
                          hoverBg={isDark ? 'rgba(13,148,136,0.12)' : 'rgba(13,148,136,0.1)'}
                        >
                          <Eye size={14} strokeWidth={1.8} />
                        </ActionBtn>

                        <ActionBtn
                          title="Edit"
                          onClick={() => setEditing(p)}
                          color="#0d9488"
                          hoverBg={isDark ? 'rgba(13,148,136,0.12)' : 'rgba(13,148,136,0.1)'}
                        >
                          <Pencil size={13} strokeWidth={1.8} />
                        </ActionBtn>

                        <ActionBtn
                          title="Delete"
                          onClick={() => handleDelete(p)}
                          color="var(--adm-text-subtle)"
                          hoverBg="rgba(239,68,68,0.1)"
                          hoverColor="#ef4444"
                        >
                          <Trash2 size={13} strokeWidth={1.8} />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination footer ─────────────────────────────────────────────── */}
        {loaded && filtered.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
            padding: '12px 20px',
            borderTop: border,
          }}>
            <span style={{ fontSize: 13, color: 'var(--adm-text-muted)' }}>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} {title.toLowerCase()}
            </span>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* Prev */}
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  style={{
                    width: 30, height: 30, borderRadius: 7,
                    border, background: 'transparent',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                    color: 'var(--adm-text-muted)',
                    opacity: safePage === 1 ? 0.35 : 1,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (safePage !== 1) e.currentTarget.style.background = 'var(--adm-hover-bg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <ChevronLeft size={13} />
                </button>

                {/* Page numbers */}
                {buildPageList(safePage, totalPages).map((item, i) =>
                  item === '…' ? (
                    <span key={`e${i}`} style={{ width: 30, textAlign: 'center', color: 'var(--adm-text-subtle)', fontSize: 13 }}>…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      style={{
                        width: 30, height: 30, borderRadius: 7,
                        border: item === safePage ? 'none' : border,
                        background: item === safePage ? '#2563eb' : 'transparent',
                        color: item === safePage ? '#fff' : 'var(--adm-text-muted)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: item === safePage ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'background 0.12s, color 0.12s',
                      }}
                      onMouseEnter={e => { if (item !== safePage) e.currentTarget.style.background = 'var(--adm-hover-bg)'; }}
                      onMouseLeave={e => { if (item !== safePage) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {item}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  style={{
                    width: 30, height: 30, borderRadius: 7,
                    border, background: 'transparent',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                    color: 'var(--adm-text-muted)',
                    opacity: safePage === totalPages ? 0.35 : 1,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (safePage !== totalPages) e.currentTarget.style.background = 'var(--adm-hover-bg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

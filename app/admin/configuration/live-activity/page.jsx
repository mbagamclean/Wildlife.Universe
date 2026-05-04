'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Activity, FileText, MessageSquare, Image as ImageIcon, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';

const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'post',     label: 'Posts' },
  { id: 'comment',  label: 'Comments' },
  { id: 'media',    label: 'Media' },
];

const ICONS = { post: FileText, comment: MessageSquare, media: ImageIcon };
const COLORS = { post: '#1a6eb5', comment: '#7c3aed', media: '#d4af37' };

function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function LiveActivityPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const pollRef = useRef(null);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/activity/recent');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load activity');
      setData(json.data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    pollRef.current = setInterval(fetchActivity, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchActivity]);

  const events = data?.events || [];
  const visible = filter === 'all' ? events : events.filter((e) => e.type === filter);

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <AIPageHeader
          eyebrow="LIVE ACTIVITY"
          title="Recent Activity"
          description="Posts, comments, and media uploads in the last few days. Auto-refreshes every 30s."
          icon={Activity}
          accent="#16a34a"
        />
        <button
          onClick={() => { setLoading(true); fetchActivity(); }}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count = f.id === 'all' ? events.length : events.filter((e) => e.type === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: active ? '#16a34a' : 'transparent',
                color: active ? '#fff' : 'var(--adm-text-muted)',
                border: `1px solid ${active ? '#16a34a' : 'var(--adm-border)'}`,
              }}
            >
              {f.label} <span className="ml-1 opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--adm-text-muted)' }} />
        </div>
      )}

      {data && visible.length === 0 && (
        <div className="rounded-2xl py-20 text-center" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
          <p className="text-sm" style={{ color: 'var(--adm-text-subtle)' }}>No recent activity in this filter.</p>
        </div>
      )}

      {data && visible.length > 0 && (
        <ol className="rounded-2xl" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}>
          {visible.map((ev, i) => {
            const Icon = ICONS[ev.type] || Activity;
            const color = COLORS[ev.type] || '#16a34a';
            const inner = (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{ev.title}</p>
                  <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--adm-text-muted)' }}>{ev.secondary}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--adm-text-subtle)' }}>{relativeTime(ev.timestamp)}</p>
                  {ev.flagged && (
                    <span className="mt-1 inline-block rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600">FLAGGED</span>
                  )}
                </div>
              </div>
            );
            return (
              <li key={ev.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--adm-border)' }}>
                {ev.href ? (
                  <Link href={ev.href} target="_blank" className="block transition-colors hover:bg-[var(--adm-hover-bg)]">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

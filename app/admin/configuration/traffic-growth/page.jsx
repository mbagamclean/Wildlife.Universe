'use client';
import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, FileText, Eye, Calendar, Loader2, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';
import { StatCard } from '@/components/admin/configuration/StatCard';
import { MiniChart } from '@/components/admin/configuration/MiniChart';

const RANGES = [
  { id: 7,  label: '7 days' },
  { id: 30, label: '30 days' },
  { id: 90, label: '90 days' },
];

export default function TrafficGrowthPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSeries = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/timeseries?days=${days}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load series');
      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  const series = data?.series || [];
  const postCounts = series.map((s) => s.postsCreated);
  const viewCounts = series.map((s) => s.viewsAttributed);
  const labels = series.map((s) => s.date);

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <AIPageHeader
          eyebrow="ANALYTICS"
          title="Traffic Growth"
          description="Daily content + view trends from your posts table. Time-window adjustable."
          icon={TrendingUp}
          accent="#7c3aed"
        />
        <button
          onClick={fetchSeries}
          disabled={loading}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {RANGES.map((r) => {
          const active = days === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setDays(r.id)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: active ? '#7c3aed' : 'transparent',
                color: active ? '#fff' : 'var(--adm-text-muted)',
                border: `1px solid ${active ? '#7c3aed' : 'var(--adm-border)'}`,
              }}
            >
              {r.label}
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

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Avg posts/day" value={data.stats.avgPostsPerDay} icon={FileText} accent="#7c3aed" />
            <StatCard label="Total posts" value={data.stats.totalPostsInWindow.toLocaleString()} sublabel={`Last ${days} days`} icon={Calendar} accent="#1a6eb5" />
            <StatCard
              label="Total views"
              value={data.stats.totalViewsInWindow.toLocaleString()}
              icon={Eye}
              accent="#16a34a"
              delta={data.stats.trendPct}
              sublabel="Attributed to creation date"
            />
            <StatCard
              label="Best day"
              value={data.stats.bestDay?.viewsAttributed?.toLocaleString() || '—'}
              sublabel={data.stats.bestDay?.date || '—'}
              icon={TrendingUp}
              accent="#d4af37"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Posts created per day">
              <MiniChart data={postCounts} labels={labels} color="#7c3aed" height={140} showAxis />
            </Card>
            <Card title={data.source === 'post_views_events' ? 'Real page views per day' : 'Views attributed to creation date'}>
              <MiniChart data={viewCounts} labels={labels} color="#16a34a" height={140} showAxis />
            </Card>
          </div>

          {data.note && (
            <div
              className="mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-[12px]"
              style={{
                background: data.source === 'post_views_events' ? 'rgba(22,163,74,0.08)' : 'rgba(26,110,181,0.08)',
                border: `1px solid ${data.source === 'post_views_events' ? 'rgba(22,163,74,0.2)' : 'rgba(26,110,181,0.2)'}`,
                color: data.source === 'post_views_events' ? '#16a34a' : '#1a6eb5',
              }}
            >
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                <strong>About this chart:</strong> {data.note}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>{title}</h3>
      {children}
    </div>
  );
}

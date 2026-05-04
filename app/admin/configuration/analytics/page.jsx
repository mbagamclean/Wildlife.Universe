'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BarChart2, FileText, Eye, Layers, CalendarDays, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';
import { StatCard } from '@/components/admin/configuration/StatCard';
import { MiniBarChart } from '@/components/admin/configuration/MiniChart';

export default function AnalyticsOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/analytics/overview');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load analytics');
      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <AIPageHeader
          eyebrow="ANALYTICS"
          title="Overview"
          description="Site-wide content and traffic snapshot from your Supabase posts data."
          icon={BarChart2}
          accent="#1a6eb5"
        />
        <button
          onClick={fetchOverview}
          disabled={loading}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Posts"
              value={data.totals.totalPosts.toLocaleString()}
              sublabel={`${data.totals.published} published · ${data.totals.drafts} drafts`}
              icon={FileText}
              accent="#1a6eb5"
            />
            <StatCard
              label="Total Views"
              value={data.totals.totalViews.toLocaleString()}
              sublabel="All time, all posts"
              icon={Eye}
              accent="#7c3aed"
            />
            <StatCard
              label="Active Categories"
              value={data.totals.categoriesActive}
              sublabel={data.byCategory[0] ? `Top: ${data.byCategory[0].category}` : '—'}
              icon={Layers}
              accent="#16a34a"
            />
            <StatCard
              label="Posts This Week"
              value={data.totals.postsThisWeek}
              sublabel="Last 7 days"
              icon={CalendarDays}
              accent="#d4af37"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Top 10 Posts by Views">
              {data.topPosts.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--adm-text-subtle)' }}>No posts yet.</p>
              ) : (
                <ol className="flex flex-col gap-2.5">
                  {data.topPosts.map((p, i) => (
                    <li key={p.id} className="flex items-start justify-between gap-3 border-b pb-2.5 last:border-b-0 last:pb-0" style={{ borderColor: 'var(--adm-border)' }}>
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold" style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)' }}>{i + 1}</span>
                        <div className="min-w-0">
                          <Link href={p.slug ? `/posts/${p.slug}` : '#'} target="_blank" className="block truncate text-sm font-semibold hover:underline" style={{ color: 'var(--adm-text)' }}>
                            {p.title || '(untitled)'}
                          </Link>
                          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
                            {p.category || '—'} · {p.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--adm-text)' }}>{p.views.toLocaleString()}</p>
                        <p className="text-[10px]" style={{ color: 'var(--adm-text-subtle)' }}>views</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card title="By Category">
              <MiniBarChart
                color="#1a6eb5"
                items={data.byCategory.map((c) => ({ label: c.category, value: c.count }))}
                formatValue={(n) => `${n} posts`}
              />
              <p className="mt-3 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
                Total views by category:{' '}
                {data.byCategory.map((c, i) => (
                  <span key={c.category}>
                    <strong style={{ color: 'var(--adm-text-muted)' }}>{c.category}</strong>: {c.views.toLocaleString()}
                    {i < data.byCategory.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </p>
            </Card>
          </div>
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

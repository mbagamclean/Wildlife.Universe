'use client';

/**
 * Plausible-style analytics dashboard. Single page that fetches
 * /api/admin/analytics/dashboard once per range change and re-polls
 * the live counter every 10 s. Uses only --adm-* / --color-* theme
 * variables — no Plausible visual chrome.
 *
 * Sections:
 *   - Date-range picker + live visitor pill
 *   - KPI row (Pageviews, Unique Visitors, Views/Visit, Live)
 *   - Time-series chart (inline SVG, theme-aware)
 *   - 4-panel grid: Top Pages, Top Sources, Top Locations, Devices
 *     (Devices panel has Browser / OS / Device-type tabs)
 */

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Globe, Smartphone, MousePointerClick, Users, Eye,
  Activity, FileText, ChevronDown,
} from 'lucide-react';

const RANGES = [
  { id: '24h', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];

function fmtNumber(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1000).toFixed(0) + 'k';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function KPI({ icon: Icon, label, value, sub }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      padding: '14px 16px', borderRadius: 12,
      background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 700, color: 'var(--adm-text-subtle)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        <Icon size={12} strokeWidth={2.2} aria-hidden /> {label}
      </div>
      <div style={{
        marginTop: 6, fontSize: 26, fontWeight: 800, color: 'var(--adm-text)',
        lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--adm-text-muted)' }}>{sub}</div>
      )}
    </div>
  );
}

function TimeseriesChart({ data, hours }) {
  // Inline SVG line chart. Sized via viewBox so it scales with the
  // container. Renders one polyline for pageviews and another for
  // unique visitors. Uses theme tokens for stroke colours.
  const W = 720, H = 220, P = { top: 12, right: 12, bottom: 26, left: 38 };
  const inner = { w: W - P.left - P.right, h: H - P.top - P.bottom };

  const max = useMemo(() => {
    let m = 0;
    for (const d of data) m = Math.max(m, d.pageviews, d.visitors);
    return Math.max(m, 4); // floor so the y-axis never collapses
  }, [data]);

  const points = (key) => data.map((d, i) => {
    const x = P.left + (data.length <= 1 ? 0 : (i / (data.length - 1)) * inner.w);
    const y = P.top + inner.h - (d[key] / max) * inner.h;
    return `${x},${y}`;
  }).join(' ');

  const ticks = 4;
  const yLabels = Array.from({ length: ticks + 1 }, (_, i) => Math.round((max * (ticks - i)) / ticks));

  // x-axis labels — show ~6 evenly spaced ticks
  const xTicks = data.length > 0
    ? Array.from({ length: Math.min(6, data.length) }, (_, i) => {
        const idx = Math.round((i / (Math.min(6, data.length) - 1 || 1)) * (data.length - 1));
        return { idx, d: data[idx] };
      })
    : [];

  const fmtBucket = (b) => {
    if (!b) return '';
    if (hours <= 24) {
      const d = new Date(b);
      return d.toLocaleTimeString([], { hour: 'numeric' });
    }
    const d = new Date(b);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--adm-text)' }}>Traffic over time</div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--adm-text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 10, height: 2, background: 'var(--color-primary)' }} />
            Pageviews
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 10, height: 2, background: '#7c3aed' }} />
            Unique visitors
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 220 }} role="img" aria-label="Traffic over time">
        {/* y-axis grid */}
        {yLabels.map((v, i) => {
          const y = P.top + (i / ticks) * inner.h;
          return (
            <g key={i}>
              <line x1={P.left} y1={y} x2={P.left + inner.w} y2={y} stroke="var(--adm-border)" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
              <text x={P.left - 6} y={y + 3} fontSize="10" textAnchor="end" fill="var(--adm-text-muted)">{v}</text>
            </g>
          );
        })}
        {/* x-axis labels */}
        {xTicks.map(({ idx, d }) => {
          const x = P.left + (data.length <= 1 ? 0 : (idx / (data.length - 1)) * inner.w);
          return (
            <text key={idx} x={x} y={H - 8} fontSize="10" textAnchor="middle" fill="var(--adm-text-muted)">
              {fmtBucket(d?.bucket)}
            </text>
          );
        })}
        {/* polylines */}
        {data.length > 1 && (
          <>
            <polyline fill="none" stroke="var(--color-primary)" strokeWidth="2" points={points('pageviews')} />
            <polyline fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="4 3" points={points('visitors')} />
          </>
        )}
        {/* dots */}
        {data.map((d, i) => {
          const x = P.left + (data.length <= 1 ? 0 : (i / (data.length - 1)) * inner.w);
          const y = P.top + inner.h - (d.pageviews / max) * inner.h;
          return <circle key={i} cx={x} cy={y} r="2.5" fill="var(--color-primary)" />;
        })}
      </svg>
    </div>
  );
}

function Panel({ title, icon: Icon, rows, formatName, emptyText = 'No data yet' }) {
  const max = rows && rows.length > 0 ? Math.max(...rows.map((r) => r.count)) : 1;
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
      minHeight: 280,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Icon size={14} strokeWidth={2} aria-hidden style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--adm-text)' }}>{title}</span>
      </div>
      {(!rows || rows.length === 0) ? (
        <div style={{ fontSize: 12, color: 'var(--adm-text-subtle)', textAlign: 'center', padding: '32px 0' }}>
          {emptyText}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((row, i) => {
            const pct = (row.count / max) * 100;
            const display = formatName ? formatName(row) : row.name;
            return (
              <div key={`${row.name}-${i}`} style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(124, 58, 237, 0.10)',
                  borderRadius: 6,
                  width: `${pct}%`,
                  transition: 'width 0.3s',
                }} />
                <div style={{
                  position: 'relative',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 10px', fontSize: 12, color: 'var(--adm-text)',
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                    {display}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--adm-text)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtNumber(row.count)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DevicesPanel({ browsers, os, devices }) {
  const [tab, setTab] = useState('browser');
  const rows = tab === 'browser' ? browsers : tab === 'os' ? os : devices;
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
      minHeight: 280,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Smartphone size={14} strokeWidth={2} aria-hidden style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--adm-text)' }}>Devices</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['browser', 'os', 'device'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 5,
                border: '1px solid var(--adm-border)',
                background: tab === t ? 'var(--color-primary)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--adm-text-muted)',
                textTransform: 'capitalize', cursor: 'pointer',
              }}
            >{t === 'os' ? 'OS' : t}</button>
          ))}
        </div>
      </div>
      <Panel title="" icon={Smartphone} rows={rows} />
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial load + range change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/admin/analytics/dashboard?range=${range}`, { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setError(json.detail || json.error || `Failed (${res.status})`);
          setData(null);
        } else {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range]);

  // Live count poll — every 10 s, only refreshes the live number
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/analytics/dashboard?range=24h`, { cache: 'no-store' });
        const json = await res.json();
        if (json?.ok) {
          setData((d) => (d ? { ...d, live: json.live } : d));
        }
      } catch {}
    }, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--adm-text)', margin: 0 }}>Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--adm-text-muted)', margin: '4px 0 0' }}>
            Privacy-friendly traffic insights — pageviews, unique visitors, sources, locations, and devices.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.30)',
            color: '#16a34a', fontSize: 12, fontWeight: 700,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#16a34a', display: 'inline-block',
              boxShadow: '0 0 0 0 rgba(34,197,94,0.7)',
              animation: 'wuPulse 2s infinite',
            }} />
            {data?.live ?? 0} live now
          </div>

          {/* Range picker */}
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 9, background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: 'none',
                  background: range === r.id ? 'var(--color-primary)' : 'transparent',
                  color: range === r.id ? '#fff' : 'var(--adm-text-muted)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
              >{r.label}</button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" style={{
          padding: '12px 14px', borderRadius: 10,
          background: 'rgba(239, 68, 68, 0.10)', border: '1px solid rgba(239, 68, 68, 0.40)',
          color: '#b91c1c', fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {loading && !data ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: 13 }}>
          Loading analytics…
        </div>
      ) : data ? (
        <>
          {/* KPI row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <KPI icon={Eye} label="Pageviews" value={fmtNumber(data.totals.pageviews)} />
            <KPI icon={Users} label="Unique visitors" value={fmtNumber(data.totals.uniqueVisitors)} />
            <KPI icon={MousePointerClick} label="Views / visit" value={data.totals.viewsPerVisit.toFixed(2)} />
            <KPI icon={Activity} label="Live (5m)" value={fmtNumber(data.live)} />
          </div>

          {/* Chart */}
          <TimeseriesChart data={data.timeseries} hours={data.window.hours} />

          {/* Breakdowns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
          }}>
            <Panel
              title="Top pages"
              icon={FileText}
              rows={data.topPages}
              emptyText="No pageviews yet."
            />
            <Panel
              title="Top sources"
              icon={BarChart3}
              rows={data.topSources}
              emptyText="No referrers yet."
            />
            <Panel
              title="Top locations"
              icon={Globe}
              rows={data.topLocations}
              formatName={(r) => `${r.code === r.name ? r.code : `${r.name}`}`}
              emptyText="No location data yet."
            />
            <DevicesPanel
              browsers={data.topBrowsers}
              os={data.topOS}
              devices={data.topDevices}
            />
          </div>
        </>
      ) : null}

      {/* Local keyframes for the live pulse */}
      <style jsx global>{`
        @keyframes wuPulse {
          0%   { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55); }
          70%  { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      `}</style>
    </div>
  );
}

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
  Activity, FileText, ChevronDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { WorldMap } from '@/components/admin/analytics/WorldMap';

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

function KPI({ icon: Icon, label, value, delta }) {
  // delta is a percentage number. 0 → no comparison row. Positive
  // green ▲, negative red ▼, exactly matching Plausible's idiom.
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const positive = hasDelta && delta > 0;
  const negative = hasDelta && delta < 0;
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
      {hasDelta && (
        <div style={{
          marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 11, fontWeight: 700,
          color: positive ? '#16a34a' : negative ? '#dc2626' : 'var(--adm-text-muted)',
        }}>
          {positive ? <ArrowUp size={11} strokeWidth={2.5} aria-hidden /> : negative ? <ArrowDown size={11} strokeWidth={2.5} aria-hidden /> : null}
          {Math.abs(delta)}%
          <span style={{ color: 'var(--adm-text-muted)', fontWeight: 500 }}>vs. previous</span>
        </div>
      )}
    </div>
  );
}

/**
 * Multi-tab panel. Each tab swaps the rows list (and optionally the
 * panel body — used for Locations to swap between the WorldMap and
 * the countries list).
 */
function TabbedPanel({ title, icon: Icon, tabs, defaultTab, render, rows, formatName, emptyText = 'No data yet' }) {
  const [tab, setTab] = useState(defaultTab || tabs[0].id);
  const activeTab = tabs.find((t) => t.id === tab) || tabs[0];
  const activeRows = typeof rows === 'function' ? rows(activeTab.id) : rows;
  const max = activeRows && activeRows.length > 0 ? Math.max(...activeRows.map((r) => r.count)) : 1;

  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
      minHeight: 280,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10, gap: 8, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon size={14} strokeWidth={2} aria-hidden style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--adm-text)' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--adm-border)' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px', border: 'none',
                background: 'transparent',
                color: tab === t.id ? 'var(--color-primary)' : 'var(--adm-text-muted)',
                borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: -1, cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom render for special tabs (e.g. world map) */}
      {render && render(activeTab.id)}

      {/* Standard row list — hidden when render() is in charge */}
      {!render && (
        (!activeRows || activeRows.length === 0) ? (
          <div style={{ fontSize: 12, color: 'var(--adm-text-subtle)', textAlign: 'center', padding: '32px 0' }}>
            {emptyText}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeRows.map((row, i) => {
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
        )
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
          {/* KPI row with comparison deltas vs. previous period */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <KPI icon={Eye} label="Pageviews" value={fmtNumber(data.totals.pageviews)} delta={data.deltas?.pageviews} />
            <KPI icon={Users} label="Unique visitors" value={fmtNumber(data.totals.uniqueVisitors)} delta={data.deltas?.uniqueVisitors} />
            <KPI icon={MousePointerClick} label="Views / visit" value={data.totals.viewsPerVisit.toFixed(2)} delta={data.deltas?.viewsPerVisit} />
            <KPI icon={Activity} label="Live (5m)" value={fmtNumber(data.live)} />
          </div>

          {/* Currently-viewing strip — what people are reading right now */}
          {data.currentPages && data.currentPages.length > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 12,
              background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--adm-text-subtle)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                Currently viewing
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.currentPages.map((p) => (
                  <span key={p.name} style={{
                    fontSize: 12, padding: '4px 9px', borderRadius: 999,
                    border: '1px solid var(--adm-border)',
                    background: 'var(--adm-surface-deep, transparent)',
                    color: 'var(--adm-text)',
                  }}>
                    <span style={{ color: 'var(--adm-text-muted)' }}>{p.name}</span>
                    <span style={{ marginLeft: 6, fontWeight: 700 }}>{p.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Chart */}
          <TimeseriesChart data={data.timeseries} hours={data.window.hours} />

          {/* Breakdowns — Plausible-style tabbed panels */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 12,
          }}>
            {/* Sources — Channels | Sources */}
            <TabbedPanel
              title="Top sources"
              icon={BarChart3}
              tabs={[
                { id: 'channels', label: 'Channels' },
                { id: 'sources', label: 'Sources' },
              ]}
              rows={(t) => t === 'channels' ? data.topChannels : data.topSources}
              emptyText="No referrers yet."
            />

            {/* Pages — Top | Entry | Exit */}
            <TabbedPanel
              title="Pages"
              icon={FileText}
              tabs={[
                { id: 'top', label: 'Top' },
                { id: 'entry', label: 'Entry' },
                { id: 'exit', label: 'Exit' },
              ]}
              rows={(t) => t === 'entry' ? data.entryPages : t === 'exit' ? data.exitPages : data.topPages}
              emptyText="No pageviews yet."
            />

            {/* Locations — Map | Countries */}
            <TabbedPanel
              title="Locations"
              icon={Globe}
              tabs={[
                { id: 'map', label: 'Map' },
                { id: 'list', label: 'Countries' },
              ]}
              render={(t) => t === 'map' ? <WorldMap data={data.topLocations} /> : null}
              rows={(t) => t === 'list' ? data.topLocations : null}
              emptyText="No location data yet."
            />

            {/* Devices — Browser | OS | Device */}
            <TabbedPanel
              title="Devices"
              icon={Smartphone}
              tabs={[
                { id: 'browser', label: 'Browser' },
                { id: 'os', label: 'OS' },
                { id: 'device', label: 'Device' },
              ]}
              rows={(t) => t === 'browser' ? data.topBrowsers : t === 'os' ? data.topOS : data.topDevices}
              emptyText="No device data yet."
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

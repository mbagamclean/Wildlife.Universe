'use client';

/**
 * Lightweight inline-SVG sparkline / line chart. No chart libraries.
 *
 * Props:
 *   data    — number[] of values
 *   labels  — optional string[] aligned to data, used in tooltip titles
 *   height  — px (default 80)
 *   color   — line/area color
 *   filled  — render area fill under the line (default true)
 *   showAxis — render baseline + last-value label
 */
export function MiniChart({
  data = [],
  labels = [],
  height = 80,
  color = '#008000',
  filled = true,
  showAxis = false,
}) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl text-xs"
        style={{ height, background: 'var(--adm-surface-2)', color: 'var(--adm-text-subtle)' }}
      >
        No data
      </div>
    );
  }

  const W = 600;
  const H = height;
  const PAD_X = 6;
  const PAD_Y = 6;

  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const range = max - min || 1;
  const stepX = (W - PAD_X * 2) / Math.max(1, data.length - 1);

  const points = data.map((v, i) => {
    const x = PAD_X + i * stepX;
    const y = H - PAD_Y - ((v - min) / range) * (H - PAD_Y * 2);
    return [x, y];
  });

  const linePath = points
    .map(([x, y], i) => (i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`))
    .join(' ');

  const areaPath = filled
    ? `${linePath} L ${(W - PAD_X).toFixed(1)} ${(H - PAD_Y).toFixed(1)} L ${PAD_X.toFixed(1)} ${(H - PAD_Y).toFixed(1)} Z`
    : '';

  const lastVal = data[data.length - 1];
  const lastLabel = labels[labels.length - 1] || '';

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
        {filled && (
          <>
            <defs>
              <linearGradient id={`mc-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#mc-grad-${color.replace('#', '')})`} />
          </>
        )}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill={color}>
            <title>
              {labels[i] ? `${labels[i]}: ${data[i]}` : `${data[i]}`}
            </title>
          </circle>
        ))}
      </svg>
      {showAxis && (
        <div className="mt-1 flex items-center justify-between text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
          <span>{labels[0] || ''}</span>
          <span>
            <span className="font-semibold" style={{ color }}>{lastVal}</span>
            {lastLabel ? <span className="ml-1">{lastLabel}</span> : null}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Horizontal bar chart for categorical breakdowns.
 *
 * items: [{ label, value }]
 */
export function MiniBarChart({ items = [], color = '#008000', formatValue }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--adm-text-subtle)' }}>No data.</p>
    );
  }
  const max = Math.max(1, ...items.map((i) => i.value || 0));
  const fmt = formatValue || ((n) => n.toLocaleString());

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => {
        const pct = Math.max(0.5, ((it.value || 0) / max) * 100);
        return (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between text-[12px]" style={{ color: 'var(--adm-text)' }}>
              <span className="truncate font-medium">{it.label}</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>{fmt(it.value || 0)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--adm-surface-2)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

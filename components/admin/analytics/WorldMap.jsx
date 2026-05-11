'use client';

/**
 * Plausible-style choropleth world map. Renders one path per country
 * from the world-atlas TopoJSON (Natural Earth 110m), shaded by visitor
 * count. Countries with no traffic render in a muted neutral; countries
 * with traffic ramp from low-opacity to full primary colour.
 *
 * Stack mirrors Plausible's own implementation:
 *   - world-atlas/countries-110m.json (≈110 KB, in /public)
 *   - topojson-client to feature-ize
 *   - d3-geo's geoNaturalEarth1 projection + geoPath generator
 *
 * The TopoJSON file is fetched once on mount and cached in module
 * memory so tab switches don't refetch.
 */

import { useEffect, useMemo, useState } from 'react';
import { feature } from 'topojson-client';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { ISO_NUMERIC_TO_ALPHA2 } from '@/lib/analytics/iso-numeric-to-alpha2';

let _topoCache = null;
let _topoPromise = null;

function loadTopo() {
  if (_topoCache) return Promise.resolve(_topoCache);
  if (_topoPromise) return _topoPromise;
  _topoPromise = fetch('/world-atlas/countries-110m.json', { cache: 'force-cache' })
    .then((r) => r.json())
    .then((topo) => {
      _topoCache = topo;
      return topo;
    });
  return _topoPromise;
}

export function WorldMap({ data = [] }) {
  const [topo, setTopo] = useState(_topoCache);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let alive = true;
    loadTopo().then((t) => { if (alive) setTopo(t); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Build code → { name, count } lookup. Names live in `data`.
  const byCode = useMemo(() => {
    const m = new Map();
    for (const row of data || []) {
      if (row?.code) m.set(row.code.toUpperCase(), { name: row.name, count: row.count });
    }
    return m;
  }, [data]);

  const maxCount = useMemo(() => {
    let m = 0;
    for (const v of byCode.values()) if (v.count > m) m = v.count;
    return m || 1;
  }, [byCode]);

  // Memo the projected SVG paths so we don't recompute on every hover.
  const W = 820;
  const H = 460;
  const paths = useMemo(() => {
    if (!topo) return null;
    const fc = feature(topo, topo.objects.countries);
    const proj = geoNaturalEarth1().fitSize([W, H], fc);
    const pathGen = geoPath(proj);
    return fc.features.map((f) => {
      const alpha2 = ISO_NUMERIC_TO_ALPHA2[Number(f.id)] || null;
      const rec = alpha2 ? byCode.get(alpha2) : null;
      const d = pathGen(f);
      return { id: String(f.id), alpha2, name: rec?.name || f.properties?.name || alpha2 || '—', count: rec?.count || 0, d };
    });
  }, [topo, byCode]);

  // Color ramp — countries with no data render in a neutral; data
  // countries ramp from light to full primary based on share.
  const fillFor = (count) => {
    if (count <= 0) return 'var(--adm-border)';
    const t = Math.min(1, count / maxCount);
    // Opacity from 0.32 → 1.0 — flat hue, primary-tinted.
    const opacity = 0.32 + 0.68 * t;
    return `rgba(124, 58, 237, ${opacity.toFixed(3)})`;
  };

  if (!topo || !paths) {
    return (
      <div style={{
        height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: 'var(--adm-text-subtle)',
      }}>
        Loading map…
      </div>
    );
  }

  const totalShown = [...byCode.values()].reduce((s, r) => s + r.count, 0);
  const countriesWithTraffic = byCode.size;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Visitors by country"
      >
        <g>
          {paths.map((p) => (
            <path
              key={p.id}
              d={p.d}
              fill={fillFor(p.count)}
              stroke="rgba(0,0,0,0.30)"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
              onMouseEnter={() => p.count > 0 && setHover(p)}
              onMouseLeave={() => setHover(null)}
              style={{
                cursor: p.count > 0 ? 'pointer' : 'default',
                transition: 'fill 0.18s ease',
              }}
            >
              {p.count > 0 && <title>{p.name} — {p.count.toLocaleString()} visitor{p.count === 1 ? '' : 's'}</title>}
            </path>
          ))}
        </g>
      </svg>

      {hover && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          padding: '6px 10px', borderRadius: 8,
          background: 'rgba(0,0,0,0.80)', color: '#fff',
          fontSize: 12, fontWeight: 600,
          pointerEvents: 'none',
          boxShadow: '0 4px 14px rgba(0,0,0,0.30)',
        }}>
          {hover.name} · {hover.count.toLocaleString()}
        </div>
      )}

      <div style={{
        marginTop: 6, fontSize: 11, color: 'var(--adm-text-muted)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{countriesWithTraffic} {countriesWithTraffic === 1 ? 'country' : 'countries'} with traffic</span>
        <span>{totalShown.toLocaleString()} mapped visitors</span>
      </div>
    </div>
  );
}

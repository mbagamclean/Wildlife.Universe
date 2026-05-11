'use client';

/**
 * Plausible-style world map. Plots a dot per country with data using
 * an equirectangular projection over a low-poly continent silhouette
 * background. Zero dependencies — the continent paths and country
 * coordinate table are inline below.
 *
 * Inputs:
 *   data: [{ code: 'US', name: 'United States', count: 1234 }, …]
 *
 * Visual contract:
 *   - Background: muted continent outlines, theme-aware via stroke +
 *     fill set with var(--adm-border) / very low-opacity primary.
 *   - Dots: theme primary, size + opacity scale with traffic share,
 *     min radius keeps tiny countries visible.
 *   - Hover: ring + native title tooltip with name and count.
 */

import { useMemo, useState } from 'react';

// ─── Simplified continent outlines (equirectangular, viewBox 0 0 720 360)
// Hand-traced low-poly continents. Not survey-grade — they're a backdrop
// so the dot overlay reads as a map without shipping 200KB of country
// path data on the page. The dots are what carry the data.
const CONTINENTS = [
  // North America
  'M 90 70 L 130 60 L 195 65 L 230 95 L 220 130 L 195 150 L 175 175 L 145 195 L 125 175 L 110 145 L 95 120 L 85 95 Z M 165 200 L 195 210 L 210 230 L 200 245 L 175 250 L 160 235 L 155 215 Z',
  // South America
  'M 215 240 L 245 245 L 260 270 L 255 305 L 235 335 L 215 340 L 200 315 L 195 285 L 200 260 Z',
  // Europe
  'M 340 75 L 395 70 L 425 90 L 415 115 L 395 130 L 370 135 L 350 125 L 335 105 L 332 90 Z',
  // Africa
  'M 355 145 L 410 145 L 440 175 L 450 215 L 435 260 L 410 290 L 385 295 L 365 275 L 355 240 L 350 205 L 348 175 Z',
  // Middle East / West Asia
  'M 425 115 L 465 110 L 490 130 L 485 160 L 460 175 L 435 165 L 425 145 Z',
  // South + South-East Asia
  'M 490 145 L 545 140 L 570 165 L 575 195 L 555 220 L 525 220 L 500 200 L 488 175 Z',
  // North Asia
  'M 440 60 L 540 55 L 605 75 L 625 100 L 605 125 L 555 130 L 510 125 L 470 115 L 445 95 Z',
  // East Asia
  'M 555 110 L 605 105 L 625 125 L 620 155 L 595 165 L 570 155 L 555 135 Z',
  // SE Asia islands
  'M 565 220 L 605 215 L 620 235 L 605 250 L 580 245 Z',
  // Oceania / Australia
  'M 600 270 L 650 265 L 670 285 L 660 310 L 625 320 L 605 305 L 595 285 Z',
];

// ─── Country centroid lookup (lon, lat). Trimmed to the markets the
// site is likely to see; everything else falls back to a generic mid-
// of-continent dot if needed.
const COUNTRY_COORDS = {
  US: [-95.7, 39.8], CA: [-106.3, 56.1], MX: [-102.5, 23.6],
  GT: [-90.2, 15.7], CR: [-83.7, 9.7], PA: [-80.7, 9.0],
  BR: [-51.9, -14.2], AR: [-63.6, -38.4], CL: [-71.5, -35.6], CO: [-74.3, 4.5], PE: [-75.0, -9.2], VE: [-66.0, 6.4], EC: [-78.2, -1.8], UY: [-55.8, -32.5], BO: [-63.6, -16.3],
  GB: [-3.4, 55.4], IE: [-8.2, 53.4], FR: [2.2, 46.2], DE: [10.5, 51.2], NL: [5.3, 52.1], BE: [4.5, 50.5], LU: [6.1, 49.8], CH: [8.2, 46.8], AT: [14.6, 47.5], IT: [12.6, 41.9], ES: [-3.7, 40.5], PT: [-8.0, 39.4], SE: [18.6, 60.1], NO: [8.5, 60.5], FI: [25.7, 61.9], DK: [9.5, 56.3], IS: [-19.0, 64.9], PL: [19.1, 51.9], CZ: [15.5, 49.8], SK: [19.7, 48.7], HU: [19.5, 47.2], RO: [25.0, 45.9], BG: [25.5, 42.7], GR: [21.8, 39.1], TR: [35.2, 38.9], UA: [31.2, 48.4], RU: [105.3, 61.5], BY: [27.9, 53.7], EE: [25.0, 58.6], LV: [24.6, 56.9], LT: [23.9, 55.2], RS: [21.0, 44.0], HR: [15.2, 45.1], SI: [14.5, 46.1], BA: [17.7, 43.9], MK: [21.7, 41.6], AL: [20.2, 41.2], MD: [28.4, 47.4], MT: [14.4, 35.9], CY: [33.4, 35.1],
  CN: [104.2, 35.9], JP: [138.3, 36.2], KR: [127.8, 36.0], TW: [121.0, 23.7], HK: [114.1, 22.4], SG: [103.8, 1.4], MY: [101.9, 4.2], TH: [100.9, 15.9], VN: [108.3, 14.1], PH: [121.8, 12.9], ID: [113.9, -0.8], IN: [78.9, 20.6], PK: [69.3, 30.4], BD: [90.4, 23.7], LK: [80.8, 7.9], NP: [84.1, 28.4], MM: [95.9, 21.9], KH: [104.9, 12.6], LA: [102.5, 19.9],
  AE: [54.0, 24.0], SA: [45.1, 23.9], IL: [34.9, 31.0], JO: [36.0, 30.6], LB: [35.9, 33.9], IR: [53.7, 32.4], IQ: [43.7, 33.2], QA: [51.2, 25.4], KW: [47.5, 29.3], OM: [55.9, 21.5], YE: [48.5, 15.6],
  ZA: [22.9, -30.6], EG: [30.8, 26.8], NG: [8.7, 9.1], KE: [37.9, -0.0], ET: [40.5, 9.1], TZ: [34.9, -6.4], UG: [32.3, 1.4], RW: [29.9, -2.0], GH: [-1.0, 7.9], SN: [-14.5, 14.5], MA: [-7.1, 31.8], DZ: [1.7, 28.0], TN: [9.5, 33.9], LY: [17.2, 26.3], CI: [-5.5, 7.5], CM: [12.3, 7.4], AO: [17.9, -11.2], MZ: [35.5, -18.7], ZW: [29.2, -19.0], BW: [24.7, -22.3], NA: [18.5, -22.9], MG: [46.9, -18.8],
  AU: [133.8, -25.3], NZ: [174.9, -40.9], PG: [143.9, -6.3], FJ: [179.4, -16.6],
};

// Equirectangular: lon/lat → SVG coords (viewBox 720×360). Longitude
// spans 360 across the width; latitude spans 180 across the height.
function project(lon, lat) {
  return [
    ((lon + 180) / 360) * 720,
    ((90 - lat) / 180) * 360,
  ];
}

export function WorldMap({ data = [] }) {
  const [hover, setHover] = useState(null);

  const { plotted, maxCount, totalShown } = useMemo(() => {
    const rows = (data || [])
      .map((d) => {
        const code = (d.code || '').toUpperCase();
        const xy = COUNTRY_COORDS[code];
        if (!xy) return null;
        const [x, y] = project(xy[0], xy[1]);
        return { ...d, code, x, y };
      })
      .filter(Boolean);
    const max = rows.reduce((m, r) => Math.max(m, r.count), 1);
    const total = rows.reduce((s, r) => s + r.count, 0);
    return { plotted: rows, maxCount: max, totalShown: total };
  }, [data]);

  if (plotted.length === 0) {
    return (
      <div style={{
        height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: 'var(--adm-text-subtle)',
      }}>
        No location data yet — visitors will appear as dots on the map once they arrive.
      </div>
    );
  }

  // Radius: linear from 4 → 16 by share; opacity follows.
  const radiusFor = (count) => 4 + (count / maxCount) * 12;
  const opacityFor = (count) => 0.45 + (count / maxCount) * 0.55;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox="0 0 720 360"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Visitors by country"
      >
        {/* Continent silhouettes — flat, soft */}
        <g>
          {CONTINENTS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="var(--adm-border)"
              fillOpacity="0.55"
              stroke="var(--adm-border)"
              strokeWidth="1"
              strokeOpacity="0.9"
            />
          ))}
        </g>

        {/* Country dots — sorted big-first so small dots overlay on top */}
        <g>
          {[...plotted].sort((a, b) => b.count - a.count).map((row) => (
            <g key={row.code} onMouseEnter={() => setHover(row)} onMouseLeave={() => setHover(null)}>
              {/* Glow ring on hover */}
              {hover?.code === row.code && (
                <circle
                  cx={row.x}
                  cy={row.y}
                  r={radiusFor(row.count) + 6}
                  fill="var(--color-primary)"
                  fillOpacity="0.18"
                />
              )}
              <circle
                cx={row.x}
                cy={row.y}
                r={radiusFor(row.count)}
                fill="var(--color-primary)"
                fillOpacity={opacityFor(row.count)}
                stroke="#fff"
                strokeWidth="1"
                strokeOpacity="0.7"
                style={{ cursor: 'pointer', transition: 'r 0.18s ease, fill-opacity 0.18s ease' }}
              >
                <title>{row.name} — {row.count.toLocaleString()} visitor{row.count === 1 ? '' : 's'}</title>
              </circle>
            </g>
          ))}
        </g>
      </svg>

      {/* Floating count when hovering a dot */}
      {hover && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          padding: '6px 10px', borderRadius: 8,
          background: 'var(--adm-surface-deep, var(--adm-surface))',
          border: '1px solid var(--adm-border)',
          fontSize: 12, fontWeight: 700, color: 'var(--adm-text)',
          pointerEvents: 'none',
          boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
        }}>
          {hover.name} · {hover.count.toLocaleString()}
        </div>
      )}

      {/* Coverage line */}
      <div style={{
        marginTop: 8, fontSize: 11, color: 'var(--adm-text-muted)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{plotted.length} {plotted.length === 1 ? 'country' : 'countries'} with traffic</span>
        <span>{totalShown.toLocaleString()} mapped visitors</span>
      </div>
    </div>
  );
}

'use client';
import { useState, useMemo, useRef } from 'react';
import { Palette, Download, Image as ImageIcon, Maximize2, Sparkles, RotateCcw } from 'lucide-react';

const PINK = '#ec4899';
const PINK_LIGHT = 'rgba(236,72,153,0.10)';

const ASPECTS = [
  { id: '16:9', ratio: 16 / 9, label: '16 : 9 — wide' },
  { id: '4:3',  ratio: 4 / 3,  label: '4 : 3 — classic' },
  { id: '1:1',  ratio: 1,      label: '1 : 1 — square' },
  { id: '9:16', ratio: 9 / 16, label: '9 : 16 — story' },
];

const PRESETS = [
  { name: 'Savanna',  from: '#0c4a1a', via: '#3aa15a', to: '#d4af37' },
  { name: 'Twilight', from: '#1e1b4b', via: '#7c3aed', to: '#f59e0b' },
  { name: 'Coral',    from: '#7f1d1d', via: '#ef4444', to: '#fde68a' },
  { name: 'Forest',   from: '#052e16', via: '#15803d', to: '#a7f3d0' },
  { name: 'Ocean',    from: '#082f49', via: '#0284c7', to: '#67e8f9' },
  { name: 'Sand',     from: '#78350f', via: '#d97706', to: '#fde68a' },
];

const DEFAULT_FILTER = { brightness: 100, contrast: 100, saturation: 100, blur: 0 };

function coverUrl(cover) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  if (cover?.sources?.length) {
    const webp = cover.sources.find((s) => /webp/i.test(s.type));
    return (webp || cover.sources[0]).src;
  }
  return null;
}

export function DesignStudioPanel({ cover, palette, onPaletteChange }) {
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [aspect, setAspect] = useState('16:9');
  const previewRef = useRef(null);

  const url = coverUrl(cover);

  const aspectObj = useMemo(() => ASPECTS.find((a) => a.id === aspect) || ASPECTS[0], [aspect]);
  const filterCss = `brightness(${filter.brightness}%) contrast(${filter.contrast}%) saturate(${filter.saturation}%) blur(${filter.blur}px)`;

  const applyPreset = (preset) => {
    onPaletteChange({ from: preset.from, via: preset.via, to: preset.to });
  };

  const reset = () => setFilter(DEFAULT_FILTER);

  // Render the current preview to PNG via canvas and download
  const downloadStyled = () => {
    const node = previewRef.current;
    if (!node) return;
    const img = node.querySelector('img');
    const W = 1600;
    const H = Math.round(W / aspectObj.ratio);
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background: gradient + cover
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.filter = filterCss;
      ctx.drawImage(img, 0, 0, W, H);
      ctx.filter = 'none';
    } else {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0,    palette.from);
      grad.addColorStop(0.5,  palette.via);
      grad.addColorStop(1,    palette.to);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    // Bottom gradient overlay for legibility
    const overlay = ctx.createLinearGradient(0, H * 0.4, 0, H);
    overlay.addColorStop(0, 'rgba(0,0,0,0)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-${aspect.replace(':', 'x')}-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg, ${PINK}, #f472b6)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Palette size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>Design Studio</div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>
            Style your cover, preview crops, export styled PNG
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div
        ref={previewRef}
        style={{
          position: 'relative',
          aspectRatio: `${aspectObj.ratio}`,
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${palette.from}, ${palette.via}, ${palette.to})`,
          border: '1px solid var(--adm-border)',
        }}
      >
        {url ? (
          <img
            src={url}
            alt="Cover preview"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: filterCss,
              transition: 'filter 0.2s ease',
            }}
            crossOrigin="anonymous"
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.7)', fontSize: 11, gap: 6,
          }}>
            <ImageIcon size={14} /> No cover image set
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Aspect ratio */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          Aspect Ratio
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {ASPECTS.map((a) => {
            const active = aspect === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAspect(a.id)}
                style={{
                  padding: '5px 10px', borderRadius: 7, fontSize: 10, fontWeight: 700,
                  border: `1px solid ${active ? PINK : 'var(--adm-border)'}`,
                  background: active ? PINK : 'transparent',
                  color: active ? '#fff' : 'var(--adm-text-muted)',
                  cursor: 'pointer',
                }}
              >
                <Maximize2 size={9} style={{ display: 'inline', marginRight: 3 }} /> {a.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter sliders */}
      <div style={{
        padding: '10px 11px', borderRadius: 9,
        background: PINK_LIGHT, border: `1px solid rgba(236,72,153,0.25)`,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: PINK, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} /> Filters
          </span>
          <button
            onClick={reset}
            style={{
              fontSize: 10, color: 'var(--adm-text-muted)', background: 'transparent',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
            }}
          >
            <RotateCcw size={10} /> Reset
          </button>
        </div>
        {[
          ['brightness', 50,  150, '%'],
          ['contrast',   50,  150, '%'],
          ['saturation', 0,   200, '%'],
          ['blur',       0,   8,   'px'],
        ].map(([key, min, max, unit]) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--adm-text-muted)', textTransform: 'capitalize' }}>{key}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: PINK }}>{filter[key]}{unit}</span>
            </div>
            <input
              type="range" min={min} max={max} value={filter[key]}
              onChange={(e) => setFilter((f) => ({ ...f, [key]: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: PINK }}
            />
          </div>
        ))}
      </div>

      {/* Palette presets */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          Palette Presets
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              style={{
                padding: '6px', borderRadius: 7, border: '1px solid var(--adm-border)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}
            >
              <div style={{
                width: '100%', height: 18, borderRadius: 4,
                background: `linear-gradient(135deg, ${p.from}, ${p.via}, ${p.to})`,
              }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--adm-text-muted)' }}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom palette pickers */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          Custom Gradient
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
          {['from', 'via', 'to'].map((k) => (
            <label key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 9, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</span>
              <input
                type="color"
                value={palette[k]}
                onChange={(e) => onPaletteChange({ ...palette, [k]: e.target.value })}
                style={{ width: '100%', height: 26, borderRadius: 5, border: '1px solid var(--adm-border)', cursor: 'pointer', padding: 1 }}
              />
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={downloadStyled}
        style={{
          padding: '10px', borderRadius: 9, fontSize: 12, fontWeight: 700,
          border: 'none', background: `linear-gradient(135deg, ${PINK}, #f472b6)`, color: '#fff',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}
      >
        <Download size={13} /> Download Styled PNG
      </button>
    </div>
  );
}

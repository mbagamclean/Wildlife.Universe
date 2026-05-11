'use client';

/**
 * Plausible-style date range picker. Click the trigger pill to open
 * a grouped dropdown of presets (Today / Yesterday / Realtime /
 * Last 24h / 7d / 28d / 91d / Month to Date / Last Month / YTD /
 * Last 12 Months / All Time / Custom Range), each with a keyboard
 * shortcut shown on the right.
 *
 * Behaviour mirrors plausible.io:
 *   - Single-letter shortcuts trigger presets while the dropdown is
 *     open (Plausible's are global, this is a small scope-down).
 *   - Prev/Next chevrons next to the trigger shift the window by its
 *     own duration backwards/forwards (becomes a Custom range under
 *     the hood).
 *   - Custom Range opens a tiny date-input row inline.
 *   - Esc + outside-click close the dropdown.
 *
 * Compare is rendered for visual parity but disabled — comparison
 * vs. previous period is already shown via KPI deltas; full overlay
 * mode is a follow-up.
 */

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const PRESETS = [
  { group: 1, id: 'today',      label: 'Today',          shortcut: 'D' },
  { group: 1, id: 'yesterday',  label: 'Yesterday',      shortcut: 'E' },
  { group: 1, id: 'realtime',   label: 'Realtime',       shortcut: 'R' },
  { group: 2, id: '24h',        label: 'Last 24 Hours',  shortcut: 'H' },
  { group: 2, id: '7d',         label: 'Last 7 Days',    shortcut: 'W' },
  { group: 2, id: '28d',        label: 'Last 28 Days',   shortcut: 'F' },
  { group: 2, id: '91d',        label: 'Last 91 Days',   shortcut: 'N' },
  { group: 3, id: 'mtd',        label: 'Month to Date',  shortcut: 'M' },
  { group: 3, id: 'last_month', label: 'Last Month',     shortcut: 'P' },
  { group: 4, id: 'ytd',        label: 'Year to Date',   shortcut: 'Y' },
  { group: 4, id: '12mo',       label: 'Last 12 Months', shortcut: 'L' },
  { group: 5, id: 'all',        label: 'All time',       shortcut: 'A' },
  { group: 5, id: 'custom',     label: 'Custom Range',   shortcut: 'C' },
  { group: 6, id: 'compare',    label: 'Compare',        shortcut: 'X', disabled: true },
];

function presetLabel(id, customStart, customEnd) {
  if (id === 'custom') {
    if (customStart && customEnd) {
      const fmt = (s) => new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return `${fmt(customStart)} – ${fmt(customEnd)}`;
    }
    return 'Custom Range';
  }
  const p = PRESETS.find((x) => x.id === id);
  return p ? p.label : 'Last 7 Days';
}

function todayISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function DateRangePicker({ range, customStart, customEnd, onChange }) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [startInput, setStartInput] = useState(customStart ? todayISO(new Date(customStart)) : '');
  const [endInput, setEndInput] = useState(customEnd ? todayISO(new Date(customEnd)) : todayISO());
  const wrapRef = useRef(null);

  // Close on outside click / Esc
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      // Single-letter shortcut while open
      if (!customOpen && e.key.length === 1) {
        const letter = e.key.toUpperCase();
        const hit = PRESETS.find((p) => p.shortcut === letter && !p.disabled);
        if (hit) {
          e.preventDefault();
          if (hit.id === 'custom') { setCustomOpen(true); return; }
          onChange?.({ range: hit.id });
          setOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, customOpen, onChange]);

  const triggerLabel = presetLabel(range, customStart, customEnd);

  // Shift window by its own duration in time (prev/next arrows).
  // For relative presets, treat as a custom window of the same span.
  const shift = (direction) => {
    const now = Date.now();
    let durMs;
    switch (range) {
      case 'today': case 'yesterday': durMs = 24 * 60 * 60 * 1000; break;
      case '24h': durMs = 24 * 60 * 60 * 1000; break;
      case '7d': durMs = 7 * 24 * 60 * 60 * 1000; break;
      case '28d': durMs = 28 * 24 * 60 * 60 * 1000; break;
      case '91d': durMs = 91 * 24 * 60 * 60 * 1000; break;
      case 'mtd': case 'last_month': durMs = 30 * 24 * 60 * 60 * 1000; break;
      case 'ytd': case '12mo': durMs = 365 * 24 * 60 * 60 * 1000; break;
      default: durMs = 7 * 24 * 60 * 60 * 1000;
    }
    const currEnd = customEnd ? new Date(customEnd).getTime() : now;
    const currStart = customStart ? new Date(customStart).getTime() : currEnd - durMs;
    const delta = direction * durMs;
    const newStart = new Date(currStart + delta).toISOString();
    const newEnd = new Date(Math.min(now, currEnd + delta)).toISOString();
    onChange?.({ range: 'custom', start: newStart, end: newEnd });
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setCustomOpen(false); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 8,
          border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
          color: 'var(--adm-text)', fontSize: 12, fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <Calendar size={13} strokeWidth={2} aria-hidden />
        <span>{triggerLabel}</span>
        <span style={{ display: 'inline-flex', gap: 2, marginLeft: 4 }}>
          <span
            role="button"
            tabIndex={0}
            aria-label="Previous period"
            onClick={(e) => { e.stopPropagation(); shift(-1); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); shift(-1); } }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 4,
              color: 'var(--adm-text-muted)',
            }}
          >
            <ChevronLeft size={14} />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Next period"
            onClick={(e) => { e.stopPropagation(); shift(1); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); shift(1); } }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: 4,
              color: 'var(--adm-text-muted)',
            }}
          >
            <ChevronRight size={14} />
          </span>
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            minWidth: 260, zIndex: 50,
            padding: 8, borderRadius: 10,
            background: 'var(--adm-surface-deep, var(--adm-surface))',
            border: '1px solid var(--adm-border)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.30)',
          }}
        >
          {/* Custom range input pane */}
          {customOpen ? (
            <div style={{ padding: 4 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--adm-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
              }}>Custom range</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="date"
                  value={startInput}
                  max={endInput || todayISO()}
                  onChange={(e) => setStartInput(e.target.value)}
                  style={{
                    flex: 1, padding: '6px 8px', borderRadius: 6,
                    border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
                    color: 'var(--adm-text)', fontSize: 12,
                  }}
                />
                <input
                  type="date"
                  value={endInput}
                  min={startInput}
                  max={todayISO()}
                  onChange={(e) => setEndInput(e.target.value)}
                  style={{
                    flex: 1, padding: '6px 8px', borderRadius: 6,
                    border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
                    color: 'var(--adm-text)', fontSize: 12,
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => { setCustomOpen(false); }}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 6,
                    background: 'transparent', border: '1px solid var(--adm-border)',
                    color: 'var(--adm-text-muted)', cursor: 'pointer',
                  }}
                >Cancel</button>
                <button
                  type="button"
                  disabled={!startInput || !endInput}
                  onClick={() => {
                    onChange?.({
                      range: 'custom',
                      start: new Date(startInput + 'T00:00:00Z').toISOString(),
                      end: new Date(endInput + 'T23:59:59Z').toISOString(),
                    });
                    setOpen(false);
                    setCustomOpen(false);
                  }}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 6,
                    background: 'var(--color-primary)', border: 'none', color: '#fff',
                    cursor: (!startInput || !endInput) ? 'not-allowed' : 'pointer',
                    opacity: (!startInput || !endInput) ? 0.5 : 1,
                  }}
                >Apply</button>
              </div>
            </div>
          ) : (
            // Preset list grouped with thin dividers between groups
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {PRESETS.map((p, i) => {
                const prevGroup = i > 0 ? PRESETS[i - 1].group : null;
                const showDivider = prevGroup !== null && prevGroup !== p.group;
                const active = !p.disabled && (range === p.id || (range === 'custom' && p.id === 'custom'));
                return (
                  <li key={p.id}>
                    {showDivider && (
                      <div style={{
                        margin: '6px 4px', height: 1, background: 'var(--adm-border)', opacity: 0.7,
                      }} />
                    )}
                    <button
                      type="button"
                      disabled={p.disabled}
                      onClick={() => {
                        if (p.disabled) return;
                        if (p.id === 'custom') { setCustomOpen(true); return; }
                        onChange?.({ range: p.id });
                        setOpen(false);
                      }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px', borderRadius: 6, border: 'none',
                        background: active ? 'var(--adm-hover-bg, rgba(124,58,237,0.10))' : 'transparent',
                        color: p.disabled ? 'var(--adm-text-subtle)' : 'var(--adm-text)',
                        fontSize: 13, fontWeight: active ? 700 : 500,
                        cursor: p.disabled ? 'not-allowed' : 'pointer',
                        opacity: p.disabled ? 0.5 : 1, textAlign: 'left',
                      }}
                    >
                      <span>{p.label}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 22, height: 18, padding: '0 5px',
                        borderRadius: 4, background: 'var(--adm-surface)',
                        border: '1px solid var(--adm-border)',
                        fontSize: 10, fontWeight: 700, color: 'var(--adm-text-muted)',
                      }}>
                        {p.shortcut}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

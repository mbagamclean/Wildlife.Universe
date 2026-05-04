'use client';
import { useState, useCallback } from 'react';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { useAIStore } from '@/lib/stores/aiStore';

const GOLD = '#d4af37';
const GOLD_BORDER = 'rgba(212,175,55,0.25)';
const GOLD_LIGHT = 'rgba(212,175,55,0.07)';

export function AdSenseCheckPanel({ editor, title, excerpt = '' }) {
  const { provider } = useAIStore();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runCheck = useCallback(async () => {
    const content = editor?.getHTML() || '';
    if (!title?.trim() || !content.trim()) {
      setError('Add a title and content before running the check.');
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai/adsense-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, excerpt, provider }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Check failed');
      setResult(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [editor, title, excerpt, provider]);

  const score = result?.score ?? 0;
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#dc2626';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '10px 12px', borderRadius: 8,
        background: GOLD_LIGHT, border: `1px solid ${GOLD_BORDER}`,
        fontSize: 11, color: GOLD, lineHeight: 1.55,
      }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={13} /> AdSense Policy Compliance
        </strong>
        <div style={{ marginTop: 4 }}>
          Pre-publish check against Google AdSense content policies (originality, family-safe, value).
        </div>
      </div>

      <button
        onClick={runCheck}
        disabled={running}
        style={{
          padding: '10px', borderRadius: 9,
          background: running ? 'var(--adm-hover-bg)' : `linear-gradient(135deg, ${GOLD}, #f59e0b)`,
          color: running ? 'var(--adm-text-muted)' : '#0c0c0c',
          fontWeight: 700, fontSize: 12, border: 'none',
          cursor: running ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}
      >
        {running
          ? (<><Loader2 size={13} className="animate-spin" /> Checking…</>)
          : (<><ShieldCheck size={13} /> Run AdSense Check</>)}
      </button>

      {error && (
        <div style={{
          padding: '8px 11px', borderRadius: 7, fontSize: 11,
          background: 'rgba(239,68,68,0.08)', color: '#dc2626',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {result && (
        <>
          <div style={{
            padding: '14px', borderRadius: 10,
            border: `1px solid ${result.compliant ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            background: result.compliant ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: `3px solid ${scoreColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: scoreColor,
              flexShrink: 0,
            }}>{score}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {result.compliant
                  ? (<><CheckCircle2 size={15} color="#22c55e" /> Compliant</>)
                  : (<><AlertTriangle size={15} color="#dc2626" /> Issues found</>)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--adm-text-muted)', marginTop: 2 }}>
                Compliance score out of 100
              </div>
            </div>
          </div>

          {result.issues?.length > 0 && (
            <Section title="Issues" icon={<AlertCircle size={13} color="#dc2626" />} items={result.issues} color="#dc2626" />
          )}
          {result.warnings?.length > 0 && (
            <Section title="Warnings" icon={<AlertTriangle size={13} color="#f59e0b" />} items={result.warnings} color="#f59e0b" />
          )}
          {result.recommendations?.length > 0 && (
            <Section title="Recommendations" icon={<Lightbulb size={13} color={GOLD} />} items={result.recommendations} color={GOLD} />
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, icon, items, color }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {icon} {title} ({items.length})
      </div>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 5, margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((it, i) => (
          <li key={i} style={{
            padding: '7px 10px', borderRadius: 7,
            border: `1px solid ${color}33`, background: `${color}0a`,
            fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.5,
          }}>
            {typeof it === 'string' ? it : (it.message || JSON.stringify(it))}
          </li>
        ))}
      </ul>
    </div>
  );
}

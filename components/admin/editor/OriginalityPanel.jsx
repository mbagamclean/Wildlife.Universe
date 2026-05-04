'use client';
import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAIStore } from '@/lib/stores/aiStore';

const ORANGE = '#ea580c';
const ORANGE_LIGHT = 'rgba(234,88,12,0.10)';
const ORANGE_BORDER = 'rgba(234,88,12,0.28)';

function ScoreRing({ score, size = 72 }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const tone = score >= 85 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--adm-border)" strokeWidth={6} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={tone} strokeWidth={6} fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: tone }}>{score}</span>
      </div>
    </div>
  );
}

export function OriginalityPanel({ editor }) {
  const store = useAIStore();
  const [loading, setLoading] = useState(false);
  const [plag, setPlag] = useState(store.plagiarismResult);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    if (!editor) return;
    setLoading(true); setError(null);
    try {
      const html = editor.getHTML();
      const text = html.replace(/<[^>]+>/g, ' ').trim();
      if (!text) throw new Error('Editor is empty');
      const res = await fetch('/api/ai/plagiarism', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: html, provider: store.provider, model: store.getCurrentTextModel() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Originality check failed');
      setPlag(json.data);
      store.setPlagiarismResult(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [editor, store]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg, ${ORANGE}, #f97316)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Search size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>Originality</div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>
            Score uniqueness, voice, and supporting evidence
          </div>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        style={{
          padding: '10px', borderRadius: 9, fontSize: 12, fontWeight: 700,
          border: 'none',
          background: loading ? 'var(--adm-hover-bg)' : `linear-gradient(135deg, ${ORANGE}, #f97316)`,
          color: loading ? 'var(--adm-text-muted)' : '#fff',
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {loading ? 'Analyzing…' : 'Run Originality Check'}
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

      <AnimatePresence>
        {plag && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '12px', borderRadius: 10,
              border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ScoreRing score={plag.originalityScore || 0} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--adm-text)', textTransform: 'capitalize' }}>
                  {plag.status}
                </div>
                <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 3, lineHeight: 1.5 }}>
                  {plag.verdict}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {[
                ['uniqueAngle', 'Unique angle'],
                ['personalVoice', 'Personal voice'],
                ['originalExamples', 'Original examples'],
                ['dataAndStats', 'Data & statistics'],
              ].map(([key, label]) => {
                const yes = plag.uniquenessReport?.[key];
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 10, color: yes ? 'var(--adm-text)' : 'var(--adm-text-subtle)',
                  }}>
                    {yes
                      ? <CheckCircle size={11} color="#10b981" />
                      : <AlertCircle size={11} color="#f59e0b" />
                    }
                    {label}
                  </div>
                );
              })}
            </div>

            {plag.genericPhrases?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  Generic Phrases ({plag.genericPhrases.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {plag.genericPhrases.map((p, i) => (
                    <span key={i} style={{
                      fontSize: 10, padding: '3px 7px', borderRadius: 5,
                      background: ORANGE_LIGHT, color: ORANGE,
                      border: `1px solid ${ORANGE_BORDER}`,
                    }}>
                      {typeof p === 'string' ? p : p.phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

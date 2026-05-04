'use client';
import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, AlertCircle, Sparkles, Loader2, ShieldCheck,
  X, Check, Eye, FileText,
} from 'lucide-react';
import { useAIStore } from '@/lib/stores/aiStore';

const TEAL = '#0d9488';
const TEAL_LIGHT = 'rgba(13,148,136,0.10)';
const TEAL_BORDER = 'rgba(13,148,136,0.28)';

function ScoreRing({ score, size = 64, color = TEAL }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const tone = score >= 85 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--adm-border)" strokeWidth={5} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={tone} strokeWidth={5} fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: tone }}>{score}</span>
      </div>
    </div>
  );
}

export function ProofingPanel({ editor }) {
  const store = useAIStore();
  const [proofLoading, setProofLoading] = useState(false);
  const [plagLoading, setPlagLoading] = useState(false);
  const [proof, setProof] = useState(store.proofreadResult);
  const [plag, setPlag] = useState(store.plagiarismResult);
  const [error, setError] = useState(null);
  const [acceptedIds, setAcceptedIds] = useState(new Set());
  const [rejectedIds, setRejectedIds] = useState(new Set());

  const runProofread = useCallback(async () => {
    if (!editor) return;
    setProofLoading(true); setError(null);
    try {
      const text = editor.getHTML().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!text) throw new Error('Editor is empty');
      const res = await fetch('/api/ai/proofread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, provider: store.provider }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Proofread failed');
      setProof(json.data);
      store.setProofreadResult(json.data);
      setAcceptedIds(new Set());
      setRejectedIds(new Set());
    } catch (e) {
      setError(e.message);
    } finally {
      setProofLoading(false);
    }
  }, [editor, store]);

  const runPlagiarism = useCallback(async () => {
    if (!editor) return;
    setPlagLoading(true); setError(null);
    try {
      const html = editor.getHTML();
      const res = await fetch('/api/ai/plagiarism', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: html, provider: store.provider }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Originality check failed');
      setPlag(json.data);
      store.setPlagiarismResult(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setPlagLoading(false);
    }
  }, [editor, store]);

  const acceptCorrection = (idx, c) => {
    if (!editor) return;
    const html = editor.getHTML();
    if (!c.original) return;
    // Replace first occurrence in the editor's underlying HTML by re-setting content
    const replaced = html.replace(c.original, c.suggestion);
    if (replaced !== html) {
      editor.commands.setContent(replaced, false);
    }
    setAcceptedIds(prev => new Set(prev).add(idx));
  };

  const rejectCorrection = (idx) => {
    setRejectedIds(prev => new Set(prev).add(idx));
  };

  const corrections = proof?.corrections || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg, ${TEAL}, #14b8a6)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>Proofing & Originality</div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>
            Catch errors and check content freshness
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        <button
          onClick={runProofread}
          disabled={proofLoading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px', borderRadius: 9, fontSize: 11, fontWeight: 700,
            border: 'none', background: TEAL, color: '#fff',
            cursor: proofLoading ? 'wait' : 'pointer', opacity: proofLoading ? 0.7 : 1,
          }}
        >
          {proofLoading ? <Loader2 size={12} className="ppspin" /> : <CheckCircle size={12} />}
          Run Proofread
        </button>
        <button
          onClick={runPlagiarism}
          disabled={plagLoading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px', borderRadius: 9, fontSize: 11, fontWeight: 700,
            border: `1px solid ${TEAL_BORDER}`, background: TEAL_LIGHT, color: TEAL,
            cursor: plagLoading ? 'wait' : 'pointer', opacity: plagLoading ? 0.7 : 1,
          }}
        >
          {plagLoading ? <Loader2 size={12} className="ppspin" /> : <Sparkles size={12} />}
          Check Originality
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#ef4444', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </div>
      )}

      {/* Proofread results */}
      <AnimatePresence>
        {proof && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {proof.summary && (
              <div style={{
                padding: '9px 11px', borderRadius: 9, fontSize: 11,
                color: 'var(--adm-text)', background: TEAL_LIGHT, border: `1px solid ${TEAL_BORDER}`,
                lineHeight: 1.55,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <FileText size={11} color={TEAL} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Summary
                  </span>
                </div>
                {proof.summary}
              </div>
            )}

            {corrections.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                  Corrections ({corrections.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {corrections.map((c, i) => {
                    const accepted = acceptedIds.has(i);
                    const rejected = rejectedIds.has(i);
                    return (
                      <div key={i} style={{
                        padding: '8px 10px', borderRadius: 8,
                        border: `1px solid ${accepted ? 'rgba(16,185,129,0.4)' : rejected ? 'var(--adm-border)' : 'var(--adm-border)'}`,
                        background: accepted ? 'rgba(16,185,129,0.06)' : rejected ? 'transparent' : 'var(--adm-surface)',
                        opacity: rejected ? 0.55 : 1,
                      }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                            background: 'var(--adm-hover-bg)', color: 'var(--adm-text-muted)',
                            textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                          }}>
                            {c.type || 'fix'}
                          </span>
                          <div style={{ flex: 1, fontSize: 11, lineHeight: 1.5 }}>
                            <span style={{ textDecoration: 'line-through', color: '#ef4444' }}>{c.original}</span>
                            {' → '}
                            <span style={{ color: '#10b981', fontWeight: 600 }}>{c.suggestion}</span>
                          </div>
                        </div>
                        {c.reason && (
                          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 4, marginLeft: 2 }}>
                            {c.reason}
                          </div>
                        )}
                        {!accepted && !rejected && (
                          <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                            <button
                              onClick={() => acceptCorrection(i, c)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '4px 9px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                                background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer',
                              }}
                            >
                              <Check size={10} /> Accept
                            </button>
                            <button
                              onClick={() => rejectCorrection(i)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '4px 9px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                                background: 'transparent', color: 'var(--adm-text-subtle)',
                                border: '1px solid var(--adm-border)', cursor: 'pointer',
                              }}
                            >
                              <X size={10} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {corrections.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--adm-text-subtle)', padding: '8px 4px', textAlign: 'center' }}>
                No issues found. Clean writing!
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plagiarism / originality results */}
      <AnimatePresence>
        {plag && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '11px 12px', borderRadius: 10,
              border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
              display: 'flex', flexDirection: 'column', gap: 9,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <ScoreRing score={plag.originalityScore} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text)', textTransform: 'capitalize' }}>
                  {plag.status}
                </div>
                <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 2, lineHeight: 1.5 }}>
                  {plag.verdict}
                </div>
              </div>
            </div>

            {/* Uniqueness checklist */}
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

            {/* Generic phrases */}
            {plag.genericPhrases?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  Generic Phrases
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {plag.genericPhrases.map((p, i) => (
                    <span key={i} style={{
                      fontSize: 10, padding: '3px 7px', borderRadius: 5,
                      background: 'rgba(245,158,11,0.10)', color: '#b45309',
                      border: '1px solid rgba(245,158,11,0.3)',
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

      <style>{`
        .ppspin { animation: ppspin 1s linear infinite; }
        @keyframes ppspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default ProofingPanel;

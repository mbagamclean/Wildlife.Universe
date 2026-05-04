'use client';
import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, X, Check, FileText } from 'lucide-react';
import { useAIStore } from '@/lib/stores/aiStore';

const GREEN = '#16a34a';
const GREEN_LIGHT = 'rgba(22,163,74,0.10)';
const GREEN_BORDER = 'rgba(22,163,74,0.28)';

export function ProofingPanel({ editor }) {
  const store = useAIStore();
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState(store.proofreadResult);
  const [error, setError] = useState(null);
  const [acceptedIds, setAcceptedIds] = useState(new Set());
  const [rejectedIds, setRejectedIds] = useState(new Set());

  const run = useCallback(async () => {
    if (!editor) return;
    setLoading(true); setError(null);
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
      setLoading(false);
    }
  }, [editor, store]);

  const acceptCorrection = (idx, c) => {
    if (!editor) return;
    const html = editor.getHTML();
    if (!c.original) return;
    const replaced = html.replace(c.original, c.suggestion);
    if (replaced !== html) editor.commands.setContent(replaced, false);
    setAcceptedIds((prev) => new Set(prev).add(idx));
  };

  const rejectCorrection = (idx) => {
    setRejectedIds((prev) => new Set(prev).add(idx));
  };

  const corrections = proof?.corrections || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg, ${GREEN}, #22c55e)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>Proofreading</div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>
            Catch grammar and style issues with one-click accept
          </div>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        style={{
          padding: '10px', borderRadius: 9, fontSize: 12, fontWeight: 700,
          border: 'none',
          background: loading ? 'var(--adm-hover-bg)' : `linear-gradient(135deg, ${GREEN}, #22c55e)`,
          color: loading ? 'var(--adm-text-muted)' : '#fff',
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
        {loading ? 'Proofreading…' : 'Run Proofread'}
      </button>

      {error && (
        <div style={{ fontSize: 11, color: '#ef4444', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </div>
      )}

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
                color: 'var(--adm-text)', background: GREEN_LIGHT, border: `1px solid ${GREEN_BORDER}`,
                lineHeight: 1.55,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <FileText size={11} color={GREEN} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                        border: `1px solid ${accepted ? 'rgba(16,185,129,0.4)' : 'var(--adm-border)'}`,
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

            {corrections.length === 0 && proof.summary && (
              <div style={{ fontSize: 11, color: 'var(--adm-text-subtle)', padding: '8px 4px', textAlign: 'center' }}>
                No issues found. Clean writing!
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProofingPanel;

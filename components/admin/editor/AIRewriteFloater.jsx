'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Minimize2, Maximize2, Briefcase, MessageSquare, Zap,
  Sparkles, X, Loader2, ArrowDownToLine, Replace,
} from 'lucide-react';
import { useAIStore } from '@/lib/stores/aiStore';

const PURPLE = '#7c3aed';
const PURPLE_LIGHT = 'rgba(124,58,237,0.10)';
const PURPLE_BORDER = 'rgba(124,58,237,0.28)';

const QUICK_MODES = [
  { id: 'fix_grammar', label: 'Fix Grammar', Icon: Check },
  { id: 'shorter',     label: 'Shorter',     Icon: Minimize2 },
  { id: 'expand',      label: 'Expand',      Icon: Maximize2 },
  { id: 'formal',      label: 'Formal',      Icon: Briefcase },
  { id: 'casual',      label: 'Casual',      Icon: MessageSquare },
  { id: 'improve',     label: 'Improve',     Icon: Zap },
];

export function AIRewriteFloater({ editor }) {
  const store = useAIStore();
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [selection, setSelection] = useState(null); // { from, to, text }
  const [loadingMode, setLoadingMode] = useState(null);
  const [result, setResult] = useState(null);       // { mode, text }
  const [alts, setAlts] = useState([]);             // multi-rewrite array
  const [loadingAlts, setLoadingAlts] = useState(false);
  const [error, setError] = useState(null);
  const ref = useRef(null);

  const reset = useCallback(() => {
    setResult(null);
    setAlts([]);
    setError(null);
    setLoadingMode(null);
    setLoadingAlts(false);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    reset();
  }, [reset]);

  // Track selection updates from Tiptap
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || from === to) {
        setVisible(false);
        return;
      }
      const text = editor.state.doc.textBetween(from, to, ' ').trim();
      if (text.length < 5 || text.length > 2000) {
        setVisible(false);
        return;
      }

      try {
        const view = editor.view;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        const top = Math.min(start.top, end.top) + window.scrollY - 12;
        const centerX = (Math.min(start.left, end.left) + Math.max(start.right, end.right)) / 2;
        const floaterW = 440;
        let left = centerX + window.scrollX - floaterW / 2;
        left = Math.max(8, Math.min(left, window.innerWidth + window.scrollX - floaterW - 8));

        setPos({ top, left });
        setSelection({ from, to, text });
        // Don't auto-reset if same selection just refocused
        setVisible(true);
      } catch {
        // ignore coord lookup errors during transient view states
      }
    };

    editor.on('selectionUpdate', onUpdate);
    return () => { editor.off('selectionUpdate', onUpdate); };
  }, [editor]);

  // Escape to close, click-outside to close
  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => { if (e.key === 'Escape') hide(); };
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        hide();
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [visible, hide]);

  const callRewrite = useCallback(async (mode) => {
    if (!selection?.text) return;
    setLoadingMode(mode);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selection.text, style: mode, provider: store.provider, model: store.getCurrentTextModel() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Rewrite failed');
      const text = json.data?.result || '';
      setResult({ mode, text });
      store.setRewriteResult({ result: text });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMode(null);
    }
  }, [selection, store]);

  const callMultiRewrite = useCallback(async () => {
    if (!selection?.text) return;
    setLoadingAlts(true);
    setError(null);
    setAlts([]);
    try {
      const res = await fetch('/api/ai/multi-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selection.text, count: 3, provider: store.provider, model: store.getCurrentTextModel() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Alternatives failed');
      setAlts(json.data?.rewrites || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingAlts(false);
    }
  }, [selection, store.provider]);

  const applyText = useCallback((text, mode = 'replace') => {
    if (!editor || !selection || !text) return;
    if (mode === 'replace') {
      editor.chain().focus().deleteRange({ from: selection.from, to: selection.to }).insertContent(text).run();
    } else {
      // insert below selection
      editor.chain().focus().setTextSelection(selection.to).insertContent(`<p>${text}</p>`).run();
    }
    hide();
  }, [editor, selection, hide]);

  if (!editor) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.14 }}
          style={{
            position: 'absolute',
            top: pos.top - 8,
            left: pos.left,
            transform: 'translateY(-100%)',
            zIndex: 50,
            width: 440,
            background: 'var(--adm-surface)',
            border: `1px solid ${PURPLE_BORDER}`,
            borderRadius: 12,
            boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
            padding: 10,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
            <Sparkles size={13} color={PURPLE} />
            <span style={{ fontSize: 11, fontWeight: 700, color: PURPLE, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              AI Rewrite
            </span>
            <span style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginLeft: 4 }}>
              {selection?.text?.length || 0} chars selected
            </span>
            <button
              onClick={hide}
              style={{
                marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--adm-text-subtle)', padding: 2, display: 'flex',
              }}
              aria-label="Close"
            >
              <X size={13} />
            </button>
          </div>

          {/* Quick modes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
            {QUICK_MODES.map(({ id, label, Icon }) => {
              const loading = loadingMode === id;
              const active = result?.mode === id;
              return (
                <button
                  key={id}
                  onClick={() => callRewrite(id)}
                  disabled={loadingMode !== null}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '7px 8px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${active ? PURPLE : 'var(--adm-border)'}`,
                    background: active ? PURPLE_LIGHT : 'transparent',
                    color: active ? PURPLE : 'var(--adm-text)',
                    cursor: loadingMode === null ? 'pointer' : 'wait',
                    opacity: loadingMode !== null && !loading ? 0.5 : 1,
                  }}
                >
                  {loading ? <Loader2 size={11} className="anim-spin" /> : <Icon size={11} />}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Result preview */}
          {result && (
            <div style={{ marginTop: 10, padding: 9, borderRadius: 8, border: `1px solid ${PURPLE_BORDER}`, background: PURPLE_LIGHT }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: PURPLE, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Result
              </div>
              <div style={{
                fontSize: 12, color: 'var(--adm-text)', lineHeight: 1.55,
                maxHeight: 130, overflowY: 'auto',
                padding: '6px 8px', background: 'var(--adm-bg)', borderRadius: 6,
              }}>
                {result.text}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                <button
                  onClick={() => applyText(result.text, 'replace')}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: PURPLE, color: '#fff', border: 'none', cursor: 'pointer',
                  }}
                >
                  <Replace size={11} /> Replace
                </button>
                <button
                  onClick={() => applyText(result.text, 'below')}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: 'transparent', color: PURPLE, border: `1px solid ${PURPLE_BORDER}`, cursor: 'pointer',
                  }}
                >
                  <ArrowDownToLine size={11} /> Insert below
                </button>
              </div>
            </div>
          )}

          {/* Alternatives section */}
          <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--adm-border)' }}>
            <button
              onClick={callMultiRewrite}
              disabled={loadingAlts}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: 'transparent', color: 'var(--adm-text)',
                border: '1px solid var(--adm-border)', cursor: loadingAlts ? 'wait' : 'pointer',
              }}
            >
              {loadingAlts ? <Loader2 size={11} className="anim-spin" /> : <Sparkles size={11} />}
              {loadingAlts ? 'Generating alternatives…' : 'Generate alternatives (3)'}
            </button>

            {alts.length > 0 && (
              <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => applyText(a.text, 'replace')}
                    style={{
                      textAlign: 'left', padding: '7px 9px', borderRadius: 7,
                      border: '1px solid var(--adm-border)', background: 'var(--adm-bg)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3,
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {a.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.5 }}>
                      {a.text.length > 220 ? a.text.slice(0, 220) + '…' : a.text}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 9, fontSize: 11, color: '#ef4444' }}>
              {error}
            </div>
          )}

          <style>{`
            .anim-spin { animation: rfspin 1s linear infinite; }
            @keyframes rfspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AIRewriteFloater;

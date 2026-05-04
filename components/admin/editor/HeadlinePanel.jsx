'use client';
import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Loader2, TrendingUp, FileText, Tag, Check, ArrowUpRight,
} from 'lucide-react';
import { categories } from '@/lib/mock/categories';
import { useAIStore } from '@/lib/stores/aiStore';

const AMBER = '#d97706';
const AMBER_LIGHT = 'rgba(217,119,6,0.10)';
const AMBER_BORDER = 'rgba(217,119,6,0.28)';

const TYPE_COLORS = {
  'How-To':           { bg: 'rgba(124,58,237,0.10)', fg: '#7c3aed', border: 'rgba(124,58,237,0.3)' },
  'Listicle':         { bg: 'rgba(59,130,246,0.10)', fg: '#2563eb', border: 'rgba(59,130,246,0.3)' },
  'Ultimate Guide':   { bg: 'rgba(245,158,11,0.10)', fg: '#b45309', border: 'rgba(245,158,11,0.3)' },
  'Question':         { bg: 'rgba(16,185,129,0.10)', fg: '#059669', border: 'rgba(16,185,129,0.3)' },
  'Comparison':       { bg: 'rgba(236,72,153,0.10)', fg: '#db2777', border: 'rgba(236,72,153,0.3)' },
  'Problem-Solution': { bg: 'rgba(239,68,68,0.10)',  fg: '#dc2626', border: 'rgba(239,68,68,0.3)' },
};

const VOLUME_COLORS = {
  'Very High': '#10b981',
  'High':      '#22c55e',
  'Medium':    '#d97706',
};

export function HeadlinePanel({ initialTopic = '', initialCategory = '', onUseHeadline }) {
  const store = useAIStore();
  const [topic, setTopic] = useState(initialTopic);
  const [category, setCategory] = useState(initialCategory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [headlines, setHeadlines] = useState(store.headlineResults);
  const [usedIdx, setUsedIdx] = useState(null);

  const generate = useCallback(async () => {
    if (!topic.trim()) {
      setError('Topic is required');
      return;
    }
    setLoading(true); setError(null); setUsedIdx(null);
    try {
      const res = await fetch('/api/ai/headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, category, count: 8, provider: store.provider, model: store.getCurrentTextModel() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Headline generation failed');
      const list = json.data?.headlines || [];
      setHeadlines(list);
      store.setHeadlineResults(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [topic, category, store]);

  const handleUse = (idx, h) => {
    setUsedIdx(idx);
    onUseHeadline?.(h.headline);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg, ${AMBER}, #f59e0b)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TrendingUp size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>Headline Generator</div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>
            8 SEO-optimized headlines per topic
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Topic (e.g. African elephants in Tarangire)"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 10px', borderRadius: 8, fontSize: 12,
            border: '1px solid var(--adm-border)', background: 'var(--adm-bg)',
            color: 'var(--adm-text)', outline: 'none',
          }}
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 10px', borderRadius: 8, fontSize: 12,
            border: '1px solid var(--adm-border)', background: 'var(--adm-bg)',
            color: 'var(--adm-text)', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c.slug} value={c.name}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={loading || !topic.trim()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px', borderRadius: 9, fontSize: 12, fontWeight: 700,
            border: 'none',
            background: loading ? 'var(--adm-hover-bg)' : `linear-gradient(135deg, ${AMBER}, #f59e0b)`,
            color: loading ? 'var(--adm-text-muted)' : '#fff',
            cursor: loading ? 'wait' : (!topic.trim() ? 'not-allowed' : 'pointer'),
            opacity: !topic.trim() ? 0.6 : 1,
          }}
        >
          {loading ? <Loader2 size={12} className="hpspin" /> : <Sparkles size={12} />}
          {loading ? 'Generating…' : 'Generate 8 Headlines'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#ef4444', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {headlines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 7 }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {headlines.length} Headlines
            </div>
            {headlines.map((h, i) => {
              const tColor = TYPE_COLORS[h.type] || TYPE_COLORS['How-To'];
              const vColor = VOLUME_COLORS[h.searchVolume] || AMBER;
              const used = usedIdx === i;
              return (
                <div key={i} style={{
                  padding: '9px 10px', borderRadius: 9,
                  border: `1px solid ${used ? AMBER_BORDER : 'var(--adm-border)'}`,
                  background: used ? AMBER_LIGHT : 'var(--adm-surface)',
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--adm-text)',
                    lineHeight: 1.45, marginBottom: 7,
                  }}>
                    {h.headline}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                    <span style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                      background: tColor.bg, color: tColor.fg, border: `1px solid ${tColor.border}`,
                    }}>
                      {h.type}
                    </span>
                    <span style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                      background: 'transparent', color: vColor, border: `1px solid ${vColor}`,
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}>
                      <TrendingUp size={9} /> {h.searchVolume}
                    </span>
                    <span style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                      background: 'var(--adm-hover-bg)', color: 'var(--adm-text-muted)',
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}>
                      <FileText size={9} /> ~{h.estimatedWordCount.toLocaleString()} words
                    </span>
                    {h.primaryKeyword && (
                      <span style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                        background: 'transparent', color: 'var(--adm-text-subtle)',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        border: '1px solid var(--adm-border)',
                      }}>
                        <Tag size={9} /> {h.primaryKeyword}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleUse(i, h)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: used ? '#10b981' : AMBER, color: '#fff', border: 'none', cursor: 'pointer',
                    }}
                  >
                    {used ? <><Check size={11} /> Used as title</> : <><ArrowUpRight size={11} /> Use as title</>}
                  </button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .hpspin { animation: hpspin 1s linear infinite; }
        @keyframes hpspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default HeadlinePanel;

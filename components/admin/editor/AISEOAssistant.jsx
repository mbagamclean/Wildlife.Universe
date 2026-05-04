'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '@/lib/stores/aiStore';
import { SITE_URL } from '@/lib/seo';

const GREEN = '#059669';
const GREEN_LIGHT = 'rgba(5,150,105,0.08)';
const GREEN_BORDER = 'rgba(5,150,105,0.25)';

const FIELD_META = [
  { key: 'seoTitle',        label: 'SEO Title',        icon: '📄', dot: '#3b82f6', hint: '50–60 chars with primary keyword' },
  { key: 'metaDescription', label: 'Meta Description', icon: '🔍', dot: GREEN,    hint: '150–160 chars, click-optimized' },
  { key: 'keywords',        label: 'Keywords',          icon: '🏷', dot: '#f59e0b', hint: '5–15 primary + long-tail terms' },
  { key: 'seoExcerpt',      label: 'Excerpt',           icon: '📄', dot: GREEN,    hint: '2–3 natural human-written sentences' },
];

function FieldCard({ fieldKey, label, icon, dot, hint, value, loading, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const filled = !!value;

  return (
    <div style={{
      borderRadius: 10, border: `1px solid ${filled ? GREEN_BORDER : 'var(--adm-border)'}`,
      background: filled ? GREEN_LIGHT : 'var(--adm-surface)',
      overflow: 'hidden', transition: 'all 0.2s',
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: loading ? '#f59e0b' : (filled ? dot : 'var(--adm-border)'), flexShrink: 0 }} />
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--adm-text)', flex: 1 }}>{label}</span>
        {filled && (
          <span style={{ fontSize: 10, color: GREEN, fontWeight: 600 }}>✓ Set</span>
        )}
        <span style={{ fontSize: 9, color: 'var(--adm-text-subtle)', transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s', display: 'inline-block' }}>▾</span>
      </button>

      <div style={{
        padding: '0 12px',
        maxHeight: expanded ? 200 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.25s ease',
      }}>
        <div style={{ paddingBottom: 10 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 0' }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
                style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN }}
              />
              <span style={{ fontSize: 11, color: GREEN }}>Generating…</span>
            </div>
          ) : value ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--adm-text)', lineHeight: 1.55, marginBottom: 7 }}>{value}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>
                  {value.length} chars — {hint}
                </span>
                <button
                  onClick={() => onEdit(fieldKey)}
                  style={{ fontSize: 10, color: GREEN, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  ✎ Edit
                </button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--adm-text-subtle)', fontStyle: 'italic', padding: '4px 0 6px' }}>
              Not yet generated — {hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SerpPreview({ seoTitle, metaDescription, slug }) {
  // Pull the canonical host from SITE_URL so this matches the live site.
  let host;
  try { host = new URL(SITE_URL).host; }
  catch { host = 'www.wildlifeuniverse.org'; }
  const url = `${host} › posts › ${slug || 'article-slug'}`;
  return (
    <div style={{ padding: '11px 13px', borderRadius: 9, background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
        Google SERP Preview
      </div>
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>{url}</div>
      <div style={{ fontSize: 16, color: '#1a0dab', fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
        {seoTitle || 'SEO Title will appear here'}
      </div>
      <div style={{ fontSize: 12, color: '#545454', lineHeight: 1.5 }}>
        {metaDescription || 'Meta description will appear here once generated.'}
      </div>
    </div>
  );
}

export function AISEOAssistant({ title, editor, slug, onFieldsInserted }) {
  const store = useAIStore();
  const [tab, setTab] = useState('Generate'); // Generate | Analyze
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const generate = useCallback(async () => {
    if (store.isGeneratingSEO) return;
    store.setIsGeneratingSEO(true);
    store.clearSEO();

    try {
      const body = editor?.getHTML() || '';
      const res = await fetch('/api/ai/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, provider: store.provider, model: store.getCurrentTextModel(), task: 'generate' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const { data } = json;

      store.setAllSEOFields({
        seoTitle: data.seoTitle || '',
        metaDescription: data.metaDescription || '',
        keywords: data.keywords || '',
        seoExcerpt: data.excerpt || '',
      });

      // Auto-insert into PostEditor fields
      onFieldsInserted?.({
        metaTitle: data.seoTitle,
        metaDesc: data.metaDescription,
        metaKw: data.keywords,
        excerpt: data.excerpt,
      });
    } catch (err) {
      console.error('[SEO]', err);
    } finally {
      store.setIsGeneratingSEO(false);
    }
  }, [editor, title, store, onFieldsInserted]);

  const analyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      const body = editor?.getHTML() || '';
      const res = await fetch('/api/ai/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, provider: store.provider, model: store.getCurrentTextModel(), task: 'analyze' }),
      });
      const json = await res.json();
      if (json.success) setAnalysis(json.data);
    } catch (err) {
      console.error('[SEO Analyze]', err);
    } finally {
      setAnalyzing(false);
    }
  }, [editor, title, store.provider]);

  const startEdit = (field) => {
    const vals = { seoTitle: store.seoTitle, metaDescription: store.metaDescription, keywords: store.keywords, seoExcerpt: store.seoExcerpt };
    setEditValue(vals[field] || '');
    setEditing(field);
  };

  const commitEdit = () => {
    if (editing) {
      store.setSEOField(editing, editValue);
      if (editing === 'seoTitle') onFieldsInserted?.({ metaTitle: editValue });
      else if (editing === 'metaDescription') onFieldsInserted?.({ metaDesc: editValue });
      else if (editing === 'keywords') onFieldsInserted?.({ metaKw: editValue });
      else if (editing === 'seoExcerpt') onFieldsInserted?.({ excerpt: editValue });
      setEditing(null);
    }
  };

  const anyGenerated = !!(store.seoTitle || store.metaDescription || store.keywords || store.seoExcerpt);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${GREEN}, #34d399)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>📈</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>AI SEO Assistant</div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>Auto-generate titles, descriptions, keywords & excerpt</div>
        </div>
        <div style={{
          padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 700,
          background: GREEN, color: '#fff',
        }}>
          {store.provider === 'openai' ? 'OpenAI' : 'Claude'}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--adm-border)', marginBottom: 12 }}>
        {['Generate', 'Analyze'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 8px', fontSize: 11, fontWeight: 700, border: 'none', background: 'transparent',
            color: tab === t ? GREEN : 'var(--adm-text-subtle)',
            borderBottom: tab === t ? `2px solid ${GREEN}` : '2px solid transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            {t === 'Generate' ? '⚡' : '📊'} {t}
          </button>
        ))}
      </div>

      {tab === 'Generate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--adm-text-subtle)', lineHeight: 1.55 }}>
            Generates SEO title, meta description, keywords, and excerpt from your full article.
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={store.isGeneratingSEO}
            style={{
              padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', background: store.isGeneratingSEO ? 'var(--adm-hover-bg)' : GREEN,
              color: store.isGeneratingSEO ? 'var(--adm-text-muted)' : '#fff',
              cursor: store.isGeneratingSEO ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
          >
            {store.isGeneratingSEO ? (
              <>
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}>⟳</motion.span>
                Generating SEO Fields…
              </>
            ) : (
              <><span>✦</span> Generate All SEO Fields</>
            )}
          </button>

          {/* Field cards */}
          {FIELD_META.map(f => (
            <FieldCard
              key={f.key}
              fieldKey={f.key}
              label={f.label}
              icon={f.icon}
              dot={f.dot}
              hint={f.hint}
              value={store[f.key]}
              loading={store.isGeneratingSEO && !store[f.key]}
              onEdit={startEdit}
            />
          ))}

          {/* Edit modal */}
          <AnimatePresence>
            {editing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 9999, padding: 20,
                }}
                onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  style={{
                    background: 'var(--adm-surface)', borderRadius: 12,
                    border: '1px solid var(--adm-border)', padding: 20, width: '100%', maxWidth: 420,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--adm-text)', marginBottom: 10 }}>
                    Edit {FIELD_META.find(f => f.key === editing)?.label}
                  </div>
                  <textarea
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    rows={4}
                    autoFocus
                    style={{
                      width: '100%', borderRadius: 8, border: `1px solid ${GREEN_BORDER}`,
                      background: 'var(--adm-bg)', color: 'var(--adm-text)',
                      padding: '8px 10px', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditing(null)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    <button onClick={commitEdit} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: GREEN, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Save</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Insert All button */}
          <AnimatePresence>
            {anyGenerated && (
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onFieldsInserted?.({
                  metaTitle: store.seoTitle,
                  metaDesc: store.metaDescription,
                  metaKw: store.keywords,
                  excerpt: store.seoExcerpt,
                })}
                style={{
                  padding: '8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  border: `1px solid ${GREEN_BORDER}`, background: GREEN_LIGHT,
                  color: GREEN, cursor: 'pointer', width: '100%',
                }}
              >
                ✓ Insert All Fields Into Editor
              </motion.button>
            )}
          </AnimatePresence>

          {/* AdSense rules box */}
          <div style={{
            padding: '10px 12px', borderRadius: 9,
            border: `1px solid ${GREEN_BORDER}`, background: GREEN_LIGHT,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, marginBottom: 7 }}>AdSense Rules Applied</div>
            {[
              'Title: 50–60 chars with primary keyword',
              'Description: 150–160 chars, click-optimized',
              'Keywords: 5–15 primary + long-tail terms',
              'Excerpt: 2–3 sentences, human-written tone',
            ].map(r => (
              <div key={r} style={{ fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.7 }}>• {r}</div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Analyze' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={analyze}
            disabled={analyzing}
            style={{
              padding: '10px', borderRadius: 9, fontSize: 12, fontWeight: 700,
              background: GREEN, color: '#fff', border: 'none',
              cursor: analyzing ? 'wait' : 'pointer', opacity: analyzing ? 0.7 : 1,
            }}
          >
            {analyzing ? '⟳ Analyzing…' : '📊 Run SEO Analysis'}
          </button>

          <SerpPreview seoTitle={store.seoTitle} metaDescription={store.metaDescription} slug={slug} />

          {analysis && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Primary Keyword', value: analysis.primaryKeyword },
                { label: 'Keyword Density', value: `${analysis.keywordDensity?.toFixed(2)}%` },
                { label: 'Readability', value: `${analysis.readabilityScore}/100` },
                { label: 'EEAT Score', value: `${analysis.eeatScore}/100` },
                { label: 'Heading Structure', value: analysis.headingStructure },
                { label: 'Word Count', value: analysis.wordCount },
              ].map(({ label, value }) => value && (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '6px 10px', borderRadius: 7, background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
                  <span style={{ color: 'var(--adm-text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--adm-text)' }}>{value}</span>
                </div>
              ))}
              {analysis.recommendations?.length > 0 && (
                <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', marginBottom: 6 }}>Recommendations</div>
                  {analysis.recommendations.map((r, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.55, marginBottom: 4 }}>• {r}</div>
                  ))}
                </div>
              )}
              {analysis.lsiKeywords?.length > 0 && (
                <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', marginBottom: 6 }}>LSI Keywords</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {analysis.lsiKeywords.map((k) => (
                      <span key={k} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: GREEN_LIGHT, color: GREEN, border: `1px solid ${GREEN_BORDER}` }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

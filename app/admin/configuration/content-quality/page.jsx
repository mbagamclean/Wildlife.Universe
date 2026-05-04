'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, FileText, Image as ImageIcon, Hash, Clock, Filter, X, Sparkles,
  Loader2, AlertCircle, Lightbulb, ThumbsUp,
} from 'lucide-react';
import { db } from '@/lib/storage/db';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';

function plainText(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function calcQuality(post) {
  const text = plainText(post.body);
  const words = text.split(/\s+/).filter(Boolean).length;
  const h2s   = (post.body || '').match(/<h2/gi)?.length || 0;

  let score = 0;
  // Word band
  if (words >= 4000) score += 30;
  else if (words >= 2500) score += 25;
  else if (words >= 1500) score += 18;
  else if (words >= 800)  score += 10;
  else if (words >= 300)  score += 4;
  // Cover
  if (post.cover) score += 15;
  // Headings
  if (h2s >= 6) score += 18;
  else if (h2s >= 3) score += 12;
  else if (h2s >= 1) score += 5;
  // Tags
  if (Array.isArray(post.tags) ? post.tags.length >= 3 : (post.tags || '').split(',').filter(Boolean).length >= 3) score += 10;
  // Excerpt
  if ((post.excerpt || '').trim().length >= 80) score += 12;
  // Meta description (description field)
  if ((post.description || '').trim().length >= 80) score += 15;

  return { score: Math.max(0, Math.min(100, score)), words, h2s };
}

const FILTERS = [
  { key: 'all',   label: 'All posts' },
  { key: 'low',   label: 'Below 60' },
  { key: 'high',  label: '80 and above' },
];

function readingTime(words) {
  return Math.max(1, Math.round(words / 220));
}

function ScoreBadge({ score }) {
  const color = score >= 80 ? '#008000' : score >= 60 ? '#d4af37' : '#c0392b';
  return (
    <span className="inline-flex h-7 min-w-[36px] items-center justify-center rounded-lg px-2 text-[12px] font-black" style={{ background: `${color}18`, color }}>
      {score}
    </span>
  );
}

export default function ContentQualityPage() {
  const [posts, setPosts]     = useState([]);
  const [loaded, setLoaded]   = useState(false);
  const [filter, setFilter]   = useState('all');
  const [active, setActive]   = useState(null); // active post for modal
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState('');
  const [provider, setProvider]   = useState('claude');

  useEffect(() => {
    db.posts.list().then((p) => {
      setPosts(p);
      setLoaded(true);
    });
  }, []);

  const enriched = useMemo(
    () => posts.map((p) => ({ ...p, _q: calcQuality(p) })),
    [posts]
  );

  const filtered = useMemo(() => {
    if (filter === 'low')  return enriched.filter((p) => p._q.score < 60);
    if (filter === 'high') return enriched.filter((p) => p._q.score >= 80);
    return enriched;
  }, [enriched, filter]);

  const counts = useMemo(() => ({
    all:  enriched.length,
    low:  enriched.filter((p) => p._q.score < 60).length,
    high: enriched.filter((p) => p._q.score >= 80).length,
  }), [enriched]);

  const openPost = (p) => {
    setActive(p);
    setAiResult(null);
    setAiError('');
  };

  const closeModal = () => {
    setActive(null);
    setAiResult(null);
    setAiError('');
    setAiLoading(false);
  };

  const runAI = async () => {
    if (!active) return;
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const res = await fetch('/api/ai/content-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: active.title,
          content: active.body || '',
          excerpt: active.excerpt || '',
          provider,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'AI analysis failed');
      setAiResult(json.data);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-5 sm:p-8">
      <AIPageHeader
        eyebrow="CONFIGURATION"
        title="Content Quality"
        description="Heuristic quality dashboard for every post, with optional AI deep-dive analysis."
        icon={CheckCircle2}
        accent="#008000"
      />

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4" style={{ color: 'var(--adm-text-subtle)' }} />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
            style={filter === f.key
              ? { background: '#008000', color: '#fff' }
              : { background: 'var(--adm-surface)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }
            }
          >
            {f.label}
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={filter === f.key
              ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
              : { background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)' }
            }>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)', overflow: 'hidden' }}>
        {!loaded ? (
          <p className="p-8 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>Loading posts…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>No posts match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'var(--adm-surface-2)' }}>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-3 py-3">Words</th>
                  <th className="px-3 py-3">Cover</th>
                  <th className="px-3 py-3">H2s</th>
                  <th className="px-3 py-3">Reading</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => openPost(p)}
                    className="cursor-pointer transition-colors hover:bg-[var(--adm-hover-bg)]"
                    style={i < filtered.length - 1 ? { borderBottom: '1px solid var(--adm-border)' } : {}}
                  >
                    <td className="max-w-[360px] truncate px-4 py-3 text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>
                      {p.title}
                    </td>
                    <td className="px-3 py-3 text-[12px]" style={{ color: 'var(--adm-text-muted)' }}>{p._q.words}</td>
                    <td className="px-3 py-3">
                      {p.cover
                        ? <ImageIcon className="h-4 w-4" style={{ color: '#008000' }} />
                        : <X className="h-4 w-4" style={{ color: '#c0392b' }} />}
                    </td>
                    <td className="px-3 py-3 text-[12px]" style={{ color: 'var(--adm-text-muted)' }}>{p._q.h2s}</td>
                    <td className="px-3 py-3 text-[12px]" style={{ color: 'var(--adm-text-muted)' }}>{readingTime(p._q.words)} min</td>
                    <td className="px-3 py-3"><ScoreBadge score={p._q.score} /></td>
                    <td className="px-3 py-3 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {active && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={closeModal}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
            style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--adm-border)' }}>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: '#00800018' }}>
                <FileText className="h-5 w-5" style={{ color: '#008000' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Quality detail</p>
                <h2 className="truncate text-base font-bold" style={{ color: 'var(--adm-text)' }}>{active.title}</h2>
              </div>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Words"   value={active._q.words}        icon={FileText} />
                <Stat label="H2s"     value={active._q.h2s}          icon={Hash} />
                <Stat label="Reading" value={`${readingTime(active._q.words)} min`} icon={Clock} />
                <Stat label="Heuristic score" value={active._q.score} icon={CheckCircle2} accent={active._q.score >= 80 ? '#008000' : active._q.score >= 60 ? '#d4af37' : '#c0392b'} />
              </div>

              <div className="mb-3 flex items-center gap-2">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
                >
                  <option value="claude">Claude</option>
                  <option value="openai">OpenAI</option>
                </select>
                <button
                  onClick={runAI}
                  disabled={aiLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#008000] px-5 py-2 text-sm font-bold text-white transition-all hover:bg-[#006400] disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {aiLoading ? 'Analysing…' : aiResult ? 'Re-run AI analysis' : 'Run AI quality analysis'}
                </button>
              </div>

              {aiError && (
                <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: '#fde2e2', color: '#7a1f1f', border: '1px solid #f5b7b7' }}>
                  <AlertCircle className="h-4 w-4" />
                  {aiError}
                </div>
              )}

              {aiResult && (
                <div className="space-y-4">
                  <div className="rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>AI overall score</p>
                      <ScoreBadge score={aiResult.score} />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                      {Object.entries(aiResult.dimensions).map(([k, v]) => (
                        <div key={k} className="rounded-lg p-2" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
                          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>{k}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full" style={{ background: 'var(--adm-surface-3)' }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${v}%`,
                                  background: v >= 80 ? '#008000' : v >= 60 ? '#d4af37' : '#c0392b',
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-bold" style={{ color: 'var(--adm-text)' }}>{v}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {aiResult.strengths.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
                      <div className="mb-2 flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4" style={{ color: '#008000' }} />
                        <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Strengths</p>
                      </div>
                      <ul className="space-y-1.5">
                        {aiResult.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--adm-text)' }}>
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#008000' }} />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiResult.recommendations.length > 0 && (
                    <div className="rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
                      <div className="mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" style={{ color: '#d4af37' }} />
                        <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Recommendations</p>
                      </div>
                      <ul className="space-y-1.5">
                        {aiResult.recommendations.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--adm-text)' }}>
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#d4af37' }} />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent = '#d4af37' }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>{label}</p>
      </div>
      <p className="text-lg font-black" style={{ color: 'var(--adm-text)' }}>{value}</p>
    </div>
  );
}

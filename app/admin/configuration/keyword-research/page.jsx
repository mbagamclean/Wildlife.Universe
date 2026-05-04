'use client';

import { useState } from 'react';
import {
  Search, Loader2, Sparkles, AlertCircle, HelpCircle, Tag, Lightbulb, Target,
} from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';

const CATEGORIES = [
  '', 'Birds', 'Mammals', 'Reptiles', 'Marine Life', 'Insects',
  'Conservation', 'Safari & Travel', 'Photography', 'Habitat', 'Behaviour',
];

const BUCKET_COLORS = {
  'Low':       { bg: '#f0f0f0', fg: '#666666' },
  'Medium':    { bg: '#e6f0ff', fg: '#1a6eb5' },
  'High':      { bg: '#e6f7e6', fg: '#008000' },
  'Very High': { bg: '#fff3cd', fg: '#a37500' },
};

function Bucket({ value }) {
  const c = BUCKET_COLORS[value] || BUCKET_COLORS.Medium;
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: c.bg, color: c.fg }}>
      {value}
    </span>
  );
}

export default function KeywordResearchPage() {
  const [seed, setSeed]         = useState('');
  const [category, setCategory] = useState('');
  const [provider, setProvider] = useState('claude');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  const run = async () => {
    if (!seed.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/ai/keyword-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed, category, provider }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to research');
      setResult(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 sm:p-8">
      <AIPageHeader
        eyebrow="AI TOOLS"
        title="Keyword Research"
        description="AI-estimated keyword opportunities. Volume and difficulty are qualitative buckets, not scraped data."
        icon={Search}
        accent="#008000"
      />

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_140px_auto]">
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="Seed keyword (e.g. African elephants behaviour)"
          className="rounded-2xl px-4 py-3 text-sm focus:outline-none"
          style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)', boxShadow: 'var(--adm-shadow)' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#008000'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-2xl px-3 py-3 text-sm font-semibold focus:outline-none"
          style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)', boxShadow: 'var(--adm-shadow)' }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c || 'Any category'}</option>
          ))}
        </select>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded-2xl px-3 py-3 text-sm font-semibold focus:outline-none"
          style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)', boxShadow: 'var(--adm-shadow)' }}
        >
          <option value="claude">Claude</option>
          <option value="openai">OpenAI</option>
        </select>
        <button
          onClick={run}
          disabled={!seed.trim() || loading}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#008000] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#006400] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Researching…' : 'Research'}
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: '#fde2e2', color: '#7a1f1f', border: '1px solid #f5b7b7' }}>
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Primary keyword */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, #008000 0%, #006400 100%)', boxShadow: '0 4px 20px rgba(0,128,0,0.25)' }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-white/80" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Primary keyword</p>
            </div>
            <p className="text-xl font-black text-white">{result.primary.keyword}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {result.primary.intent}
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Volume · {result.primary.volume}
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Difficulty · {result.primary.difficulty}
              </span>
            </div>
          </div>

          {/* Content angles */}
          <div
            className="rounded-2xl p-5 lg:col-span-2"
            style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" style={{ color: '#d4af37' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Content angles</p>
            </div>
            {result.contentAngles.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--adm-text-subtle)' }}>None suggested.</p>
            ) : (
              <ol className="space-y-2">
                {result.contentAngles.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-[13px]" style={{ color: 'var(--adm-text)' }}>
                    <span
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: '#d4af3725', color: '#a37500' }}
                    >
                      {i + 1}
                    </span>
                    {a}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Related keywords table */}
          <div
            className="rounded-2xl p-5 lg:col-span-2"
            style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}
          >
            <p className="mb-3 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>
              Related keywords ({result.related.length})
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>
                    <th className="pb-2">Keyword</th>
                    <th className="pb-2">Intent</th>
                    <th className="pb-2">Volume</th>
                    <th className="pb-2">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {result.related.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--adm-border)' }}>
                      <td className="py-2 text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{r.keyword}</td>
                      <td className="py-2 text-[12px]" style={{ color: 'var(--adm-text-muted)' }}>{r.intent}</td>
                      <td className="py-2"><Bucket value={r.volume} /></td>
                      <td className="py-2"><Bucket value={r.difficulty} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* People also ask */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
            <div className="mb-3 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" style={{ color: '#6b9fdb' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>People also ask</p>
            </div>
            {result.questions.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--adm-text-subtle)' }}>No questions suggested.</p>
            ) : (
              <ul className="space-y-2">
                {result.questions.map((q, i) => (
                  <li key={i} className="text-[13px]" style={{ color: 'var(--adm-text)' }}>{q}</li>
                ))}
              </ul>
            )}
          </div>

          {/* LSI tag cloud */}
          <div className="rounded-2xl p-5 lg:col-span-3" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
            <div className="mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" style={{ color: '#008000' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>LSI / semantic terms</p>
            </div>
            {result.lsiKeywords.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--adm-text-subtle)' }}>None suggested.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.lsiKeywords.map((k, i) => (
                  <span
                    key={i}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Compass, Loader2, Sparkles, AlertCircle, CheckCircle2, XCircle, Lightbulb,
} from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';
import { PostPicker } from '@/components/admin/configuration/PostPicker';

const GRADE_COLOR = {
  'A+': '#008000', 'A': '#008000',
  'B':  '#5da039',
  'C':  '#d4af37',
  'D':  '#d97706',
  'F':  '#c0392b',
};

function ScoreRing({ score, grade }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circ;
  const color = GRADE_COLOR[grade] || '#008000';
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle cx="64" cy="64" r={radius} stroke="var(--adm-border)" strokeWidth="10" fill="none" />
        <circle
          cx="64" cy="64" r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black" style={{ color: 'var(--adm-text)' }}>{score}</span>
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>Grade {grade}</span>
      </div>
    </div>
  );
}

export default function DiscoverScorePage() {
  const [post, setPost]         = useState(null);
  const [provider, setProvider] = useState('claude');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  const run = async () => {
    if (!post) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/ai/discover-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title,
          content: post.body || '',
          cover: post.cover || '',
          provider,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to score');
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
        title="Google Discover Score"
        description="Score how likely a post is to surface in the Google Discover feed."
        icon={Compass}
        accent="#6b9fdb"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
        <PostPicker value={post} onChange={(p) => { setPost(p); setResult(null); setError(''); }} />

        <div className="flex items-end gap-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-xl px-3 py-3 text-sm font-semibold focus:outline-none"
            style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
          >
            <option value="claude">Claude</option>
            <option value="openai">OpenAI</option>
          </select>
          <button
            onClick={run}
            disabled={!post || loading}
            className="flex items-center gap-2 rounded-2xl bg-[#6b9fdb] px-5 py-3 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Scoring…' : 'Score post'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: '#fde2e2', color: '#7a1f1f', border: '1px solid #f5b7b7' }}>
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
          <div
            className="flex flex-col items-center gap-3 rounded-2xl p-5"
            style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}
          >
            <ScoreRing score={result.score} grade={result.grade} />
            <p className="text-center text-[13px] font-medium" style={{ color: 'var(--adm-text-muted)' }}>
              {result.verdict}
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
            <p className="mb-3 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Criteria breakdown</p>
            <div className="space-y-2">
              {result.criteria.map((c, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}
                >
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full" style={{ background: c.met ? '#00800018' : '#c0392b18' }}>
                    {c.met
                      ? <CheckCircle2 className="h-4 w-4" style={{ color: '#008000' }} />
                      : <XCircle className="h-4 w-4" style={{ color: '#c0392b' }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{c.name}</p>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--adm-surface-3)', color: 'var(--adm-text-muted)' }}>
                        {c.weight}
                      </span>
                    </div>
                    {c.comment && (
                      <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-text-muted)' }}>{c.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {result && result.improvements.length > 0 && (
        <div className="mt-4 rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" style={{ color: '#d4af37' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>How to score higher</p>
          </div>
          <ul className="space-y-2">
            {result.improvements.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--adm-text)' }}>
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#d4af37' }} />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

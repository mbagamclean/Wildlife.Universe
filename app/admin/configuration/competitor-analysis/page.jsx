'use client';

import { useState } from 'react';
import {
  Swords, Loader2, Sparkles, AlertCircle, ThumbsUp, ThumbsDown, Target, Layers,
  Trophy, Lightbulb, Link as LinkIcon, FileText,
} from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';

const TABS = [
  { key: 'url',  label: 'From URL',   icon: LinkIcon },
  { key: 'text', label: 'From text',  icon: FileText },
];

export default function CompetitorAnalysisPage() {
  const [tab, setTab]                   = useState('url');
  const [url, setUrl]                   = useState('');
  const [pasted, setPasted]             = useState('');
  const [topic, setTopic]               = useState('');
  const [provider, setProvider]         = useState('claude');
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState('');

  const run = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const body = {
        yourTopic: topic.trim(),
        provider,
        ...(tab === 'url'
          ? { competitorUrl: url.trim() }
          : { competitorContent: pasted.trim() }),
      };
      const res = await fetch('/api/ai/competitor-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to analyse');
      setResult(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canRun =
    topic.trim() &&
    ((tab === 'url' && url.trim()) || (tab === 'text' && pasted.trim()));

  return (
    <div className="p-5 sm:p-8">
      <AIPageHeader
        eyebrow="AI TOOLS"
        title="Competitor Analysis"
        description="Dissect a competitor article, find the gaps, and get a plan to outrank it."
        icon={Swords}
        accent="#c0392b"
      />

      <div className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
        <div className="mb-3 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
              style={tab === t.key
                ? { background: '#c0392b', color: '#fff', boxShadow: '0 2px 8px rgba(192,57,43,0.3)' }
                : { background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }
              }
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'url' ? (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://competitor.com/article-slug"
            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#c0392b'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
          />
        ) : (
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste the full competitor article text here…"
            rows={10}
            className="w-full resize-none rounded-xl px-3 py-2.5 text-sm leading-relaxed focus:outline-none"
            style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#c0392b'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
          />
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_140px_auto]">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Your post topic / target keyword"
            className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#c0392b'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
          />
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
            style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
          >
            <option value="claude">Claude</option>
            <option value="openai">OpenAI</option>
          </select>
          <button
            onClick={run}
            disabled={!canRun || loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#c0392b] px-5 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Analysing…' : 'Analyse'}
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
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Section title="Competitor strengths" icon={ThumbsUp} color="#008000">
            {result.competitorStrengths.map((s, i) => <Bullet key={i} color="#008000">{s}</Bullet>)}
          </Section>

          <Section title="Competitor weaknesses" icon={ThumbsDown} color="#c0392b">
            {result.competitorWeaknesses.map((s, i) => <Bullet key={i} color="#c0392b">{s}</Bullet>)}
          </Section>

          <Section title="Gaps to exploit" icon={Target} color="#d4af37">
            {result.gapsToExploit.map((s, i) => <Bullet key={i} color="#d4af37">{s}</Bullet>)}
          </Section>

          <Section title="Headline alternatives" icon={Lightbulb} color="#6b9fdb">
            {result.headlineAlternatives.map((s, i) => (
              <li key={i} className="rounded-xl px-3 py-2 text-[13px] font-semibold" style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}>
                {s}
              </li>
            ))}
          </Section>

          <Section title="Structure breakdown" icon={Layers} color="#6b9fdb">
            <li className="rounded-xl p-3" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Words</p>
                  <p className="text-lg font-black" style={{ color: 'var(--adm-text)' }}>{result.structureBreakdown.wordCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>H2s</p>
                  <p className="text-lg font-black" style={{ color: 'var(--adm-text)' }}>{result.structureBreakdown.h2Count}</p>
                </div>
              </div>
            </li>
            {result.structureBreakdown.sections.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--adm-text)' }}>
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#6b9fdb' }} />
                {s}
              </li>
            ))}
          </Section>

          <Section title="Beat-it plan" icon={Trophy} color="#d4af37">
            {result.beatItPlan.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-[13px]" style={{ color: 'var(--adm-text)' }}>
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: '#d4af3725', color: '#a37500' }}>
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, color, children }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>{title}</p>
      </div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function Bullet({ children, color }) {
  return (
    <li className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--adm-text)' }}>
      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: color }} />
      {children}
    </li>
  );
}

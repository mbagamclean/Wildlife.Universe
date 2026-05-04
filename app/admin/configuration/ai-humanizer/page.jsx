'use client';

import { useMemo, useState } from 'react';
import {
  Wand2, Loader2, Copy, Check, RefreshCw, Sparkles, AlertCircle, ArrowLeftRight,
} from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';

const TONES = ['Conversational', 'Authoritative', 'Casual', 'Academic'];
const PROVIDERS = [
  { key: 'claude', label: 'Claude' },
  { key: 'openai', label: 'OpenAI' },
];

export default function AIHumanizerPage() {
  const [input, setInput]       = useState('');
  const [tone, setTone]         = useState('Conversational');
  const [provider, setProvider] = useState('claude');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);

  const inputWords = useMemo(
    () => input.trim().split(/\s+/).filter(Boolean).length,
    [input]
  );
  const outputWords = useMemo(
    () => (result?.humanized || '').trim().split(/\s+/).filter(Boolean).length,
    [result]
  );

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/ai/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, tone, provider }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to humanize');
      setResult(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = async () => {
    if (!result?.humanized) return;
    try {
      await navigator.clipboard.writeText(result.humanized);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };

  return (
    <div className="p-5 sm:p-8">
      <AIPageHeader
        eyebrow="AI TOOLS"
        title="AI Humanizer"
        description="Rewrite AI-sounding text into prose that reads like genuine human voice."
        icon={Wand2}
        accent="#d4af37"
      />

      {/* Controls */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
        <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Tone</p>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                style={tone === t
                  ? { background: '#d4af37', color: '#fff', boxShadow: '0 2px 8px rgba(212,175,55,0.3)' }
                  : { background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Provider</p>
          <div className="flex gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.key}
                onClick={() => setProvider(p.key)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                style={provider === p.key
                  ? { background: '#008000', color: '#fff' }
                  : { background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={run}
            disabled={!input.trim() || loading}
            className="flex h-full w-full items-center justify-center gap-2 rounded-2xl bg-[#008000] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#006400] disabled:opacity-50 disabled:cursor-not-allowed lg:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Humanising…' : 'Humanise'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: '#fde2e2', color: '#7a1f1f', border: '1px solid #f5b7b7' }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Side-by-side */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Input (AI text)</p>
            <span className="text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{inputWords} words</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste the AI-generated text you want to humanise…"
            rows={18}
            className="w-full resize-none rounded-xl px-3 py-3 text-sm leading-relaxed focus:outline-none"
            style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#d4af37'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
          />
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Humanised</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{outputWords} words</span>
              <button
                onClick={copyOutput}
                disabled={!result?.humanized}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40"
                style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div
            className="min-h-[470px] whitespace-pre-wrap rounded-xl px-3 py-3 text-sm leading-relaxed"
            style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
          >
            {loading ? (
              <div className="flex h-full min-h-[440px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#d4af37' }} />
              </div>
            ) : result?.humanized ? (
              result.humanized
            ) : (
              <span style={{ color: 'var(--adm-text-subtle)' }}>The humanised version will appear here.</span>
            )}
          </div>
        </div>
      </div>

      {/* Changes log */}
      {result && (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_280px]">
          <div className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
            <div className="mb-3 flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" style={{ color: '#d4af37' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Changes ({result.changes.length})</p>
            </div>
            {result.changes.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>
                No specific phrase-level changes reported.
              </p>
            ) : (
              <div className="space-y-3">
                {result.changes.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3"
                    style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#c0392b' }}>Original</p>
                        <p className="text-[13px] line-through" style={{ color: 'var(--adm-text-muted)' }}>{c.original}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#008000' }}>Replacement</p>
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{c.replacement}</p>
                      </div>
                    </div>
                    {c.reason && (
                      <p className="mt-2 text-[11px] italic" style={{ color: 'var(--adm-text-subtle)' }}>{c.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div
              className="flex flex-col items-center justify-center rounded-2xl p-5 text-center"
              style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}
            >
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Readability shift</p>
              <p
                className="text-3xl font-black"
                style={{ color: result.readabilityShift > 0 ? '#008000' : result.readabilityShift < 0 ? '#c0392b' : 'var(--adm-text)' }}
              >
                {result.readabilityShift > 0 ? '+' : ''}{result.readabilityShift}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--adm-text-muted)' }}>
                {result.readabilityShift > 0 ? 'Easier to read' : result.readabilityShift < 0 ? 'Slightly heavier' : 'Same as original'}
              </p>
            </div>

            <button
              onClick={run}
              disabled={loading || !input.trim()}
              className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--adm-surface)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}
            >
              <RefreshCw className="h-4 w-4" /> Run again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

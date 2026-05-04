'use client';
import { useState, useCallback } from 'react';
import { Camera, Loader2, AlertCircle, Copy, Check, Sparkles, ImagePlus } from 'lucide-react';
import Link from 'next/link';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';

const STYLES = [
  'Wildlife Documentary',
  'Macro Photography',
  'Aerial / Drone',
  'Black & White',
  'Golden Hour',
  'Camera Trap',
  'Conservation Storytelling',
  'Editorial Portrait',
];

const ASPECTS = ['16:9', '4:3', '1:1', '9:16'];
const QUANTITIES = [5, 10, 15];

export default function ImagePromptsPage() {
  const [subject, setSubject] = useState('');
  const [style, setStyle] = useState(STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [quantity, setQuantity] = useState(10);
  const [provider, setProvider] = useState('claude');
  const [running, setRunning] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [error, setError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const generate = useCallback(async () => {
    if (!subject.trim()) {
      setError('Enter a subject first.');
      return;
    }
    setRunning(true);
    setError(null);
    setPrompts([]);
    try {
      const res = await fetch('/api/ai/image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, style, aspectRatio, quantity, provider }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Generation failed');
      setPrompts(json.data?.prompts || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [subject, style, aspectRatio, quantity, provider]);

  const copyPrompt = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="p-5 sm:p-8">
      <AIPageHeader
        eyebrow="AI TOOLS"
        title="Image Prompt Generator"
        description="Brainstorm cinematic wildlife photography prompts before committing to image generation."
        icon={Camera}
        accent="#a37500"
      />

      <div
        className="mb-6 rounded-2xl p-5"
        style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}
      >
        <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>
          Subject / Topic
        </label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !running) generate(); }}
          placeholder='e.g. "African elephant herd at dawn", "Macro insects of the Amazon"'
          className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#a37500]"
          style={{ background: 'var(--adm-bg)', borderColor: 'var(--adm-border)', color: 'var(--adm-text)' }}
        />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Style">
            <select value={style} onChange={(e) => setStyle(e.target.value)} className="select-base">
              {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Aspect Ratio">
            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="select-base">
              {ASPECTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Quantity">
            <select value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10))} className="select-base">
              {QUANTITIES.map((q) => <option key={q} value={q}>{q} prompts</option>)}
            </select>
          </Field>
          <Field label="Provider">
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="select-base">
              <option value="claude">Claude</option>
              <option value="openai">OpenAI</option>
            </select>
          </Field>
        </div>

        <button
          onClick={generate}
          disabled={running}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all sm:w-auto"
          style={{
            background: running ? 'var(--adm-hover-bg)' : 'linear-gradient(135deg, #a37500, #d4af37)',
            color: running ? 'var(--adm-text-muted)' : '#0c0c0c',
            cursor: running ? 'wait' : 'pointer',
            opacity: running ? 0.6 : 1,
          }}
        >
          {running
            ? (<><Loader2 className="h-4 w-4 animate-spin" /> Generating prompts…</>)
            : (<><Sparkles className="h-4 w-4" /> Generate Prompts</>)}
        </button>
      </div>

      {error && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {prompts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {prompts.map((p, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-4"
              style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}
            >
              <p className="text-sm leading-relaxed" style={{ color: 'var(--adm-text)' }}>{p.text}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {p.style && <Pill label="Style" value={p.style} color="#a37500" />}
                {p.mood && <Pill label="Mood" value={p.mood} color="#7c3aed" />}
                {p.lightingNotes && <Pill label="Light" value={p.lightingNotes} color="#f59e0b" />}
                {p.technicalSpec && <Pill label="Camera" value={p.technicalSpec} color="#1a6eb5" />}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => copyPrompt(p.text, idx)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    borderColor: copiedIdx === idx ? '#16a34a' : 'var(--adm-border)',
                    color: copiedIdx === idx ? '#16a34a' : 'var(--adm-text-muted)',
                    background: 'transparent',
                  }}
                >
                  {copiedIdx === idx ? (<><Check size={12} /> Copied</>) : (<><Copy size={12} /> Copy prompt</>)}
                </button>
                <Link
                  href={`/admin/editor/new?title=${encodeURIComponent(p.text.slice(0, 60))}`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: '#7c3aed' }}
                >
                  <ImagePlus size={12} /> Send to Editor
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .select-base {
          width: 100%;
          border-radius: 10px;
          border: 1px solid var(--adm-border);
          background: var(--adm-bg);
          color: var(--adm-text);
          padding: 9px 11px;
          font-size: 13px;
          outline: none;
        }
        .select-base:focus { border-color: #a37500; }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Pill({ label, value, color }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      <span className="opacity-70">{label}:</span> {value}
    </span>
  );
}

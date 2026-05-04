'use client';

import { useMemo, useState } from 'react';
import {
  Languages, Loader2, Sparkles, AlertCircle, Copy, Check, ArrowLeftRight,
  FileText, ClipboardPaste, Save,
} from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';
import { PostPicker } from '@/components/admin/configuration/PostPicker';

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Italian',
  'Dutch',
  'Swahili',
  'Arabic',
  'Chinese (Simplified)',
  'Japanese',
  'Korean',
  'Hindi',
  'Russian',
  'Turkish',
];

const PROVIDERS = [
  { key: 'claude', label: 'Claude' },
  { key: 'openai', label: 'OpenAI' },
];

function plainText(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function TranslatePage() {
  const [mode, setMode]                 = useState('paste'); // 'paste' | 'post'
  const [pastedText, setPastedText]     = useState('');
  const [post, setPost]                 = useState(null);
  const [target, setTarget]             = useState('Swahili');
  const [preserveTone, setPreserveTone] = useState(true);
  const [provider, setProvider]         = useState('claude');
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState('');
  const [copied, setCopied]             = useState(false);
  const [savedNote, setSavedNote]       = useState('');

  const sourceText = useMemo(() => {
    if (mode === 'paste') return pastedText;
    if (post) {
      const titleLine = post.title ? `${post.title}\n\n` : '';
      return titleLine + (post.body || '');
    }
    return '';
  }, [mode, pastedText, post]);

  const sourceWords = useMemo(
    () => plainText(sourceText).split(/\s+/).filter(Boolean).length,
    [sourceText]
  );
  const targetWords = useMemo(
    () => plainText(result?.translation).split(/\s+/).filter(Boolean).length,
    [result]
  );

  const canRun = !loading && Boolean(sourceText.trim());

  const run = async () => {
    if (!canRun) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSavedNote('');
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          targetLanguage: target,
          preserveTone,
          provider,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to translate');
      setResult(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyTranslation = async () => {
    if (!result?.translation) return;
    try {
      await navigator.clipboard.writeText(result.translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };

  // TODO: full multilingual posts schema is out of scope for this tier.
  // Saves into post_translations table when source is an existing post.
  // Falls back to clipboard copy for paste-mode (no post to attach to).
  const saveAsTranslation = async () => {
    if (!result?.translation) return;

    if (mode !== 'post' || !post?.id) {
      try {
        await navigator.clipboard.writeText(result.translation);
        setSavedNote('Copied to clipboard. To save into the database, switch to "Existing post" mode and pick a post.');
        setTimeout(() => setSavedNote(''), 5000);
      } catch {
        setSavedNote('Could not access clipboard.');
        setTimeout(() => setSavedNote(''), 4000);
      }
      return;
    }

    try {
      const res = await fetch('/api/admin/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          targetLanguage: target,
          translatedTitle: post.title || null,
          translatedBody: result.translation,
          notes: result.notes || null,
          provider,
          preserveTone,
          sourceLanguage: 'English',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedNote(`Saved as ${target} translation for "${post.title}".`);
      } else if (json.error === 'translations_table_missing') {
        setSavedNote('Run migration 004_seo_extensions.sql to enable translation saving.');
      } else {
        setSavedNote(`Save failed: ${json.error || 'unknown error'}`);
      }
      setTimeout(() => setSavedNote(''), 5000);
    } catch (e) {
      setSavedNote(`Save failed: ${e.message}`);
      setTimeout(() => setSavedNote(''), 4000);
    }
  };

  return (
    <div className="p-5 sm:p-8">
      <AIPageHeader
        eyebrow="AI TOOLS"
        title="Translate"
        description="Native-quality translations across 15 languages — preserves voice, tags, and Latin scientific names."
        icon={Languages}
        accent="#1a6eb5"
      />

      {/* Mode toggle */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setMode('paste')}
          className="flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all"
          style={mode === 'paste'
            ? { background: '#1a6eb5', color: '#fff', boxShadow: '0 2px 8px rgba(26,110,181,0.3)' }
            : { background: 'var(--adm-surface)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }
          }
        >
          <ClipboardPaste className="h-4 w-4" /> Paste text
        </button>
        <button
          onClick={() => setMode('post')}
          className="flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all"
          style={mode === 'post'
            ? { background: '#1a6eb5', color: '#fff', boxShadow: '0 2px 8px rgba(26,110,181,0.3)' }
            : { background: 'var(--adm-surface)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }
          }
        >
          <FileText className="h-4 w-4" /> Existing post
        </button>
      </div>

      {/* Controls */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
        <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Target language</p>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
            style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Tone strategy</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPreserveTone(true)}
              className="flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
              style={preserveTone
                ? { background: '#d4af37', color: '#fff' }
                : { background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }
              }
            >
              Preserve tone
            </button>
            <button
              onClick={() => setPreserveTone(false)}
              className="flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
              style={!preserveTone
                ? { background: '#d4af37', color: '#fff' }
                : { background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }
              }
            >
              Localise idioms
            </button>
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
            disabled={!canRun}
            className="flex h-full w-full items-center justify-center gap-2 rounded-2xl bg-[#1a6eb5] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#155a96] disabled:opacity-50 disabled:cursor-not-allowed lg:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Translating…' : 'Translate'}
          </button>
        </div>
      </div>

      {/* Source picker (post mode) */}
      {mode === 'post' && (
        <div className="mb-4">
          <PostPicker value={post} onChange={setPost} placeholder="Pick a post to translate…" />
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: '#fde2e2', color: '#7a1f1f', border: '1px solid #f5b7b7' }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {savedNote && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: '#e6f7e6', color: '#1f5e1f', border: '1px solid #b7e0b7' }}>
          <Check className="h-4 w-4 flex-shrink-0" />
          {savedNote}
        </div>
      )}

      {/* Side-by-side */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>
              Source {result?.sourceLanguage ? `(${result.sourceLanguage})` : ''}
            </p>
            <span className="text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{sourceWords} words</span>
          </div>
          {mode === 'paste' ? (
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste the source text here…"
              rows={20}
              className="w-full resize-none rounded-xl px-3 py-3 text-sm leading-relaxed focus:outline-none"
              style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#1a6eb5'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
            />
          ) : (
            <div
              className="min-h-[470px] whitespace-pre-wrap rounded-xl px-3 py-3 text-sm leading-relaxed"
              style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
            >
              {post ? plainText(sourceText) : (
                <span style={{ color: 'var(--adm-text-subtle)' }}>Pick a post above to see the source content.</span>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Translation ({target})</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{targetWords} words</span>
              <button
                onClick={copyTranslation}
                disabled={!result?.translation}
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
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#1a6eb5' }} />
              </div>
            ) : result?.translation ? (
              result.translation
            ) : (
              <span style={{ color: 'var(--adm-text-subtle)' }}>The translation will appear here.</span>
            )}
          </div>
        </div>
      </div>

      {result && (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_280px]">
          <div className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
            <div className="mb-3 flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" style={{ color: '#1a6eb5' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Translator notes</p>
            </div>
            {result.notes ? (
              <p className="text-[13px] italic" style={{ color: 'var(--adm-text-muted)' }}>{result.notes}</p>
            ) : (
              <p className="text-[13px]" style={{ color: 'var(--adm-text-subtle)' }}>No additional notes from the translator.</p>
            )}
          </div>
          {mode === 'post' && post && (
            <button
              onClick={saveAsTranslation}
              className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all"
              style={{ background: 'var(--adm-surface)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}
            >
              <Save className="h-4 w-4" /> Save as Translation
            </button>
          )}
        </div>
      )}
    </div>
  );
}

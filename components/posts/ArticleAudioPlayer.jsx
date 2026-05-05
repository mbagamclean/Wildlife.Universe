'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, Languages, ChevronDown, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* Audio-voice value → translate-API target language name.
   Listed only for the pairs where both stacks support the language; for
   anything else the translate chip stays hidden so we never offer a
   translation we can't actually deliver. The translate API names come from
   /app/api/ai/translate/route.js SUPPORTED_LANGUAGES. */
const TRANSLATE_TARGET_BY_AUDIO_LANG = {
  'en-US': 'English',
  'en-GB': 'English',
  'sw':    'Swahili',
  'fr-FR': 'French',
  'es-ES': 'Spanish',
  'de-DE': 'German',
  'pt-BR': 'Portuguese',
  'pt-PT': 'Portuguese',
  'it-IT': 'Italian',
  'nl-NL': 'Dutch',
  'ru-RU': 'Russian',
  'tr-TR': 'Turkish',
  'ar':    'Arabic',
  'hi-IN': 'Hindi',
  'zh-CN': 'Chinese (Simplified)',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
};

/* Translate API truncates at 16 000 chars per call. We chunk a little
   under that at sentence boundaries so a longer article gets translated
   in parallel pieces and rejoined, with no silent truncation. */
const CHUNK_MAX_CHARS = 9000;

function chunkAtSentenceBoundary(text, max = CHUNK_MAX_CHARS) {
  if (!text || text.length <= max) return text ? [text] : [];
  const parts = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let buf = '';
  for (const p of parts) {
    if ((buf ? buf.length + 1 : 0) + p.length > max && buf) {
      chunks.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf} ${p}` : p;
    }
    // A single sentence longer than the cap — hard-split it.
    while (buf.length > max) {
      chunks.push(buf.slice(0, max));
      buf = buf.slice(max);
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

async function translateText(text, targetLanguage, signal) {
  const chunks = chunkAtSentenceBoundary(text);
  if (chunks.length === 0) return '';
  const results = await Promise.all(chunks.map(async (chunk) => {
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunk, targetLanguage, preserveTone: true }),
      signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Translate failed (${res.status})`);
    }
    return (json.data?.translation || '').trim();
  }));
  return results.filter(Boolean).join(' ');
}

const LANG_GROUPS = [
  {
    group: 'African Languages',
    langs: [
      { value: 'sw',    label: 'Swahili',    region: 'East Africa' },
      { value: 'ha',    label: 'Hausa',      region: 'West Africa' },
      { value: 'yo',    label: 'Yoruba',     region: 'West Africa' },
      { value: 'am',    label: 'Amharic',    region: 'Ethiopia' },
      { value: 'zu',    label: 'Zulu',       region: 'South Africa' },
      { value: 'ig',    label: 'Igbo',       region: 'Nigeria' },
      { value: 'so',    label: 'Somali',     region: 'Somalia' },
    ],
  },
  {
    group: 'European Languages',
    langs: [
      { value: 'en-US', label: 'English',    region: 'United States' },
      { value: 'en-GB', label: 'English',    region: 'United Kingdom' },
      { value: 'fr-FR', label: 'French',     region: 'France' },
      { value: 'es-ES', label: 'Spanish',    region: 'Spain' },
      { value: 'de-DE', label: 'German',     region: 'Germany' },
      { value: 'it-IT', label: 'Italian',    region: 'Italy' },
      { value: 'pt-BR', label: 'Portuguese', region: 'Brazil' },
      { value: 'pt-PT', label: 'Portuguese', region: 'Portugal' },
      { value: 'nl-NL', label: 'Dutch',      region: 'Netherlands' },
      { value: 'pl-PL', label: 'Polish',     region: 'Poland' },
      { value: 'ru-RU', label: 'Russian',    region: 'Russia' },
      { value: 'tr-TR', label: 'Turkish',    region: 'Turkey' },
    ],
  },
  {
    group: 'Asian Languages',
    langs: [
      { value: 'ar',    label: 'Arabic',     region: 'Arabic World' },
      { value: 'hi-IN', label: 'Hindi',      region: 'India' },
      { value: 'zh-CN', label: 'Chinese',    region: 'Mandarin' },
      { value: 'zh-TW', label: 'Chinese',    region: 'Traditional' },
      { value: 'ja-JP', label: 'Japanese',   region: 'Japan' },
      { value: 'ko-KR', label: 'Korean',     region: 'Korea' },
      { value: 'id-ID', label: 'Indonesian', region: 'Indonesia' },
      { value: 'ms-MY', label: 'Malay',      region: 'Malaysia' },
      { value: 'vi-VN', label: 'Vietnamese', region: 'Vietnam' },
      { value: 'th-TH', label: 'Thai',       region: 'Thailand' },
      { value: 'bn-BD', label: 'Bengali',    region: 'Bangladesh' },
      { value: 'ur-PK', label: 'Urdu',       region: 'Pakistan' },
    ],
  },
];

const ALL_LANGS = LANG_GROUPS.flatMap((g) => g.langs);

function getLang(value) {
  return ALL_LANGS.find((l) => l.value === value) || ALL_LANGS.find((l) => l.value === 'en-US');
}

function LangDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const current         = getLang(value);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="shrink-0">

      {/* ── Mobile: native select (touch-optimized, no positioning issues) ── */}
      <div className="relative flex items-center sm:hidden">
        <Languages className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#008000]" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg)] py-2 pl-7 pr-6 text-xs font-medium text-[var(--color-fg)] focus:outline-none focus:ring-1 focus:ring-[#008000]"
        >
          {LANG_GROUPS.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.langs.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label} ({lang.region})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-[var(--color-fg-soft)]" />
      </div>

      {/* ── Desktop: custom dropdown ── */}
      <div ref={ref} className="relative hidden sm:block">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-fg)] transition-colors hover:bg-[var(--color-bg-deep)]"
        >
          <Languages className="h-4 w-4 shrink-0 text-[#008000]" />
          <span className="text-sm font-medium">
            {current.label}
            <span className="ml-1 text-[var(--color-fg-soft)]">({current.region})</span>
          </span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[var(--color-fg-soft)] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] shadow-2xl shadow-black/20"
            >
              <div className="max-h-64 overflow-y-auto">
                {LANG_GROUPS.map((group) => (
                  <div key={group.group}>
                    <p className="sticky top-0 bg-[var(--color-bg-deep)] px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-fg-soft)]">
                      {group.group}
                    </p>
                    {group.langs.map((lang) => {
                      const active = lang.value === value;
                      return (
                        <button
                          key={lang.value}
                          onClick={() => { onChange(lang.value); setOpen(false); }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                            active
                              ? 'bg-[#008000]/10 text-[#008000]'
                              : 'text-[var(--color-fg)] hover:bg-[var(--glass-border)]'
                          }`}
                        >
                          <span className="truncate">
                            {lang.label}
                            <span className="ml-1 text-xs opacity-60">({lang.region})</span>
                          </span>
                          {active && <span className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#008000]" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

export function ArticleAudioPlayer({ title, body, onWordChange }) {
  const [status, setStatus]     = useState('idle');
  const [lang, setLang]         = useState('en-US');
  const [progress, setProgress] = useState(0);
  const [translations, setTranslations]   = useState({});      // { [audioLang]: translatedText }
  const [translating, setTranslating]     = useState(false);
  const [translateErr, setTranslateErr]   = useState(null);
  const uttRef        = useRef(null);
  const wordsRef      = useRef([]);
  const wordIdxRef    = useRef(0);
  const translateAbortRef = useRef(null);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    translateAbortRef.current?.abort();
  }, []);

  // Different post → forget every cached translation.
  useEffect(() => {
    setTranslations({});
    setTranslateErr(null);
    translateAbortRef.current?.abort();
  }, [title, body]);

  // Defensive strip in case a caller still passes raw HTML — the speech
  // synthesizer should never read tag names like "p" or "h2" out loud.
  const cleanBody = typeof body === 'string' && /<\w+[^>]*>/.test(body)
    ? body.replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim()
    : (body || '');
  const originalText  = [title, cleanBody].filter(Boolean).join('. ');
  const cachedForLang = translations[lang] || null;
  const fullText      = cachedForLang || originalText;

  const targetLanguageName = TRANSLATE_TARGET_BY_AUDIO_LANG[lang] || null;
  // Hide chip if there's no translation target OR the current lang is
  // English-family and the article already looks like English-only ASCII —
  // translation would be a no-op.
  const articleLooksAscii = /^[\x00-\x7F\s]*$/.test(originalText.slice(0, 400));
  const showTranslateChip =
    !!targetLanguageName &&
    !!originalText &&
    !(targetLanguageName === 'English' && articleLooksAscii);

  /* startSpeech can take an explicit text override so the post-translate
     auto-play doesn't have to wait for setState to flush. */
  const startSpeech = (overrideText) => {
    if (!window.speechSynthesis) return;
    const text = overrideText !== undefined ? overrideText : fullText;
    if (!text) return;
    window.speechSynthesis.cancel();
    wordsRef.current   = text.split(/\s+/).filter(Boolean);
    wordIdxRef.current = 0;
    setProgress(0);

    const speak = () => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      utt.rate = 0.95;
      utt.onboundary = (e) => {
        if (e.name === 'word') {
          const idx = wordIdxRef.current;
          wordIdxRef.current += 1;
          onWordChange?.(idx);
          const total = wordsRef.current.length;
          setProgress(total > 0 ? Math.round((idx / total) * 100) : 0);
        }
      };
      utt.onend   = () => { setStatus('idle'); setProgress(0); onWordChange?.(-1); };
      utt.onerror = () => { setStatus('idle'); setProgress(0); onWordChange?.(-1); };
      uttRef.current = utt;
      window.speechSynthesis.speak(utt);
      setStatus('playing');
    };

    // Chrome requires voices to be loaded before speak() produces audio
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      speak();
    } else {
      const handler = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        speak();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler);
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        speak();
      }, 300);
    }
  };

  const handlePlay = () => {
    if (!window.speechSynthesis) return;
    if (status === 'idle')         startSpeech();
    else if (status === 'paused')  { window.speechSynthesis.resume(); setStatus('playing'); }
    else                           { window.speechSynthesis.pause();  setStatus('paused');  }
  };

  const handleStop = () => {
    window.speechSynthesis?.cancel();
    setStatus('idle');
    setProgress(0);
    onWordChange?.(-1);
    wordIdxRef.current = 0;
  };

  const handleLangChange = (v) => {
    setLang(v);
    setTranslateErr(null);
    if (status !== 'idle') handleStop();
  };

  /* Translate the original article into the picked listening language and
     auto-start playback in that language. Cached per audio-lang so a
     subsequent toggle back doesn't re-hit the API. */
  const handleTranslate = async () => {
    if (!targetLanguageName || translating) return;
    if (cachedForLang) {
      // Already translated for this lang — just play.
      startSpeech(cachedForLang);
      return;
    }
    if (!originalText) return;

    translateAbortRef.current?.abort();
    translateAbortRef.current = new AbortController();

    setTranslating(true);
    setTranslateErr(null);
    try {
      const translated = await translateText(
        originalText,
        targetLanguageName,
        translateAbortRef.current.signal
      );
      if (!translated) throw new Error('Empty translation');
      setTranslations((prev) => ({ ...prev, [lang]: translated }));
      // Auto-play in the translated language. Pass the text explicitly so
      // the speech doesn't wait for the next render to pick up new state.
      startSpeech(translated);
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setTranslateErr(e.message || 'Translation failed.');
      }
    } finally {
      setTranslating(false);
    }
  };

  const isActive = status !== 'idle';

  return (
    <div className="mb-8 rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)]">

      {/* ── Header row: icon + title  |  lang picker ── */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#008000]">
            <Volume2 className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-fg)] sm:text-base">
              Listen to this article
            </p>
            <p className="truncate text-xs text-[var(--color-fg-soft)]">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LangDropdown value={lang} onChange={handleLangChange} />
          {showTranslateChip && (
            <button
              type="button"
              onClick={handleTranslate}
              disabled={translating}
              title={cachedForLang
                ? `Article translated to ${targetLanguageName} — click to play it`
                : `Translate this article to ${targetLanguageName} and read it aloud`}
              aria-label={cachedForLang
                ? `Play ${targetLanguageName} translation`
                : `Translate article to ${targetLanguageName}`}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                cachedForLang
                  ? 'border-[#008000] bg-[#008000]/10 text-[#008000] hover:bg-[#008000]/15'
                  : 'border-[var(--glass-border)] bg-[var(--color-bg)] text-[var(--color-fg)] hover:border-[#008000] hover:text-[#008000]'
              }`}
            >
              {translating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">Translating…</span>
                </>
              ) : cachedForLang ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{targetLanguageName}</span>
                </>
              ) : (
                <>
                  <Languages className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Translate</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {translateErr && (
        <div role="alert" className="mx-4 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300 sm:mx-5">
          {translateErr}
        </div>
      )}

      {/* ── Progress bar + percentage ── */}
      <div className="px-4 sm:px-5">
        <div className="relative h-2 overflow-hidden rounded-full bg-[var(--glass-border)]">
          <div
            className="h-full rounded-full bg-[#008000] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {isActive && (
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-[#008000]">{progress}%</span>
            {cachedForLang && (
              <span className="truncate text-[10px] text-[var(--color-fg-soft)]">
                Reading {targetLanguageName} translation
              </span>
            )}
            <span className="text-[10px] capitalize text-[var(--color-fg-soft)]">{status}</span>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center gap-2 px-4 py-4 sm:px-5">
        {/* Play / Pause — full width on mobile, auto on sm+ */}
        <button
          onClick={handlePlay}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#008000] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#006400] active:scale-[0.97] sm:flex-none sm:px-5 sm:py-2"
        >
          {status === 'playing'
            ? <><Pause className="h-4 w-4" /><span>Pause</span></>
            : status === 'paused'
            ? <><Play  className="h-4 w-4" /><span>Resume</span></>
            : <><Play  className="h-4 w-4" /><span>Play Article</span></>
          }
        </button>

        {/* Stop — icon-only circle on mobile, icon + label on sm+ */}
        {isActive && (
          <button
            onClick={handleStop}
            title="Stop"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-border)] text-[var(--color-fg-soft)] transition-colors hover:bg-[var(--color-bg)] active:scale-[0.97] sm:h-auto sm:w-auto sm:gap-2 sm:rounded-full sm:px-4 sm:py-2"
          >
            <Square className="h-3.5 w-3.5" />
            <span className="hidden text-sm sm:inline">Stop</span>
          </button>
        )}
      </div>

    </div>
  );
}

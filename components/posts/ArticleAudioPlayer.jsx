'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, Languages, ChevronDown, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TRANSLATE_TARGET_BY_AUDIO_LANG } from '@/lib/posts/translate';

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
      {/* Compact width so the audio-player header doesn't overflow on
          narrow phones — the lang picker + translate button used to
          push the title off-screen. */}
      <div className="relative flex items-center sm:hidden">
        <Languages className="pointer-events-none absolute left-2 h-3 w-3 text-[#008000]" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[112px] max-w-[112px] truncate appearance-none rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg)] py-1.5 pl-6 pr-5 text-[11px] font-medium text-[var(--color-fg)] focus:outline-none focus:ring-1 focus:ring-[#008000]"
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

/**
 * Controlled audio player. Listening language and translation state
 * (cached body, translating, error) live in PostView so the table of
 * contents can render in the same translated language as the audio.
 *
 * Props:
 *   - title, body                  — article inputs
 *   - lang, onLangChange           — controlled listening language
 *   - translatedText               — translated full text for the current
 *                                    lang, or null when none is cached
 *   - translating, translateErr    — UI state for the translate chip
 *   - onTranslate                  — async; returns the translated text or
 *                                    null on failure (so the player can
 *                                    auto-start playback without waiting
 *                                    on a setState round-trip)
 *   - onWordChange                 — fires for every spoken word (legacy)
 */
export function ArticleAudioPlayer({
  title,
  body,
  lang,
  onLangChange,
  translatedText = null,
  translating = false,
  translateErr = null,
  onTranslate,
  onWordChange,
}) {
  const [status, setStatus]     = useState('idle');
  const [progress, setProgress] = useState(0);
  const uttRef        = useRef(null);
  const wordsRef      = useRef([]);
  const wordIdxRef    = useRef(0);
  // Long articles must be spoken as a sequence of bounded utterances
  // because Chrome/Edge silently truncate any single utterance past
  // ~3.5–4k characters (the engine just stops; onend never fires). We
  // split the article into chunks at sentence boundaries and chain them
  // via onend → speak(next).
  const chunksRef            = useRef([]);
  const chunkIdxRef          = useRef(0);
  const chunkWordOffsetRef   = useRef(0);
  const speakChunkRef        = useRef(null);
  // We use a ref-mirrored status inside the watchdog so the interval can
  // see the latest status without re-binding every render.
  const statusRef     = useRef('idle');
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  /* Watchdog: handles three known issues with window.speechSynthesis on
     Chrome/Edge:
       1. After ~15 seconds of continuous speech the engine silently
          pauses. Calling pause()+resume() on a steady cadence keeps it
          flowing.
       2. utt.onend doesn't always fire on long utterances. We poll the
          .speaking flag and recover.
       3. On long articles the engine sometimes drops the current chunk
          before its onend fires. If we still have queued chunks left,
          the watchdog advances to the next chunk instead of resetting
          the player to idle (which is what used to cut the audio off
          mid-article). Only when ALL chunks are done do we go idle. */
  useEffect(() => {
    if (status !== 'playing') return undefined;
    const id = window.setInterval(() => {
      const synth = window.speechSynthesis;
      if (!synth) return;
      if (statusRef.current !== 'playing') return;
      if (!synth.speaking && !synth.paused) {
        // Engine went silent. Are there still chunks queued?
        const cur   = chunkIdxRef.current;
        const total = chunksRef.current.length;
        if (cur + 1 < total && typeof speakChunkRef.current === 'function') {
          // The current chunk's onend silently never fired — manually
          // advance to the next chunk so the article keeps playing.
          const chunk      = chunksRef.current[cur] || '';
          const chunkWords = chunk.split(/\s+/).filter(Boolean).length;
          chunkWordOffsetRef.current += chunkWords;
          if (wordIdxRef.current < chunkWordOffsetRef.current) {
            wordIdxRef.current = chunkWordOffsetRef.current;
          }
          speakChunkRef.current(cur + 1);
          return;
        }
        // No more chunks left — speech truly finished. Sync UI to idle.
        setStatus('idle');
        setProgress(0);
        wordIdxRef.current        = 0;
        chunkIdxRef.current       = 0;
        chunkWordOffsetRef.current = 0;
        chunksRef.current         = [];
        onWordChange?.(-1, '');
        return;
      }
      // Keep the engine alive past Chrome's silent 15s cap.
      synth.pause();
      synth.resume();
    }, 8000);
    return () => window.clearInterval(id);
  }, [status, onWordChange]);

  /* Split a long article into TTS-safe chunks at sentence boundaries.
     Each chunk stays under ~3500 chars — well clear of Chrome's silent
     truncation point — while still ending on a real sentence break so
     the prosody between chunks isn't audibly chopped. A single
     sentence longer than the cap is hard-split on whitespace as a
     fallback so we never emit an over-cap chunk. */
  function chunkText(text, maxChars = 3500) {
    if (!text) return [];
    const t = String(text).trim();
    if (t.length <= maxChars) return [t];

    // Match a sentence (ending in . ! ? optionally followed by closing
    // punctuation), or a paragraph break, or a final tail with no
    // terminator. Keeps the terminator attached to the sentence.
    const sentences = t.match(/[^.!?\n]+[.!?]+["')\]]*\s*|[^.!?\n]+\n+|[^.!?\n]+$/g) || [t];

    const chunks = [];
    let buf = '';
    const flush = () => {
      const v = buf.trim();
      if (v) chunks.push(v);
      buf = '';
    };

    for (const s of sentences) {
      if (s.length > maxChars) {
        // One mega-sentence — hard-split on whitespace.
        flush();
        let inner = '';
        for (const piece of s.split(/(\s+)/)) {
          if (inner.length + piece.length > maxChars && inner.trim()) {
            chunks.push(inner.trim());
            inner = piece;
          } else {
            inner += piece;
          }
        }
        if (inner.trim()) chunks.push(inner.trim());
        continue;
      }
      if (buf.length + s.length > maxChars) flush();
      buf += s;
    }
    flush();
    return chunks;
  }

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
  const cachedForLang = translatedText || null;
  const fullText      = cachedForLang || originalText;

  const targetLanguageName = TRANSLATE_TARGET_BY_AUDIO_LANG[lang] || null;
  const articleLooksAscii  = /^[\x00-\x7F\s]*$/.test(originalText.slice(0, 400));
  const showTranslateChip =
    !!targetLanguageName &&
    !!originalText &&
    !(targetLanguageName === 'English' && articleLooksAscii);

  /* startSpeech can take an explicit text override so the post-translate
     auto-play doesn't have to wait for setState to flush. The article
     is split into TTS-safe chunks and played as a chained queue so
     long-form content reads all the way to the end. */
  const startSpeech = (overrideText) => {
    if (!window.speechSynthesis) return;
    const text = overrideText !== undefined ? overrideText : fullText;
    if (!text) return;
    window.speechSynthesis.cancel();

    wordsRef.current           = text.split(/\s+/).filter(Boolean);
    wordIdxRef.current         = 0;
    chunksRef.current          = chunkText(text);
    chunkIdxRef.current        = 0;
    chunkWordOffsetRef.current = 0;
    setProgress(0);

    // Speak chunk N. When chunk N ends, queue chunk N+1. When all
    // chunks are done (or `idx` is past the end), reset the player.
    const speakChunk = (idx) => {
      if (idx >= chunksRef.current.length) {
        // Finished the whole article.
        setStatus('idle');
        setProgress(0);
        wordIdxRef.current         = 0;
        chunkIdxRef.current        = 0;
        chunkWordOffsetRef.current = 0;
        chunksRef.current          = [];
        onWordChange?.(-1, '');
        return;
      }

      const chunk = chunksRef.current[idx];
      chunkIdxRef.current = idx;

      const utt = new SpeechSynthesisUtterance(chunk);
      utt.lang = lang;
      utt.rate = 0.95;

      utt.onboundary = (e) => {
        if (e.name !== 'word') return;
        const globalIdx = wordIdxRef.current;
        wordIdxRef.current += 1;
        const word = wordsRef.current[globalIdx] || '';
        onWordChange?.(globalIdx, word);
        const total = wordsRef.current.length;
        setProgress(total > 0 ? Math.round((globalIdx / total) * 100) : 0);
      };

      // Chunk transition: keep the global word index in sync with the
      // chunk boundary in case any onboundary events were dropped, then
      // queue the next chunk.
      const advance = () => {
        const chunkWords = chunk.split(/\s+/).filter(Boolean).length;
        chunkWordOffsetRef.current += chunkWords;
        if (wordIdxRef.current < chunkWordOffsetRef.current) {
          wordIdxRef.current = chunkWordOffsetRef.current;
        }
        speakChunk(idx + 1);
      };

      utt.onend   = advance;
      utt.onerror = advance; // skip a broken chunk rather than aborting the article

      uttRef.current = utt;
      window.speechSynthesis.speak(utt);
      if (idx === 0) setStatus('playing');
    };

    // Stash the advancer so the watchdog can manually recover if the
    // engine silently drops a chunk without firing onend.
    speakChunkRef.current = speakChunk;

    // Chrome requires voices to be loaded before speak() produces audio.
    const start  = () => speakChunk(0);
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      start();
    } else {
      const handler = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        start();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler);
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        start();
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
    onWordChange?.(-1, '');
    wordIdxRef.current         = 0;
    chunkIdxRef.current        = 0;
    chunkWordOffsetRef.current = 0;
    chunksRef.current          = [];
  };

  const handleLangChange = (v) => {
    onLangChange?.(v);
    if (status !== 'idle') handleStop();
  };

  /* Translate-or-play. PostView owns the translation cache so the TOC can
     also render in the same translated language. The promise resolves to
     the translated text so we can speak immediately, without waiting for
     a setState round-trip in the parent. */
  const handleTranslate = async () => {
    if (!targetLanguageName || translating) return;
    if (cachedForLang) { startSpeech(cachedForLang); return; }
    if (!originalText || !onTranslate) return;
    const translated = await onTranslate();
    if (typeof translated === 'string' && translated) {
      startSpeech(translated);
    }
  };

  const isActive = status !== 'idle';

  return (
    <div className="mb-8 border-y border-x-0 sm:rounded-2xl sm:border border-[var(--glass-border)] bg-[var(--color-bg-deep)]">

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

'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, Languages, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const uttRef     = useRef(null);
  const wordsRef   = useRef([]);
  const wordIdxRef = useRef(0);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  const fullText = [title, body].filter(Boolean).join('. ');

  const startSpeech = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    wordsRef.current   = fullText.split(/\s+/).filter(Boolean);
    wordIdxRef.current = 0;
    setProgress(0);

    const speak = () => {
      const utt = new SpeechSynthesisUtterance(fullText);
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
    if (status !== 'idle') handleStop();
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
        <LangDropdown value={lang} onChange={handleLangChange} />
      </div>

      {/* ── Progress bar + percentage ── */}
      <div className="px-4 sm:px-5">
        <div className="relative h-2 overflow-hidden rounded-full bg-[var(--glass-border)]">
          <div
            className="h-full rounded-full bg-[#008000] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {isActive && (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] font-medium text-[#008000]">{progress}%</span>
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

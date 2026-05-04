'use client';
import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, FileVideo, Captions, Film, Wand2,
  Loader2, Download, Copy, Upload, Play, Square,
  AlertCircle, CheckCircle2, Volume2, Languages, Hash, Clock,
} from 'lucide-react';
import { useAIStore } from '@/lib/stores/aiStore';

const PURPLE = '#7c3aed';
const PURPLE_LIGHT = 'rgba(124,58,237,0.10)';
const PURPLE_BORDER = 'rgba(124,58,237,0.25)';
const AMBER = '#d97706';
const RED = '#dc2626';
const GREEN = '#059669';

const VOICES = [
  { id: 'alloy',   label: 'Alloy',   style: 'Neutral' },
  { id: 'echo',    label: 'Echo',    style: 'Calm' },
  { id: 'fable',   label: 'Fable',   style: 'Storytelling' },
  { id: 'onyx',    label: 'Onyx',    style: 'Documentary' },
  { id: 'nova',    label: 'Nova',    style: 'Energetic' },
  { id: 'shimmer', label: 'Shimmer', style: 'Soft & Warm' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'sw', label: 'Swahili' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
];

const MEDIA_TABS = [
  { id: 'voiceover',  label: 'Voiceover',  Icon: Mic },
  { id: 'subtitles',  label: 'Subtitles',  Icon: Captions },
  { id: 'transcribe', label: 'Transcribe', Icon: FileVideo },
  { id: 'shorts',     label: 'Shorts',     Icon: Film },
];

const SHORTS_PLATFORMS = [
  { id: 'youtube_shorts',   label: 'YouTube Shorts' },
  { id: 'tiktok',           label: 'TikTok' },
  { id: 'instagram_reels',  label: 'Instagram Reels' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function fmtTime(s) {
  const safe = Math.max(0, Math.floor(Number(s) || 0));
  const m = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 7,
      padding: '8px 11px', borderRadius: 8,
      border: `1px solid ${RED}33`, background: `${RED}0d`,
      color: RED, fontSize: 11, lineHeight: 1.5,
    }}>
      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{msg}</span>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, loading, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700,
        border: 'none',
        background: disabled ? 'var(--adm-hover-bg)' : `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
        color: disabled ? 'var(--adm-text-muted)' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        transition: 'all 0.15s',
      }}
    >
      {loading ? (
        <Loader2 size={14} style={{ animation: 'aim-spin 0.9s linear infinite' }} />
      ) : Icon ? (
        <Icon size={14} />
      ) : null}
      {children}
    </button>
  );
}

function SubtleButton({ children, onClick, icon: Icon, color = PURPLE }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600,
        border: `1px solid ${color}40`, background: `${color}0f`, color,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
      }}
    >
      {Icon && <Icon size={12} />}
      {children}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7,
    }}>
      {children}
    </div>
  );
}

// ── Voiceover Tab ─────────────────────────────────────────────────────────────
function VoiceoverTab({ body }) {
  const store = useAIStore();
  const [error, setError] = useState(null);

  const plain = useMemo(() => stripHtml(body || ''), [body]);
  const charCount = plain.length;

  const generate = useCallback(async () => {
    if (!plain) { setError('Add some article body content first.'); return; }
    store.setIsGeneratingVoiceover(true);
    store.setVoiceoverChunks([]);
    setError(null);
    try {
      const res = await fetch('/api/ai/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: plain,
          voice: store.audioVoice,
          speed: store.audioSpeed,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Generation failed');
      store.setVoiceoverChunks(json.data.chunks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      store.setIsGeneratingVoiceover(false);
    }
  }, [plain, store]);

  const downloadAll = () => {
    store.voiceoverChunks
      .filter((c) => c.url)
      .forEach((c, i) => {
        const a = document.createElement('a');
        a.href = c.url;
        a.download = `voiceover-${String(i + 1).padStart(3, '0')}.mp3`;
        a.target = '_blank';
        a.rel = 'noopener';
        a.click();
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '9px 11px', borderRadius: 8,
        background: PURPLE_LIGHT, border: `1px solid ${PURPLE_BORDER}`,
        fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.55,
      }}>
        Generates a natural AI voiceover of your full article using OpenAI TTS.
        Long text is split into chunks; play them in order.
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 11, color: 'var(--adm-text-muted)',
      }}>
        <span>Article length</span>
        <span style={{ fontWeight: 700, color: charCount > 0 ? PURPLE : 'var(--adm-text-subtle)' }}>
          {charCount.toLocaleString()} chars
        </span>
      </div>

      <div>
        <SectionLabel>Voice</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
          {VOICES.map((v) => {
            const active = store.audioVoice === v.id;
            return (
              <button
                key={v.id}
                onClick={() => store.setAudioVoice(v.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: '7px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                  border: `1px solid ${active ? PURPLE : 'var(--adm-border)'}`,
                  background: active ? PURPLE_LIGHT : 'transparent',
                  color: active ? PURPLE : 'var(--adm-text)',
                  textAlign: 'left', transition: 'all 0.13s',
                }}
              >
                <span style={{ fontWeight: 700 }}>{v.label}</span>
                <span style={{ fontSize: 10, opacity: 0.75 }}>{v.style}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Speed
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: PURPLE }}>{store.audioSpeed.toFixed(2)}×</span>
        </div>
        <input
          type="range" min={0.5} max={2.0} step={0.05} value={store.audioSpeed}
          onChange={(e) => store.setAudioSpeed(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: PURPLE }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--adm-text-subtle)' }}>
          <span>0.5× slower</span><span>2.0× faster</span>
        </div>
      </div>

      <PrimaryButton
        onClick={generate}
        disabled={store.isGeneratingVoiceover || !plain}
        loading={store.isGeneratingVoiceover}
        icon={Wand2}
      >
        {store.isGeneratingVoiceover ? 'Generating Voiceover…' : 'Generate Voiceover'}
      </PrimaryButton>

      <ErrorBox msg={error} />

      {store.voiceoverChunks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text)' }}>
              {store.voiceoverChunks.length} chunk{store.voiceoverChunks.length === 1 ? '' : 's'}
            </span>
            <SubtleButton icon={Download} onClick={downloadAll}>Download all</SubtleButton>
          </div>
          {store.voiceoverChunks.map((chunk, i) => (
            <div
              key={chunk.index || i}
              style={{
                padding: 10, borderRadius: 8,
                border: `1px solid ${chunk.error ? `${RED}40` : 'var(--adm-border)'}`,
                background: 'var(--adm-surface)',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 6, fontSize: 10, color: 'var(--adm-text-subtle)',
              }}>
                <span style={{ fontWeight: 700, color: 'var(--adm-text)' }}>Chunk {chunk.index || i + 1}</span>
                {!chunk.error && <span>≈ {fmtTime(chunk.durationEstimate)}</span>}
              </div>
              {chunk.error ? (
                <ErrorBox msg={chunk.error} />
              ) : (
                <>
                  <audio controls src={chunk.url} style={{ width: '100%', marginBottom: 6 }} />
                  <div style={{
                    fontSize: 11, color: 'var(--adm-text-muted)', lineHeight: 1.5,
                    maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {chunk.text?.slice(0, 200)}{chunk.text?.length > 200 ? '…' : ''}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Subtitles Tab ─────────────────────────────────────────────────────────────
function SubtitlesTab({ body, title }) {
  const store = useAIStore();
  const [text, setText] = useState(stripHtml(body || ''));
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState(null);

  const generate = useCallback(async () => {
    if (!text.trim()) { setError('Provide some text.'); return; }
    store.setIsGeneratingSubtitles(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, provider: store.provider }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Generation failed');
      store.setSubtitles({ vtt: json.data.vtt, cues: json.data.cues });
    } catch (err) {
      setError(err.message);
    } finally {
      store.setIsGeneratingSubtitles(false);
    }
  }, [text, language, store]);

  const downloadVtt = () => {
    const slug = (title || 'subtitles').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    downloadBlob(store.subtitlesVTT, `${slug || 'subtitles'}.vtt`, 'text/vtt');
  };

  const refillFromBody = () => setText(stripHtml(body || ''));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '9px 11px', borderRadius: 8,
        background: PURPLE_LIGHT, border: `1px solid ${PURPLE_BORDER}`,
        fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.55,
      }}>
        Splits text into 12-20 word cues with estimated timing and exports a WebVTT file.
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <SectionLabel>Source text</SectionLabel>
          <button
            onClick={refillFromBody}
            style={{
              fontSize: 10, fontWeight: 600, color: PURPLE,
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            ↺ Refill from editor
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Paste or sync text to caption…"
          style={{
            width: '100%', resize: 'vertical', borderRadius: 9, fontSize: 11,
            border: '1px solid var(--adm-border)', background: 'var(--adm-bg)',
            color: 'var(--adm-text)', padding: '9px 11px', outline: 'none',
            lineHeight: 1.55, boxSizing: 'border-box', minHeight: 120,
          }}
        />
      </div>

      <div>
        <SectionLabel>Language</SectionLabel>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
            background: 'var(--adm-bg)', color: 'var(--adm-text)',
            border: '1px solid var(--adm-border)', outline: 'none', cursor: 'pointer',
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      <PrimaryButton
        onClick={generate}
        disabled={store.isGeneratingSubtitles || !text.trim()}
        loading={store.isGeneratingSubtitles}
        icon={Captions}
      >
        {store.isGeneratingSubtitles ? 'Generating cues…' : 'Generate VTT'}
      </PrimaryButton>

      <ErrorBox msg={error} />

      {store.subtitlesCues?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text)' }}>
              {store.subtitlesCues.length} cues
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
              <SubtleButton icon={Copy} onClick={() => navigator.clipboard?.writeText(store.subtitlesVTT)}>
                Copy VTT
              </SubtleButton>
              <SubtleButton icon={Download} onClick={downloadVtt}>Download .vtt</SubtleButton>
            </div>
          </div>
          <div style={{
            maxHeight: 240, overflowY: 'auto',
            border: '1px solid var(--adm-border)', borderRadius: 8,
            background: 'var(--adm-surface)',
          }}>
            {store.subtitlesCues.map((cue, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: 8, padding: '7px 10px',
                  borderBottom: i < store.subtitlesCues.length - 1 ? '1px solid var(--adm-border)' : 'none',
                  fontSize: 11,
                }}
              >
                <span style={{ flexShrink: 0, color: PURPLE, fontWeight: 700, fontFamily: 'monospace', minWidth: 90 }}>
                  {fmtTime(cue.start)}–{fmtTime(cue.end)}
                </span>
                <span style={{ color: 'var(--adm-text)', lineHeight: 1.45 }}>{cue.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transcribe Tab ────────────────────────────────────────────────────────────
function TranscribeTab({ editor }) {
  const store = useAIStore();
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > 25) {
      setError(`File is ${sizeMB.toFixed(1)}MB. Whisper limit is 25MB. Compress before uploading.`);
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  };

  const transcribe = useCallback(async () => {
    if (!file) { setError('Choose an audio or video file.'); return; }
    store.setIsTranscribing(true);
    store.setTranscript({ transcript: '', segments: [] });
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ai/transcribe', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Transcription failed');
      store.setTranscript({ transcript: json.data.transcript, segments: json.data.segments || [] });
    } catch (err) {
      setError(err.message);
    } finally {
      store.setIsTranscribing(false);
    }
  }, [file, store]);

  const insertIntoEditor = () => {
    if (!editor) return;
    const segments = store.transcriptSegments;
    const html = segments.length
      ? segments
          .filter((s) => s.text)
          .map((s) => `<p><strong>[${fmtTime(s.start)}]</strong> ${s.text.replace(/</g, '&lt;')}</p>`)
          .join('\n')
      : `<p>${(store.transcript || '').replace(/</g, '&lt;')}</p>`;
    editor.commands.insertContent(html);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '9px 11px', borderRadius: 8,
        background: PURPLE_LIGHT, border: `1px solid ${PURPLE_BORDER}`,
        fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.55,
      }}>
        Transcribe an audio or video file via OpenAI Whisper. Files must be ≤ 25MB.
      </div>

      <div>
        <SectionLabel>Audio or video file</SectionLabel>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          onChange={onFile}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            width: '100%', padding: '20px', borderRadius: 9,
            border: `2px dashed ${file ? PURPLE : 'var(--adm-border)'}`,
            background: file ? PURPLE_LIGHT : 'transparent',
            color: file ? PURPLE : 'var(--adm-text-subtle)',
            cursor: 'pointer', fontSize: 12,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}
        >
          <Upload size={18} />
          <span style={{ fontWeight: 700 }}>
            {file ? file.name : 'Click to choose file'}
          </span>
          <span style={{ fontSize: 10, opacity: 0.8 }}>
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)}MB · ${file.type || 'unknown'}`
              : 'audio/* or video/* · ≤ 25MB'}
          </span>
        </button>
      </div>

      <PrimaryButton
        onClick={transcribe}
        disabled={store.isTranscribing || !file}
        loading={store.isTranscribing}
        icon={FileVideo}
      >
        {store.isTranscribing ? 'Transcribing…' : 'Transcribe'}
      </PrimaryButton>

      <ErrorBox msg={error} />

      {(store.transcript || store.transcriptSegments?.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text)' }}>
              {store.transcriptSegments?.length || 0} segments
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
              <SubtleButton icon={Copy} onClick={() => navigator.clipboard?.writeText(store.transcript)}>
                Copy
              </SubtleButton>
              <SubtleButton icon={Wand2} onClick={insertIntoEditor}>Insert into editor</SubtleButton>
            </div>
          </div>
          <div style={{
            maxHeight: 260, overflowY: 'auto',
            border: '1px solid var(--adm-border)', borderRadius: 8,
            background: 'var(--adm-surface)',
          }}>
            {store.transcriptSegments?.length > 0 ? (
              store.transcriptSegments.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', gap: 8, padding: '7px 10px',
                    borderBottom: i < store.transcriptSegments.length - 1 ? '1px solid var(--adm-border)' : 'none',
                    fontSize: 11,
                  }}
                >
                  <span style={{ flexShrink: 0, color: PURPLE, fontWeight: 700, fontFamily: 'monospace', minWidth: 50 }}>
                    {fmtTime(s.start)}
                  </span>
                  <span style={{ color: 'var(--adm-text)', lineHeight: 1.45 }}>{s.text}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: 12, fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.6 }}>
                {store.transcript}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shorts Tab ────────────────────────────────────────────────────────────────
function ShortsTab({ title, body }) {
  const store = useAIStore();
  const [platform, setPlatform] = useState('youtube_shorts');
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState(null);

  const generate = useCallback(async () => {
    setError(null);
    store.setIsGeneratingShorts(true);
    store.setShortsScript(null);
    try {
      const res = await fetch('/api/ai/shorts-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: stripHtml(body || ''),
          platform,
          duration,
          provider: store.provider,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Generation failed');
      store.setShortsScript(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      store.setIsGeneratingShorts(false);
    }
  }, [title, body, platform, duration, store]);

  const copy = (s) => navigator.clipboard?.writeText(s || '');

  const script = store.shortsScript;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '9px 11px', borderRadius: 8,
        background: PURPLE_LIGHT, border: `1px solid ${PURPLE_BORDER}`,
        fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.55,
      }}>
        Generates a scene-by-scene short-form video script with hook, voiceover, on-screen text, hashtags, and caption.
      </div>

      <div>
        <SectionLabel>Platform</SectionLabel>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
            background: 'var(--adm-bg)', color: 'var(--adm-text)',
            border: '1px solid var(--adm-border)', outline: 'none', cursor: 'pointer',
          }}
        >
          {SHORTS_PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <SectionLabel>Duration</SectionLabel>
        <div style={{ display: 'flex', gap: 5 }}>
          {[30, 60].map((d) => {
            const active = duration === d;
            return (
              <button
                key={d}
                onClick={() => setDuration(d)}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                  border: `1px solid ${active ? PURPLE : 'var(--adm-border)'}`,
                  background: active ? PURPLE_LIGHT : 'transparent',
                  color: active ? PURPLE : 'var(--adm-text)',
                  transition: 'all 0.13s',
                }}
              >
                {d}s
              </button>
            );
          })}
        </div>
      </div>

      <PrimaryButton
        onClick={generate}
        disabled={store.isGeneratingShorts || (!title && !body)}
        loading={store.isGeneratingShorts}
        icon={Film}
      >
        {store.isGeneratingShorts ? 'Generating script…' : 'Generate Script'}
      </PrimaryButton>

      <ErrorBox msg={error} />

      {script && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            padding: 12, borderRadius: 9,
            border: `1px solid ${PURPLE_BORDER}`, background: PURPLE_LIGHT,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Hook
              </span>
              <SubtleButton icon={Copy} onClick={() => copy(script.hook)}>Copy</SubtleButton>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--adm-text)', lineHeight: 1.4 }}>
              "{script.hook}"
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <SectionLabel>Scene-by-scene</SectionLabel>
              <span style={{ fontSize: 10, color: 'var(--adm-text-subtle)', fontWeight: 700 }}>
                <Clock size={10} style={{ marginRight: 3, verticalAlign: '-1px' }} />
                {script.totalDurationSec}s total
              </span>
            </div>
            <div style={{
              border: '1px solid var(--adm-border)', borderRadius: 8,
              background: 'var(--adm-surface)', overflow: 'hidden',
            }}>
              {(script.script || []).map((scene, i) => (
                <div
                  key={i}
                  style={{
                    padding: 10,
                    borderBottom: i < script.script.length - 1 ? '1px solid var(--adm-border)' : 'none',
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: PURPLE }}>
                      Scene {scene.scene}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>
                      {scene.durationSec}s
                    </span>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', marginRight: 5 }}>VO:</span>
                    <span style={{ fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.5 }}>{scene.voiceover}</span>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', marginRight: 5 }}>Visual:</span>
                    <span style={{ fontSize: 11, color: 'var(--adm-text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>{scene.visual}</span>
                  </div>
                  {scene.onScreenText && (
                    <div style={{
                      padding: '4px 8px', borderRadius: 5,
                      background: 'var(--adm-bg)', border: '1px dashed var(--adm-border)',
                      fontSize: 10, color: 'var(--adm-text)', fontWeight: 600,
                    }}>
                      ▭ {scene.onScreenText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {script.captions && (
            <div style={{
              padding: 10, borderRadius: 8,
              border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <SectionLabel>Caption</SectionLabel>
                <SubtleButton icon={Copy} onClick={() => copy(script.captions)}>Copy</SubtleButton>
              </div>
              <div style={{ fontSize: 11, color: 'var(--adm-text)', lineHeight: 1.55 }}>
                {script.captions}
              </div>
            </div>
          )}

          {script.hashtags?.length > 0 && (
            <div style={{
              padding: 10, borderRadius: 8,
              border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <SectionLabel>Hashtags</SectionLabel>
                <SubtleButton icon={Copy} onClick={() => copy(script.hashtags.join(' '))}>Copy all</SubtleButton>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {script.hashtags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 12,
                      background: PURPLE_LIGHT, color: PURPLE, fontWeight: 600,
                      border: `1px solid ${PURPLE_BORDER}`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export function AIMediaPanel({ editor, title = '', body = '' }) {
  const [tab, setTab] = useState('voiceover');

  return (
    <div>
      <style>{`@keyframes aim-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <Mic size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>AI Media Studio</div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>Voiceover · Subtitles · Transcribe · Shorts</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--adm-border)', marginBottom: 12,
      }}>
        {MEDIA_TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, padding: '8px 4px', fontSize: 10, fontWeight: 700,
                border: 'none', background: 'transparent',
                color: active ? PURPLE : 'var(--adm-text-subtle)',
                borderBottom: active ? `2px solid ${PURPLE}` : '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'color 0.12s',
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'voiceover' && <VoiceoverTab body={body} />}
          {tab === 'subtitles' && <SubtitlesTab body={body} title={title} />}
          {tab === 'transcribe' && <TranscribeTab editor={editor} />}
          {tab === 'shorts' && <ShortsTab title={title} body={body} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default AIMediaPanel;

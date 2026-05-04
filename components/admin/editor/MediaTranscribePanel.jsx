'use client';
import { useState, useCallback, useRef } from 'react';
import { Film, Upload, Loader2, AlertCircle, FileText, Plus } from 'lucide-react';

const CYAN = '#0891b2';
const CYAN_LIGHT = 'rgba(8,145,178,0.10)';
const MAX_BYTES = 25 * 1024 * 1024; // Whisper hard limit

function fmtTime(s) {
  const t = Math.floor(s || 0);
  const m = Math.floor(t / 60);
  const sec = String(t % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

export function MediaTranscribePanel({ editor }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const onPick = (e) => {
    const f = e.target.files?.[0] || null;
    setError(null); setResult(null);
    if (!f) { setFile(null); return; }
    if (f.size > MAX_BYTES) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB — please compress first.`);
      setFile(null);
      return;
    }
    setFile(f);
  };

  const transcribe = useCallback(async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ai/transcribe', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Transcription failed');
      setResult(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const insertTranscript = useCallback(() => {
    if (!editor || !result) return;
    const html = (result.segments || []).length > 0
      ? result.segments.map((s) => `<p><strong>[${fmtTime(s.start)}]</strong> ${s.text.trim()}</p>`).join('\n')
      : `<p>${(result.transcript || '').replace(/\n/g, '</p><p>')}</p>`;
    editor.commands.focus();
    editor.commands.insertContent(html);
  }, [editor, result]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg, ${CYAN}, #06b6d4)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Film size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>Media Transcribe</div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>
            Audio / video → text via Whisper. Max 25 MB.
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        onChange={onPick}
        style={{ display: 'none' }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        style={{
          padding: '14px', borderRadius: 9,
          border: `1.5px dashed ${file ? CYAN : 'var(--adm-border)'}`,
          background: file ? CYAN_LIGHT : 'transparent',
          color: file ? CYAN : 'var(--adm-text-muted)',
          cursor: 'pointer', fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}
      >
        <Upload size={13} /> {file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)` : 'Choose audio / video file'}
      </button>

      <button
        onClick={transcribe}
        disabled={!file || loading}
        style={{
          padding: '10px', borderRadius: 9, fontSize: 12, fontWeight: 700,
          border: 'none',
          background: !file || loading ? 'var(--adm-hover-bg)' : `linear-gradient(135deg, ${CYAN}, #06b6d4)`,
          color: !file || loading ? 'var(--adm-text-muted)' : '#fff',
          cursor: !file || loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}
        {loading ? 'Transcribing…' : 'Transcribe'}
      </button>

      {error && (
        <div style={{
          padding: '8px 11px', borderRadius: 7, fontSize: 11,
          background: 'rgba(239,68,68,0.08)', color: '#dc2626',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {result && (
        <div style={{
          padding: '11px', borderRadius: 9,
          border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              <FileText size={11} style={{ display: 'inline', marginRight: 4 }} />
              Transcript {result.language ? `(${result.language})` : ''}
            </div>
            <button
              onClick={insertTranscript}
              style={{
                padding: '5px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                border: 'none', background: CYAN, color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Plus size={10} /> Insert into editor
            </button>
          </div>
          <div style={{
            maxHeight: 280, overflowY: 'auto',
            fontSize: 11, lineHeight: 1.55, color: 'var(--adm-text)',
            padding: '6px 4px',
          }}>
            {(result.segments || []).length > 0 ? (
              result.segments.map((s, i) => (
                <p key={i} style={{ margin: '0 0 6px 0' }}>
                  <strong style={{ color: CYAN, fontSize: 10, marginRight: 5 }}>[{fmtTime(s.start)}]</strong>
                  {s.text}
                </p>
              ))
            ) : (
              <p style={{ margin: 0 }}>{result.transcript}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

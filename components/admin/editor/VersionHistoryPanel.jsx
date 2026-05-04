'use client';
import { useEffect, useState, useCallback } from 'react';
import { Clock, Save, RotateCcw, Trash2, AlertCircle } from 'lucide-react';

const AMBER = '#d97706';

const STORAGE_PREFIX = 'wu-versions:';
const MAX_VERSIONS = 20;

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return day < 30 ? `${day}d ago` : new Date(iso).toLocaleDateString();
}

function wordCount(html) {
  const text = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

export function VersionHistoryPanel({ editor, title, postId, onRestore }) {
  const storageKey = `${STORAGE_PREFIX}${postId || 'new'}`;
  const [versions, setVersions] = useState([]);
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setVersions(raw ? JSON.parse(raw) : []);
    } catch {
      setVersions([]);
    }
  }, [storageKey]);

  useEffect(() => { load(); }, [load]);

  const saveSnapshot = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    const next = [
      {
        id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: title || '(untitled)',
        body: html,
        savedAt: new Date().toISOString(),
        wordCount: wordCount(html),
      },
      ...versions,
    ].slice(0, MAX_VERSIONS);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setVersions(next);
    } catch (e) {
      // Storage quota — silently drop oldest until it fits
      const trimmed = next.slice(0, Math.max(1, Math.floor(next.length / 2)));
      try { localStorage.setItem(storageKey, JSON.stringify(trimmed)); setVersions(trimmed); } catch {}
    }
  }, [editor, title, versions, storageKey]);

  const restore = useCallback((v) => {
    if (!editor) return;
    if (onRestore) onRestore(v);
    else editor.commands.setContent(v.body || '');
    setConfirming(null);
  }, [editor, onRestore]);

  const remove = useCallback((id) => {
    const next = versions.filter((v) => v.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setVersions(next);
  }, [versions, storageKey]);

  const clearAll = useCallback(() => {
    localStorage.removeItem(storageKey);
    setVersions([]);
    setConfirming(null);
  }, [storageKey]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg, ${AMBER}, #f59e0b)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Clock size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--adm-text)' }}>Version History</div>
          <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>
            Local snapshots of your draft (max {MAX_VERSIONS}) — stored in this browser
          </div>
        </div>
      </div>

      <button
        onClick={saveSnapshot}
        style={{
          padding: '10px', borderRadius: 9, fontSize: 12, fontWeight: 700,
          border: 'none', background: `linear-gradient(135deg, ${AMBER}, #f59e0b)`, color: '#fff',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}
      >
        <Save size={13} /> Save snapshot
      </button>

      {versions.length === 0 && (
        <div style={{
          fontSize: 11, color: 'var(--adm-text-subtle)', textAlign: 'center',
          padding: '14px 0', border: '1px dashed var(--adm-border)', borderRadius: 9,
        }}>
          No snapshots yet. Click <strong style={{ color: AMBER }}>Save snapshot</strong> to create one.
        </div>
      )}

      {versions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {versions.map((v, i) => {
            const isConfirm = confirming === v.id;
            return (
              <div key={v.id} style={{
                padding: '9px 11px', borderRadius: 8,
                border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4,
                        background: 'var(--adm-hover-bg)', color: 'var(--adm-text-muted)',
                      }}>v{versions.length - i}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 2 }}>
                      {relativeTime(v.savedAt)} · {v.wordCount} words
                    </div>
                  </div>
                  {!isConfirm ? (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => setConfirming(v.id)}
                        title="Restore"
                        style={{
                          padding: '5px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                          border: 'none', background: AMBER, color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}
                      >
                        <RotateCcw size={10} /> Restore
                      </button>
                      <button
                        onClick={() => remove(v.id)}
                        title="Delete snapshot"
                        style={{
                          padding: '5px 7px', borderRadius: 5, fontSize: 10,
                          border: '1px solid var(--adm-border)', background: 'transparent',
                          color: 'var(--adm-text-subtle)', cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => restore(v)}
                        style={{
                          padding: '5px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                          border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer',
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        style={{
                          padding: '5px 8px', borderRadius: 5, fontSize: 10,
                          border: '1px solid var(--adm-border)', background: 'transparent',
                          color: 'var(--adm-text-subtle)', cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--adm-text-subtle)' }}>
            <AlertCircle size={11} />
            Local-only — clears if you switch browsers or wipe storage.
            <button
              onClick={clearAll}
              style={{ marginLeft: 'auto', fontSize: 10, color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

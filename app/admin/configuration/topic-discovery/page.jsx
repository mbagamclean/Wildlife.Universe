'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Lightbulb, Loader2, Sparkles, AlertCircle, Calendar, Send,
  Trash2, Bookmark, Folder, Hash, FileText, Plus,
} from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';
import { categories } from '@/lib/mock/categories';

const HORIZONS = [
  { key: 7,  label: '1 week',   days: 7 },
  { key: 30, label: '1 month',  days: 30 },
  { key: 90, label: '3 months', days: 90 },
];

const PROVIDERS = [
  { key: 'claude', label: 'Claude' },
  { key: 'openai', label: 'OpenAI' },
];

const TYPE_COLORS = {
  'How-To':           { bg: '#e6f0ff', fg: '#1a6eb5' },
  'Listicle':         { bg: '#e6f7e6', fg: '#1f5e1f' },
  'Ultimate Guide':   { bg: '#fff3cd', fg: '#a37500' },
  'Question':         { bg: '#f0e6ff', fg: '#6b2fb5' },
  'Comparison':       { bg: '#ffe6f0', fg: '#b51a6e' },
  'Problem-Solution': { bg: '#e6f7f7', fg: '#1a8c8c' },
};

const STORAGE_KEY = 'wu-topic-calendar';

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.Listicle;
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: c.bg, color: c.fg }}>
      {type}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function topicKey(t) {
  return `${t.suggestedDate || ''}::${t.title || ''}`;
}

export default function TopicDiscoveryPage() {
  const [category, setCategory]       = useState('');
  const [horizonKey, setHorizonKey]   = useState(30);
  const [postsCount, setPostsCount]   = useState(10);
  const [provider, setProvider]       = useState('claude');
  const [loading, setLoading]         = useState(false);
  const [topics, setTopics]           = useState([]);
  const [error, setError]             = useState('');
  const [saved, setSaved]             = useState([]);

  // Restore saved calendar
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(stored)) setSaved(stored);
    } catch { /* ignore */ }
  }, []);

  const persist = (next) => {
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const horizon = HORIZONS.find((h) => h.key === horizonKey) || HORIZONS[1];

  const run = async () => {
    setLoading(true);
    setError('');
    setTopics([]);
    try {
      const res = await fetch('/api/ai/topic-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          postsCount,
          timeHorizonDays: horizon.days,
          provider,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to discover topics');
      setTopics(json.data?.topics || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const savedKeys = useMemo(() => new Set(saved.map(topicKey)), [saved]);

  const addToCalendar = (topic) => {
    const key = topicKey(topic);
    if (savedKeys.has(key)) return;
    const next = [...saved, { ...topic, savedAt: new Date().toISOString(), category }];
    next.sort((a, b) => (a.suggestedDate || '').localeCompare(b.suggestedDate || ''));
    persist(next);
  };

  const removeFromCalendar = (topic) => {
    const key = topicKey(topic);
    persist(saved.filter((t) => topicKey(t) !== key));
  };

  const editorHref = (topic) => {
    const params = new URLSearchParams();
    if (topic.title) params.set('title', topic.title);
    if (topic.category) params.set('category', topic.category);
    else if (category) params.set('category', category);
    return `/admin/editor/new?${params.toString()}`;
  };

  return (
    <div className="p-5 sm:p-8">
      <AIPageHeader
        eyebrow="AI TOOLS"
        title="Topic Discovery"
        description="Plan an editorial calendar with AI-suggested topics balanced across formats and time."
        icon={Lightbulb}
        accent="#a37500"
      />

      {/* Input form */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Niche / category</p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
            style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
          >
            <option value="">Any wildlife niche</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Time horizon</p>
          <div className="flex gap-2">
            {HORIZONS.map((h) => (
              <button
                key={h.key}
                onClick={() => setHorizonKey(h.key)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                style={horizonKey === h.key
                  ? { background: '#a37500', color: '#fff' }
                  : { background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }
                }
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Posts ({postsCount})</p>
          <input
            type="range"
            min={5}
            max={30}
            value={postsCount}
            onChange={(e) => setPostsCount(Number(e.target.value))}
            className="w-32"
          />
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
            disabled={loading}
            className="flex h-full w-full items-center justify-center gap-2 rounded-2xl bg-[#a37500] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#7c5800] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Discovering…' : 'Discover Topics'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: '#fde2e2', color: '#7a1f1f', border: '1px solid #f5b7b7' }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Suggested topics */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" style={{ color: '#a37500' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>
            Suggested topics {topics.length > 0 ? `(${topics.length})` : ''}
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#a37500' }} />
          </div>
        ) : topics.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>
            Hit Discover Topics to generate a balanced editorial calendar.
          </p>
        ) : (
          <div className="space-y-2">
            {topics.map((t, i) => {
              const isSaved = savedKeys.has(topicKey(t));
              return (
                <div
                  key={i}
                  className="grid grid-cols-1 items-center gap-3 rounded-xl p-3 lg:grid-cols-[120px_1fr_auto]"
                  style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--adm-text-subtle)' }} />
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--adm-text-muted)' }}>
                      {formatDate(t.suggestedDate)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-bold" style={{ color: 'var(--adm-text)' }}>{t.title}</p>
                      <TypeBadge type={t.type} />
                      <span className="text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>~{t.estimatedWordCount} words</span>
                    </div>
                    {t.summary && (
                      <p className="text-[12px]" style={{ color: 'var(--adm-text-muted)' }}>{t.summary}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
                      {t.primaryKeyword && (
                        <span className="inline-flex items-center gap-1">
                          <Hash className="h-3 w-3" /> {t.primaryKeyword}
                        </span>
                      )}
                      {t.angle && <span className="italic">Angle: {t.angle}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addToCalendar(t)}
                      disabled={isSaved}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40"
                      style={{ background: 'var(--adm-surface)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }}
                      title={isSaved ? 'Already in calendar' : 'Save to calendar'}
                    >
                      {isSaved ? <Bookmark className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {isSaved ? 'Saved' : 'Save'}
                    </button>
                    <Link
                      href={editorHref(t)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg bg-[#a37500] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#7c5800]"
                    >
                      <Send className="h-3 w-3" /> Editor
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saved calendar */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" style={{ color: '#1a6eb5' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Saved calendar ({saved.length})</p>
          </div>
          {saved.length > 0 && (
            <button
              onClick={() => persist([])}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors"
              style={{ background: 'var(--adm-surface-2)', color: '#c0392b', border: '1px solid var(--adm-border)' }}
            >
              <Trash2 className="h-3 w-3" /> Clear all
            </button>
          )}
        </div>

        {saved.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>
            No topics saved yet. Click Save on any suggested topic to build your calendar.
          </p>
        ) : (
          <div className="space-y-2">
            {saved.map((t, i) => (
              <div
                key={i}
                className="grid grid-cols-1 items-center gap-3 rounded-xl p-3 lg:grid-cols-[120px_1fr_auto]"
                style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--adm-text-subtle)' }} />
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--adm-text-muted)' }}>
                    {formatDate(t.suggestedDate)}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-bold" style={{ color: 'var(--adm-text)' }}>{t.title}</p>
                    <TypeBadge type={t.type} />
                    {t.category && (
                      <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
                        <Folder className="h-3 w-3" /> {t.category}
                      </span>
                    )}
                  </div>
                  {t.primaryKeyword && (
                    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
                      <Hash className="h-3 w-3" /> {t.primaryKeyword}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={editorHref(t)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-[#1a6eb5] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#155a96]"
                  >
                    <FileText className="h-3 w-3" /> Open in editor
                  </Link>
                  <button
                    onClick={() => removeFromCalendar(t)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors"
                    style={{ background: 'var(--adm-surface)', color: '#c0392b', border: '1px solid var(--adm-border)' }}
                    title="Remove from calendar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

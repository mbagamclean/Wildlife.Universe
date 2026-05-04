'use client';

import { useEffect, useState } from 'react';
import {
  ClipboardCheck, BookOpen, Search, Type, Users, ListChecks, Lightbulb,
  Loader2, Sparkles, AlertCircle, RefreshCw, Save, Trash2, FileText,
} from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';
import { PostPicker } from '@/components/admin/configuration/PostPicker';

const TABS = [
  { key: 'overview',     label: 'Overview',     icon: ClipboardCheck },
  { key: 'readability',  label: 'Readability',  icon: BookOpen },
  { key: 'seo',          label: 'SEO',          icon: Search },
  { key: 'headline',     label: 'Headline',     icon: Type },
  { key: 'engagement',   label: 'Engagement',   icon: Users },
  { key: 'checklist',    label: 'Checklist',    icon: ListChecks },
  { key: 'suggestions',  label: 'Suggestions',  icon: Lightbulb },
];

const initialState = {
  quality:    null, // /api/ai/content-quality
  proofread:  null, // /api/ai/proofread
  seo:        null, // /api/ai/seo (analyze)
  plagiarism: null, // /api/ai/plagiarism
  adsense:    null, // /api/ai/adsense-check
  headlines:  null, // /api/ai/headlines
  discover:   null, // /api/ai/discover-score
};

function plainText(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function safeJson(res) {
  try { return await res.json(); } catch { return { success: false, error: 'Invalid JSON' }; }
}

function ScoreBadge({ score, size = 'md' }) {
  const color = score >= 80 ? '#008000' : score >= 60 ? '#d4af37' : '#c0392b';
  const dim   = size === 'lg' ? 'h-12 w-12 text-lg' : 'h-8 w-8 text-[12px]';
  return (
    <span className={`inline-flex items-center justify-center rounded-xl font-black ${dim}`} style={{ background: `${color}20`, color }}>
      {score}
    </span>
  );
}

export default function EditorialReviewPage() {
  const [post, setPost]           = useState(null);
  const [provider, setProvider]   = useState('claude');
  const [tab, setTab]             = useState('overview');
  const [state, setState]         = useState(initialState);
  const [loading, setLoading]     = useState({}); // { quality: true, ... }
  const [error, setError]         = useState('');
  const [savedAt, setSavedAt]     = useState('');
  const [history, setHistory]     = useState([]);

  // Restore prior review for this post if any
  useEffect(() => {
    if (!post) {
      setState(initialState);
      setSavedAt('');
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(`wu-editorial-reviews-${post.id}`) || 'null');
      if (saved) {
        setState(saved.state || initialState);
        setSavedAt(saved.savedAt || '');
      } else {
        setState(initialState);
        setSavedAt('');
      }
    } catch {
      setState(initialState);
      setSavedAt('');
    }
  }, [post]);

  // Load list of historical reviews from localStorage
  useEffect(() => {
    refreshHistory();
  }, []);

  const refreshHistory = () => {
    if (typeof window === 'undefined') return;
    const list = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('wu-editorial-reviews-')) {
        try {
          const v = JSON.parse(localStorage.getItem(k));
          list.push({ key: k, postId: k.replace('wu-editorial-reviews-', ''), ...v });
        } catch { /* ignore */ }
      }
    }
    list.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
    setHistory(list);
  };

  const setLoad = (key, val) => setLoading((s) => ({ ...s, [key]: val }));

  const apiCall = async (key, url, body) => {
    setLoad(key, true);
    setError('');
    try {
      const res  = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, provider }),
      });
      const json = await safeJson(res);
      if (!json.success) throw new Error(json.error || 'Request failed');
      setState((s) => ({ ...s, [key]: json.data }));
      return json.data;
    } catch (err) {
      setError(`${key}: ${err.message}`);
      return null;
    } finally {
      setLoad(key, false);
    }
  };

  const runQuality    = () => post && apiCall('quality',    '/api/ai/content-quality', { title: post.title, content: post.body, excerpt: post.excerpt });
  const runProofread  = () => post && apiCall('proofread',  '/api/ai/proofread',       { text: post.body });
  const runSeo        = () => post && apiCall('seo',        '/api/ai/seo',             { title: post.title, body: post.body, task: 'analyze' });
  const runHeadlines  = () => post && apiCall('headlines',  '/api/ai/headlines',       { topic: post.title, category: post.category || '', count: 8 });
  const runPlagiarism = () => post && apiCall('plagiarism', '/api/ai/plagiarism',      { content: post.body });
  const runAdsense    = () => post && apiCall('adsense',    '/api/ai/adsense-check',   { title: post.title, content: post.body, excerpt: post.excerpt });
  const runDiscover   = () => post && apiCall('discover',   '/api/ai/discover-score',  { title: post.title, content: post.body, cover: post.cover || '' });

  const runAll = async () => {
    if (!post) return;
    setError('');
    await Promise.allSettled([
      runQuality(),
      runProofread(),
      runSeo(),
      runHeadlines(),
      runPlagiarism(),
      runAdsense(),
      runDiscover(),
    ]);
  };

  const saveReview = () => {
    if (!post) return;
    const at = new Date().toISOString();
    localStorage.setItem(
      `wu-editorial-reviews-${post.id}`,
      JSON.stringify({ state, savedAt: at, postTitle: post.title })
    );
    setSavedAt(at);
    refreshHistory();
  };

  const deleteReview = (key) => {
    localStorage.removeItem(key);
    refreshHistory();
    if (post && key === `wu-editorial-reviews-${post.id}`) {
      setSavedAt('');
    }
  };

  const overallScore = (() => {
    const parts = [];
    if (state.quality)    parts.push(state.quality.score);
    if (state.discover)   parts.push(state.discover.score);
    if (state.adsense)    parts.push(state.adsense.score);
    if (state.plagiarism) parts.push(state.plagiarism.originalityScore);
    if (parts.length === 0) return null;
    return Math.round(parts.reduce((s, v) => s + v, 0) / parts.length);
  })();

  return (
    <div className="p-5 sm:p-8">
      <AIPageHeader
        eyebrow="EDITORIAL"
        title="AI Editorial Review"
        description="Run a 7-step AI quality, SEO, and AdSense review across an entire post."
        icon={ClipboardCheck}
        accent="#6b9fdb"
      />

      {/* Post + actions row */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
        <PostPicker value={post} onChange={(p) => { setPost(p); setError(''); }} />
        <div className="flex items-end">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="h-full rounded-xl px-3 py-3 text-sm font-semibold focus:outline-none"
            style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)', boxShadow: 'var(--adm-shadow)' }}
          >
            <option value="claude">Claude</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={runAll}
            disabled={!post || Object.values(loading).some(Boolean)}
            className="flex items-center gap-2 rounded-2xl bg-[#6b9fdb] px-5 py-3 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Object.values(loading).some(Boolean) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Run all checks
          </button>
          <button
            onClick={saveReview}
            disabled={!post || overallScore == null}
            className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--adm-surface)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}
          >
            <Save className="h-4 w-4" />
            {savedAt ? 'Re-save' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: '#fde2e2', color: '#7a1f1f', border: '1px solid #f5b7b7' }}>
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!post ? (
        <SavedHistory history={history} onDelete={deleteReview} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
          {/* Tabs nav */}
          <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {TABS.map((t) => {
              const filledKey = ({
                overview: ['quality','seo','plagiarism','adsense','discover'],
                readability: ['proofread','plagiarism'],
                seo: ['seo'],
                headline: ['headlines','discover'],
                engagement: ['discover','quality'],
                checklist: ['adsense','quality'],
                suggestions: ['quality','seo','discover'],
              })[t.key];
              const done = filledKey?.some((k) => !!state[k]);
              const isLoading = filledKey?.some((k) => loading[k]);
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all"
                  style={tab === t.key
                    ? { background: '#6b9fdb', color: '#fff', boxShadow: '0 2px 8px rgba(107,159,219,0.3)' }
                    : done
                    ? { background: '#00800015', color: 'var(--adm-text)', border: '1px solid #00800040' }
                    : { background: 'var(--adm-surface)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }
                  }
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <t.icon className="h-3.5 w-3.5" />}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="rounded-2xl p-5 min-h-[400px]" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
            {tab === 'overview'     && <OverviewTab    state={state} overall={overallScore} loading={loading} onRunAll={runAll} post={post} />}
            {tab === 'readability'  && <ReadabilityTab data={state.proofread} onRun={runProofread} loading={!!loading.proofread} />}
            {tab === 'seo'          && <SeoTab         data={state.seo}       onRun={runSeo}       loading={!!loading.seo} />}
            {tab === 'headline'     && <HeadlineTab    data={state.headlines} discover={state.discover} onRun={runHeadlines} onRunDiscover={runDiscover} loading={!!loading.headlines} loadingDiscover={!!loading.discover} post={post} />}
            {tab === 'engagement'   && <EngagementTab  discover={state.discover} quality={state.quality} onRunDiscover={runDiscover} onRunQuality={runQuality} loadingDiscover={!!loading.discover} loadingQuality={!!loading.quality} />}
            {tab === 'checklist'    && <ChecklistTab   adsense={state.adsense} quality={state.quality} onRunAdsense={runAdsense} onRunQuality={runQuality} loadingAdsense={!!loading.adsense} loadingQuality={!!loading.quality} />}
            {tab === 'suggestions'  && <SuggestionsTab quality={state.quality} discover={state.discover} seo={state.seo} onRunQuality={runQuality} onRunDiscover={runDiscover} onRunSeo={runSeo} loading={loading} />}
          </div>
        </div>
      )}

      {post && history.length > 0 && (
        <div className="mt-6">
          <SavedHistory history={history} onDelete={deleteReview} />
        </div>
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function RunBlock({ label, onRun, loading, accent = '#6b9fdb' }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${accent}18` }}>
        {loading ? <Loader2 className="h-6 w-6 animate-spin" style={{ color: accent }} /> : <Sparkles className="h-6 w-6" style={{ color: accent }} />}
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--adm-text)' }}>{label}</p>
      <button
        onClick={onRun}
        disabled={loading}
        className="rounded-xl px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-50"
        style={{ background: accent }}
      >
        {loading ? 'Analysing…' : 'Run analysis'}
      </button>
    </div>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────────
function OverviewTab({ state, overall, loading, onRunAll, post }) {
  const items = [
    { key: 'quality',    label: 'Content quality', value: state.quality?.score, color: '#008000' },
    { key: 'discover',   label: 'Discover score',  value: state.discover?.score, color: '#6b9fdb' },
    { key: 'adsense',    label: 'AdSense',         value: state.adsense?.score,  color: '#d4af37' },
    { key: 'plagiarism', label: 'Originality',     value: state.plagiarism?.originalityScore, color: '#e06c9f' },
  ];

  if (overall == null) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: '#6b9fdb18' }}>
          <ClipboardCheck className="h-8 w-8" style={{ color: '#6b9fdb' }} />
        </div>
        <p className="text-base font-bold" style={{ color: 'var(--adm-text)' }}>Ready to review</p>
        <p className="max-w-md text-sm" style={{ color: 'var(--adm-text-muted)' }}>
          Hit "Run all checks" to score this post on quality, readability, SEO, headlines, engagement, AdSense compliance, and originality.
        </p>
        <button
          onClick={onRunAll}
          className="mt-2 flex items-center gap-2 rounded-xl bg-[#6b9fdb] px-5 py-2.5 text-sm font-bold text-white"
        >
          <Sparkles className="h-4 w-4" /> Run all checks
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
        <ScoreBadge score={overall} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--adm-text-subtle)' }}>Overall editorial score</p>
          <h3 className="text-lg font-black" style={{ color: 'var(--adm-text)' }}>{post.title}</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((i) => (
          <div key={i.key} className="rounded-xl p-3" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>{i.label}</p>
            <p className="mt-1 text-2xl font-black" style={{ color: i.value != null ? i.color : 'var(--adm-text-subtle)' }}>
              {i.value != null ? i.value : (loading[i.key] ? '…' : '—')}
            </p>
          </div>
        ))}
      </div>

      {state.quality?.dimensions && (
        <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-2 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Quality dimensions</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {Object.entries(state.quality.dimensions).map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>{k}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full" style={{ background: 'var(--adm-surface-3)' }}>
                    <div className="h-full rounded-full" style={{ width: `${v}%`, background: v >= 80 ? '#008000' : v >= 60 ? '#d4af37' : '#c0392b' }} />
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: 'var(--adm-text)' }}>{v}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onRunAll}
        className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
        style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}
      >
        <RefreshCw className="h-3.5 w-3.5" /> Re-run all checks
      </button>
    </div>
  );
}

function ReadabilityTab({ data, onRun, loading }) {
  if (!data) return <RunBlock label="Run readability + proofreading" onRun={onRun} loading={loading} />;
  return (
    <div>
      {data.summary && (
        <p className="mb-4 rounded-xl p-3 text-[13px]" style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}>
          {data.summary}
        </p>
      )}
      <p className="mb-2 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>
        Corrections ({data.corrections.length})
      </p>
      {data.corrections.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--adm-text-subtle)' }}>No corrections suggested — clean copy.</p>
      ) : (
        <div className="space-y-2">
          {data.corrections.map((c, i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#c0392b' }}>Original</p>
                  <p className="text-[13px] line-through" style={{ color: 'var(--adm-text-muted)' }}>{c.original}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#008000' }}>Suggestion</p>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{c.suggestion}</p>
                </div>
              </div>
              {(c.reason || c.type) && (
                <p className="mt-2 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
                  {c.type ? <span className="mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'var(--adm-surface-3)', color: 'var(--adm-text-muted)' }}>{c.type}</span> : null}
                  {c.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SeoTab({ data, onRun, loading }) {
  if (!data) return <RunBlock label="Run SEO analysis" onRun={onRun} loading={loading} />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat small label="Primary keyword" value={data.primaryKeyword || '—'} />
        <Stat small label="Word count"      value={data.wordCount || '—'} />
        <Stat small label="Readability"     value={`${data.readabilityScore || 0}/100`} />
        <Stat small label="EEAT"            value={`${data.eeatScore || 0}/100`} />
      </div>

      {data.recommendations?.length > 0 && (
        <Section title="Recommendations" color="#d4af37">
          {data.recommendations.map((r, i) => <Bullet key={i} color="#d4af37">{r}</Bullet>)}
        </Section>
      )}
      {data.contentGaps?.length > 0 && (
        <Section title="Content gaps" color="#e06c9f">
          {data.contentGaps.map((r, i) => <Bullet key={i} color="#e06c9f">{r}</Bullet>)}
        </Section>
      )}
      {data.lsiKeywords?.length > 0 && (
        <Section title="LSI keywords" color="#008000">
          <div className="flex flex-wrap gap-2">
            {data.lsiKeywords.map((k, i) => (
              <span key={i} className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}>{k}</span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function HeadlineTab({ data, discover, onRun, onRunDiscover, loading, loadingDiscover, post }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>Current headline</p>
        <p className="mt-1 text-base font-bold" style={{ color: 'var(--adm-text)' }}>{post.title}</p>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--adm-text-muted)' }}>{post.title.length} characters</p>
      </div>

      {!data ? (
        <RunBlock label="Generate alternative headlines" onRun={onRun} loading={loading} />
      ) : (
        <div className="rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Alternative headlines</p>
            <button onClick={onRun} className="text-[11px] font-semibold" style={{ color: '#6b9fdb' }}>Re-generate</button>
          </div>
          <ul className="space-y-2">
            {data.headlines?.map((h, i) => (
              <li key={i} className="rounded-lg p-3" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{h.headline}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'var(--adm-surface-3)', color: 'var(--adm-text-muted)' }}>{h.type}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: '#00800018', color: '#008000' }}>Vol · {h.searchVolume}</span>
                  <span className="text-[10px]" style={{ color: 'var(--adm-text-subtle)' }}>~{h.estimatedWordCount} words</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Headline curiosity gap (Discover)</p>
          {discover && <ScoreBadge score={discover.score} />}
        </div>
        {!discover ? (
          <RunBlock label="Score Discover potential" onRun={onRunDiscover} loading={loadingDiscover} accent="#6b9fdb" />
        ) : (
          <p className="text-[13px]" style={{ color: 'var(--adm-text)' }}>{discover.verdict}</p>
        )}
      </div>
    </div>
  );
}

function EngagementTab({ discover, quality, onRunDiscover, onRunQuality, loadingDiscover, loadingQuality }) {
  const engagement = quality?.dimensions?.engagement;
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Engagement score (Quality)</p>
          {engagement != null && <ScoreBadge score={engagement} />}
        </div>
        {!quality ? (
          <RunBlock label="Score engagement potential" onRun={onRunQuality} loading={loadingQuality} accent="#008000" />
        ) : (
          <p className="text-[13px]" style={{ color: 'var(--adm-text-muted)' }}>
            Engagement is the predicted ability of the article to hold a reader's attention end-to-end.
          </p>
        )}
      </div>

      <div className="rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Discover shareability</p>
          {discover && <ScoreBadge score={discover.score} />}
        </div>
        {!discover ? (
          <RunBlock label="Score shareability" onRun={onRunDiscover} loading={loadingDiscover} accent="#6b9fdb" />
        ) : (
          <p className="text-[13px]" style={{ color: 'var(--adm-text)' }}>{discover.verdict}</p>
        )}
      </div>
    </div>
  );
}

function ChecklistTab({ adsense, quality, onRunAdsense, onRunQuality, loadingAdsense, loadingQuality }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>AdSense compliance</p>
          {adsense && <ScoreBadge score={adsense.score} />}
        </div>
        {!adsense ? (
          <RunBlock label="Run AdSense check" onRun={onRunAdsense} loading={loadingAdsense} accent="#d4af37" />
        ) : (
          <div className="space-y-3">
            {adsense.issues?.length > 0 && (
              <Section title="Issues" color="#c0392b">
                {adsense.issues.map((s, i) => <Bullet key={i} color="#c0392b">{s}</Bullet>)}
              </Section>
            )}
            {adsense.warnings?.length > 0 && (
              <Section title="Warnings" color="#d4af37">
                {adsense.warnings.map((s, i) => <Bullet key={i} color="#d4af37">{s}</Bullet>)}
              </Section>
            )}
            {adsense.recommendations?.length > 0 && (
              <Section title="Recommendations" color="#008000">
                {adsense.recommendations.map((s, i) => <Bullet key={i} color="#008000">{s}</Bullet>)}
              </Section>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Structural checklist</p>
          {quality?.dimensions?.structure != null && <ScoreBadge score={quality.dimensions.structure} />}
        </div>
        {!quality ? (
          <RunBlock label="Run structure analysis" onRun={onRunQuality} loading={loadingQuality} accent="#008000" />
        ) : quality.strengths?.length ? (
          <Section title="Structural strengths" color="#008000">
            {quality.strengths.map((s, i) => <Bullet key={i} color="#008000">{s}</Bullet>)}
          </Section>
        ) : (
          <p className="text-sm" style={{ color: 'var(--adm-text-subtle)' }}>No structural notes.</p>
        )}
      </div>
    </div>
  );
}

function SuggestionsTab({ quality, discover, seo, onRunQuality, onRunDiscover, onRunSeo, loading }) {
  if (!quality && !discover && !seo) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl p-4" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
          <RunBlock label="Get quality suggestions" onRun={onRunQuality} loading={!!loading.quality} accent="#008000" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quality?.recommendations?.length > 0 && (
        <Section title="Quality recommendations" color="#008000">
          {quality.recommendations.map((s, i) => <Bullet key={i} color="#008000">{s}</Bullet>)}
        </Section>
      )}
      {discover?.improvements?.length > 0 && (
        <Section title="Discover improvements" color="#6b9fdb">
          {discover.improvements.map((s, i) => <Bullet key={i} color="#6b9fdb">{s}</Bullet>)}
        </Section>
      )}
      {seo?.recommendations?.length > 0 && (
        <Section title="SEO recommendations" color="#d4af37">
          {seo.recommendations.map((s, i) => <Bullet key={i} color="#d4af37">{s}</Bullet>)}
        </Section>
      )}
    </div>
  );
}

// ── Saved history ─────────────────────────────────────────────────────────────
function SavedHistory({ history, onDelete }) {
  if (history.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl text-center"
        style={{ background: 'var(--adm-surface)', border: '1px dashed var(--adm-border)' }}
      >
        <FileText className="h-6 w-6" style={{ color: 'var(--adm-text-subtle)' }} />
        <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>No saved reviews yet.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
      <p className="mb-3 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>Saved reviews ({history.length})</p>
      <div className="space-y-2">
        {history.map((h) => (
          <div key={h.key} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
            <FileText className="h-4 w-4 flex-shrink-0" style={{ color: '#6b9fdb' }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{h.postTitle || h.postId}</p>
              <p className="text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{h.savedAt ? new Date(h.savedAt).toLocaleString() : ''}</p>
            </div>
            <button
              onClick={() => onDelete(h.key)}
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'var(--adm-surface)', color: '#c0392b', border: '1px solid var(--adm-border)' }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function Section({ title, color, children }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{title}</p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function Bullet({ children, color }) {
  return (
    <li className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--adm-text)' }}>
      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: color }} />
      {children}
    </li>
  );
}

function Stat({ label, value, small }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--adm-text-subtle)' }}>{label}</p>
      <p className={`mt-0.5 ${small ? 'text-sm' : 'text-base'} font-black`} style={{ color: 'var(--adm-text)' }}>{value}</p>
    </div>
  );
}

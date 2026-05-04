'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Loader2, AlertCircle, ExternalLink, CheckCircle2, XCircle, HelpCircle, Clock, RefreshCw } from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';

const STORAGE_KEY = 'wu-indexing-checks';

function loadCache() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(cache) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)); } catch {}
}

function siteOrigin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export default function IndexingMonitorPage() {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const [cache, setCache] = useState({});
  const [checkingAll, setCheckingAll] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [perRowChecking, setPerRowChecking] = useState(new Set());

  useEffect(() => { setCache(loadCache()); }, []);

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true); setPostsError(null);
    try {
      const res = await fetch('/api/admin/posts?status=published&limit=500');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load posts');
      setPosts(json.posts || []);
    } catch (e) {
      setPostsError(e.message);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const checkOne = useCallback(async (url) => {
    setPerRowChecking((s) => new Set(s).add(url));
    try {
      const res = await fetch(`/api/admin/indexing/check?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      const entry = {
        indexed: json.indexed,
        checkedAt: json.checkedAt,
        error: json.error || null,
      };
      const next = { ...cache, [url]: entry };
      setCache(next);
      saveCache(next);
    } finally {
      setPerRowChecking((s) => { const n = new Set(s); n.delete(url); return n; });
    }
  }, [cache]);

  const checkAll = useCallback(async () => {
    if (checkingAll) return;
    setCheckingAll(true);
    const urls = posts.map((p) => `${siteOrigin()}/posts/${p.slug}`);
    setBatchProgress({ done: 0, total: urls.length });
    let working = { ...cache };
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const res = await fetch(`/api/admin/indexing/check?url=${encodeURIComponent(url)}`);
        const json = await res.json();
        working = { ...working, [url]: { indexed: json.indexed, checkedAt: json.checkedAt, error: json.error || null } };
        setCache(working);
        saveCache(working);
      } catch {}
      setBatchProgress({ done: i + 1, total: urls.length });
      // 2s throttle to avoid Google rate limit
      if (i < urls.length - 1) await new Promise((r) => setTimeout(r, 2000));
    }
    setCheckingAll(false);
  }, [posts, cache, checkingAll]);

  return (
    <div className="p-5 sm:p-8">
      <AIPageHeader
        eyebrow="AI TOOLS"
        title="Indexing Monitor"
        description="Best-effort Google indexing check for each published post. Heavily rate-limited — manual checks recommended."
        icon={Search}
        accent="#1a6eb5"
      />

      <div
        className="mb-5 rounded-2xl p-4 text-sm"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#a16207' }}
      >
        <strong>Note:</strong> Indexing checks scrape Google&rsquo;s public SERP (`site:` query). Google rate-limits aggressively. For production, configure{' '}
        <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="underline font-semibold">Google Search Console</a>{' '}
        and submit your sitemap (<code>/sitemap.xml</code>) for accurate, real-time indexing data.
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={checkAll}
            disabled={loadingPosts || checkingAll || posts.length === 0}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all"
            style={{
              background: checkingAll ? 'var(--adm-hover-bg)' : '#1a6eb5',
              color: checkingAll ? 'var(--adm-text-muted)' : '#fff',
              cursor: checkingAll || loadingPosts ? 'not-allowed' : 'pointer',
              opacity: loadingPosts || posts.length === 0 ? 0.5 : 1,
            }}
          >
            {checkingAll
              ? (<><Loader2 size={14} className="animate-spin" /> Checking {batchProgress.done}/{batchProgress.total}…</>)
              : (<><Search size={14} /> Check all ({posts.length})</>)}
          </button>
          <button
            onClick={fetchPosts}
            disabled={loadingPosts}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
            style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
          >
            <RefreshCw size={12} className={loadingPosts ? 'animate-spin' : ''} />
            Reload posts
          </button>
        </div>
      </div>

      {postsError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertCircle className="h-4 w-4" /> {postsError}
        </div>
      )}

      {loadingPosts && posts.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--adm-text-muted)' }} />
        </div>
      )}

      {!loadingPosts && posts.length === 0 && (
        <div className="rounded-2xl py-20 text-center" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
          <p className="text-sm" style={{ color: 'var(--adm-text-subtle)' }}>No published posts to check yet.</p>
        </div>
      )}

      {posts.length > 0 && (
        <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text-subtle)' }}>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Post</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Last Checked</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const url = `${siteOrigin()}/posts/${p.slug}`;
                const entry = cache[url];
                const checking = perRowChecking.has(url);
                return (
                  <tr key={p.id} className="border-t" style={{ borderColor: 'var(--adm-border)' }}>
                    <td className="px-4 py-3">
                      <Link href={`/posts/${p.slug}`} target="_blank" className="block truncate font-semibold hover:underline" style={{ color: 'var(--adm-text)' }}>
                        {p.title}
                      </Link>
                      <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>/posts/{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
                      {entry?.checkedAt
                        ? new Date(entry.checkedAt).toLocaleString()
                        : <span style={{ color: 'var(--adm-text-subtle)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill entry={entry} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => checkOne(url)}
                          disabled={checking}
                          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                          style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
                        >
                          {checking ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
                          Check
                        </button>
                        <a
                          href={`https://search.google.com/search-console/inspect?utf8=%E2%9C%93&url=${encodeURIComponent(url)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                          style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text-muted)' }}
                        >
                          <ExternalLink size={11} /> GSC
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ entry }) {
  if (!entry) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text-subtle)' }}>
        <HelpCircle size={11} /> Unknown
      </span>
    );
  }
  if (entry.error === 'rate_limited') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-700">
        <Clock size={11} /> Rate limited
      </span>
    );
  }
  if (entry.indexed === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-[11px] font-bold text-green-700">
        <CheckCircle2 size={11} /> Indexed
      </span>
    );
  }
  if (entry.indexed === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-700">
        <XCircle size={11} /> Not indexed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text-subtle)' }}>
      <HelpCircle size={11} /> Unknown
    </span>
  );
}

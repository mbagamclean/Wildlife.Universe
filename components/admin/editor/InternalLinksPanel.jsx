'use client';
import { useEffect, useState, useCallback } from 'react';
import { Link2, Loader2, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { useAIStore } from '@/lib/stores/aiStore';

const PURPLE = '#7c3aed';

export function InternalLinksPanel({ editor }) {
  const { provider } = useAIStore();
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const res = await fetch('/api/admin/posts?status=published&limit=500');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load posts');
      setPosts(json.posts || []);
    } catch (e) {
      setPostsError(e.message);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const runSuggestions = useCallback(async () => {
    const content = editor?.getHTML() || '';
    if (!content.trim()) {
      setError('Write some content in the editor first.');
      return;
    }
    if (posts.length === 0) {
      setError('No published posts available to link to.');
      return;
    }
    setRunning(true);
    setError(null);
    setSuggestions([]);
    try {
      const res = await fetch('/api/ai/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          existingPosts: posts.slice(0, 50).map(p => ({
            title: p.title,
            slug: p.slug,
            excerpt: p.excerpt || '',
          })),
          provider,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Suggestion failed');
      setSuggestions(json.data?.suggestions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [editor, posts, provider]);

  const insertLink = useCallback((suggestion) => {
    if (!editor) return;
    const { anchorText, targetSlug } = suggestion;
    if (!anchorText || !targetSlug) return;
    const html = editor.getHTML();
    const linkHtml = `<a href="/posts/${targetSlug}">${anchorText}</a>`;
    if (html.includes(anchorText)) {
      const updated = html.replace(anchorText, linkHtml);
      editor.commands.setContent(updated);
    } else {
      editor.commands.insertContent(` ${linkHtml}`);
    }
  }, [editor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        padding: '10px 12px', borderRadius: 8,
        background: 'rgba(124,58,237,0.07)', border: `1px solid rgba(124,58,237,0.2)`,
        fontSize: 11, color: PURPLE, lineHeight: 1.55,
      }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link2 size={13} /> Internal Link Suggestions
        </strong>
        <div style={{ marginTop: 4 }}>
          AI suggests where to link to other published posts based on your content.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={runSuggestions}
          disabled={running || postsLoading}
          style={{
            flex: 1, padding: '10px', borderRadius: 9,
            background: running || postsLoading ? 'var(--adm-hover-bg)' : `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
            color: running || postsLoading ? 'var(--adm-text-muted)' : '#fff',
            fontWeight: 700, fontSize: 12, border: 'none',
            cursor: running || postsLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          {running
            ? (<><Loader2 size={13} className="animate-spin" /> Analyzing…</>)
            : (<><Link2 size={13} /> Suggest Links</>)}
        </button>
        <button
          onClick={fetchPosts}
          title="Refresh post list"
          disabled={postsLoading}
          style={{
            padding: '10px 11px', borderRadius: 9,
            border: '1px solid var(--adm-border)', background: 'transparent',
            color: 'var(--adm-text-muted)', cursor: postsLoading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <RefreshCw size={13} className={postsLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)' }}>
        {postsLoading
          ? 'Loading published posts…'
          : postsError
            ? `Error loading posts: ${postsError}`
            : `${posts.length} published posts available as link targets`}
      </div>

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

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--adm-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'}
          </div>
          {suggestions.map((s, idx) => (
            <div key={idx} style={{
              padding: '9px 11px', borderRadius: 8,
              border: '1px solid var(--adm-border)', background: 'var(--adm-surface)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--adm-text)' }}>
                    {s.anchorText}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--adm-text-subtle)', marginTop: 2 }}>
                    → /posts/{s.targetSlug}
                  </div>
                  {s.reason && (
                    <div style={{ fontSize: 10, color: 'var(--adm-text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                      {s.reason}
                    </div>
                  )}
                  {s.position && (
                    <div style={{ fontSize: 9, color: PURPLE, marginTop: 3, fontWeight: 600 }}>
                      {s.position}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => insertLink(s)}
                  style={{
                    flexShrink: 0, padding: '5px 9px', borderRadius: 6,
                    background: PURPLE, color: '#fff', border: 'none',
                    fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Plus size={11} /> Insert
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

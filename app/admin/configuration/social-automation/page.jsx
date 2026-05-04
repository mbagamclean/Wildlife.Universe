'use client';

import { useMemo, useState } from 'react';
import {
  Megaphone, Loader2, Sparkles, AlertCircle, Copy, Check, RefreshCw,
  Twitter, Facebook, Linkedin, Instagram, Hash,
} from 'lucide-react';
import { AIPageHeader } from '@/components/admin/configuration/AIPageHeader';
import { PostPicker } from '@/components/admin/configuration/PostPicker';

const PLATFORMS = [
  { key: 'twitter',   label: 'Twitter / X', icon: Twitter,   accent: '#1da1f2', limit: 280 },
  { key: 'facebook',  label: 'Facebook',    icon: Facebook,  accent: '#1877f2', limit: 800 },
  { key: 'linkedin',  label: 'LinkedIn',    icon: Linkedin,  accent: '#0a66c2', limit: 1500 },
  { key: 'instagram', label: 'Instagram',   icon: Instagram, accent: '#e1306c', limit: 2200 },
];

const PROVIDERS = [
  { key: 'claude', label: 'Claude' },
  { key: 'openai', label: 'OpenAI' },
];

function plainText(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };
  return (
    <button
      onClick={onCopy}
      disabled={!text}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40"
      style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function PlatformCard({ platform, post, loading, onRegenerate }) {
  const Icon = platform.icon;
  const overLimit = post && post.charCount > platform.limit;
  const ratio = post ? Math.min(1, post.charCount / platform.limit) : 0;
  const barColor = overLimit ? '#c0392b' : ratio > 0.85 ? '#d4af37' : platform.accent;

  return (
    <div className="rounded-2xl p-5 flex flex-col" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: `${platform.accent}18`, border: `1px solid ${platform.accent}30` }}
          >
            <Icon className="h-4 w-4" style={{ color: platform.accent }} />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--adm-text)' }}>{platform.label}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRegenerate(platform.key)}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40"
            style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border)' }}
            title={`Regenerate ${platform.label}`}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Redo
          </button>
          <CopyButton text={post?.text || ''} />
        </div>
      </div>

      <div
        className="min-h-[220px] flex-1 whitespace-pre-wrap rounded-xl px-3 py-3 text-sm leading-relaxed"
        style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
      >
        {loading ? (
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: platform.accent }} />
          </div>
        ) : post?.text ? (
          post.text
        ) : (
          <span style={{ color: 'var(--adm-text-subtle)' }}>Generate posts to see {platform.label} copy here.</span>
        )}
      </div>

      {/* char meter */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
          <span>
            {post ? post.charCount : 0} / {platform.limit} chars{overLimit ? ' (over limit)' : ''}
          </span>
          {post && post.hashtags && post.hashtags.length > 0 && (
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" /> {post.hashtags.length}
            </span>
          )}
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--adm-surface-2)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${ratio * 100}%`, background: barColor }} />
        </div>
      </div>
    </div>
  );
}

export default function SocialAutomationPage() {
  const [post, setPost]               = useState(null);
  const [provider, setProvider]       = useState('claude');
  const [loadingAll, setLoadingAll]   = useState(false);
  const [loadingOne, setLoadingOne]   = useState(null); // platform key
  const [posts, setPosts]             = useState({});
  const [error, setError]             = useState('');

  const canRun = useMemo(() => Boolean(post?.title || post?.body), [post]);

  const generate = async (platformsToFetch) => {
    if (!canRun) return;
    const single = platformsToFetch.length === 1 ? platformsToFetch[0] : null;
    if (single) setLoadingOne(single); else setLoadingAll(true);
    setError('');
    try {
      const res = await fetch('/api/ai/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title || '',
          content: plainText(post.body || ''),
          platforms: platformsToFetch,
          provider,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to generate posts');
      const merged = single ? { ...posts, ...(json.data?.posts || {}) } : (json.data?.posts || {});
      setPosts(merged);
    } catch (err) {
      setError(err.message);
    } finally {
      if (single) setLoadingOne(null); else setLoadingAll(false);
    }
  };

  const generateAll = () => generate(PLATFORMS.map((p) => p.key));
  const regenerate = (platformKey) => generate([platformKey]);

  return (
    <div className="p-5 sm:p-8">
      <AIPageHeader
        eyebrow="AI TOOLS"
        title="Social Automation"
        description="Auto-generate platform-tuned social posts from any article. Each variant respects platform limits, voice, and hashtag conventions."
        icon={Megaphone}
        accent="#e1306c"
      />

      {/* Source */}
      <div className="mb-4">
        <PostPicker value={post} onChange={(p) => { setPost(p); setPosts({}); }} placeholder="Pick a post to promote…" />
      </div>

      {/* Controls */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[auto_1fr]">
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

        <div className="flex items-end justify-end">
          <button
            onClick={generateAll}
            disabled={!canRun || loadingAll}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#e1306c] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#c52866] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loadingAll ? 'Generating…' : 'Generate all 4 variants'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: '#fde2e2', color: '#7a1f1f', border: '1px solid #f5b7b7' }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Platform grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <PlatformCard
            key={platform.key}
            platform={platform}
            post={posts[platform.key]}
            loading={loadingAll || loadingOne === platform.key}
            onRegenerate={regenerate}
          />
        ))}
      </div>

      <p className="mt-4 text-center text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
        Tip: replace [POST_URL] with the canonical article URL before publishing.
      </p>
    </div>
  );
}

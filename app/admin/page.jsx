'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText, CheckCircle2, Clock, Eye, MessageSquare, DollarSign,
  TrendingUp, Plus, Globe, Settings, ArrowRight, Activity,
} from 'lucide-react';
import { db } from '@/lib/storage/db';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const CARD_ACCENTS = ['#4a9b8e', '#008000', '#d4af37', '#6b9fdb', '#e06c9f', '#4caf50'];

function StatCard({ label, value, icon: Icon, accent, href }) {
  const inner = (
    <div
      className="flex flex-col gap-3 rounded-2xl p-5 transition-all"
      style={{
        background: 'var(--adm-surface)',
        borderTop: `3px solid ${accent}`,
        boxShadow: 'var(--adm-shadow)',
        border: `1px solid var(--adm-border)`,
        borderTopColor: accent,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--adm-shadow-lg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--adm-shadow)'; }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${accent}18` }}>
        <Icon className="h-[18px] w-[18px]" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-2xl font-black" style={{ color: 'var(--adm-text)' }}>{value}</p>
        <p className="mt-0.5 text-xs font-medium" style={{ color: 'var(--adm-text-muted)' }}>{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickAction({ href, icon: Icon, label, accent = '#008000' }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl p-5 text-center transition-all hover:-translate-y-0.5 active:scale-[0.98]"
      style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--adm-shadow-lg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--adm-shadow)'; }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${accent}18` }}>
        <Icon className="h-[18px] w-[18px]" style={{ color: accent }} />
      </div>
      <span className="text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{label}</span>
    </Link>
  );
}

export default function AdminDashboard() {
  const { user }   = useAuth();
  const [posts, setPosts]       = useState([]);
  const [loaded, setLoaded]     = useState(false);
  const [comments, setComments] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      db.posts.list(),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
    ]).then(([allPosts, { count }]) => {
      setPosts(allPosts);
      setComments(count || 0);
      setLoaded(true);
    });
  }, []);

  const published  = posts.filter((p) => p.status !== 'draft').length;
  const drafts     = posts.filter((p) => p.status === 'draft').length;
  const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0);
  const recent     = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
            <span className="h-3 w-1 rounded-full bg-[#d4af37]" />
            CEO Dashboard
          </p>
          <h1 className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--adm-text)' }}>
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            Here&apos;s what&apos;s happening with your site today.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#008000] shadow-sm"
          style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#008000] opacity-40" />
            <span className="h-2 w-2 rounded-full bg-[#008000]" />
          </span>
          Live
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Posts"  value={loaded ? posts.length : '—'} icon={FileText}     accent={CARD_ACCENTS[0]} href="/admin/content/posts" />
        <StatCard label="Published"    value={loaded ? published : '—'}    icon={CheckCircle2} accent={CARD_ACCENTS[1]} href="/admin/content/posts" />
        <StatCard label="Drafts"       value={loaded ? drafts : '—'}       icon={Clock}        accent={CARD_ACCENTS[2]} href="/admin/content/posts" />
        <StatCard label="Total Views"  value={loaded ? totalViews.toLocaleString() : '—'} icon={Eye} accent={CARD_ACCENTS[3]} href="/admin/configuration/analytics" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Comments"  value={loaded ? comments : '—'} icon={MessageSquare} accent={CARD_ACCENTS[4]} href="/admin/content/comments" />
        <StatCard label="Est. Ad Revenue" value="$0.0000"                 icon={DollarSign}    accent={CARD_ACCENTS[5]} href="/admin/configuration/ad-management" />

        <Link
          href="/admin/configuration/analytics"
          className="col-span-2 flex items-center justify-between rounded-2xl p-5 transition-all hover:brightness-95 sm:col-span-1"
          style={{ background: 'linear-gradient(135deg, #d4af37 0%, #c9a227 45%, #b8891a 100%)', boxShadow: '0 4px 20px rgba(212,175,55,0.35)' }}
        >
          <div>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <TrendingUp className="h-[18px] w-[18px] text-white" />
            </div>
            <p className="text-xl font-black text-white">Analytics</p>
            <p className="mt-0.5 text-xs font-medium text-white/80">View detailed traffic stats</p>
          </div>
          <ArrowRight className="h-5 w-5 text-white/70" />
        </Link>
      </div>

      <div className="mb-6 rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
        <p className="mb-4 flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>
          <span className="text-[#d4af37]">⚡</span> Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction href="/admin/content/posts"          icon={Plus}          label="New Post"  accent="#008000" />
          <QuickAction href="/admin/content/pages"          icon={Globe}         label="New Page"  accent="#6b9fdb" />
          <QuickAction href="/admin/content/comments"       icon={MessageSquare} label="Comments"  accent="#e06c9f" />
          <QuickAction href="/admin/configuration/settings" icon={Settings}      label="Settings"  accent="#d4af37" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <div className="mb-4 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>
              <FileText className="h-4 w-4 text-[#d4af37]" />
              Recent Posts
            </p>
            <Link href="/admin/content/posts" className="flex items-center gap-1 text-xs font-semibold text-[#d4af37] hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {!loaded ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>Loading…</p>
          ) : recent.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>No posts yet.</p>
          ) : (
            <div className="flex flex-col" style={{ borderTop: `1px solid var(--adm-border)` }}>
              {recent.map((p) => (
                <div key={p.id} className="flex items-start gap-3 py-3" style={{ borderBottom: `1px solid var(--adm-border)` }}>
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#008000]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--adm-text)' }}>{p.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={p.status === 'draft'
                          ? { background: '#fff3cd', color: '#856404' }
                          : { background: '#d4edda', color: '#155724' }}
                      >
                        {p.status === 'draft' ? 'Draft' : 'Published'}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{timeAgo(p.createdAt)}</span>
                      {p.views > 0 && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>
                          <Eye className="h-3 w-3" /> {p.views}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ background: 'var(--adm-surface)', boxShadow: 'var(--adm-shadow)', border: '1px solid var(--adm-border)' }}>
          <p className="mb-4 flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--adm-text)' }}>
            <Activity className="h-4 w-4 text-[#d4af37]" />
            Recent Activity
          </p>

          {!loaded ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--adm-text-subtle)' }}>Loading…</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recent.slice(0, 4).map((p) => (
                <div key={p.id} className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--adm-surface-2)' }}>
                    <FileText className="h-3.5 w-3.5 text-[#d4af37]" />
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[12px] font-medium leading-snug" style={{ color: 'var(--adm-text)' }}>
                      Post: {p.title}
                    </p>
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>{timeAgo(p.createdAt)}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--adm-surface-2)' }}>
                  <Settings className="h-3.5 w-3.5 text-[#008000]" />
                </div>
                <div>
                  <p className="text-[12px] font-medium" style={{ color: 'var(--adm-text)' }}>Admin panel updated</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: 'var(--adm-text-subtle)' }}>Just now</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

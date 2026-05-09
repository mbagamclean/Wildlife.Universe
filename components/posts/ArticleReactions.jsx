'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageCircle, Send, User, Smile, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const SPAM_PATTERNS = [
  /\b(https?:\/\/|www\.)\S+/gi,
  /\b(buy|cheap|discount|free|offer|deal|click here|earn money|make money|casino|poker|crypto|bitcoin|nft|forex|invest now)\b/gi,
  /(.)\1{5,}/g,
  /[A-Z]{6,}/g,
];

const REACTIONS = [
  { key: 'love',  emoji: '❤️',  label: 'Love'  },
  { key: 'laugh', emoji: '😄',  label: 'Laugh' },
  { key: 'wow',   emoji: '😮',  label: 'Wow'   },
  { key: 'think', emoji: '🤔',  label: 'Think' },
  { key: 'sad',   emoji: '😢',  label: 'Sad'   },
  { key: 'angry', emoji: '😡',  label: 'Angry' },
];

const isSpam = (text) => SPAM_PATTERNS.some((re) => { re.lastIndex = 0; return re.test(text); });

/**
 * Per-device anonymous identity. Stored in localStorage so every
 * subsequent reaction the same visitor makes deduplicates to one row
 * (so they can swap their reaction or remove it, but not pile up
 * fake counts by reloading). Falls back to a non-persisted token
 * when storage is unavailable (private mode etc.) — counts still go
 * up but the visitor can't unreact.
 */
function getOrCreateUserToken() {
  if (typeof window === 'undefined') return null;
  try {
    const KEY = 'wu_user_token';
    let t = window.localStorage.getItem(KEY);
    if (!t) {
      t = (window.crypto?.randomUUID?.() || `t_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      window.localStorage.setItem(KEY, t);
    }
    return t;
  } catch {
    return `t_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

export function ArticleReactions({ slug }) {
  const [picked, setPicked]                 = useState(null);
  const [counts, setCounts]                 = useState({});
  const [reactionsReady, setReactionsReady] = useState(false);
  const [reactionError, setReactionError]   = useState('');
  const [comments, setComments]             = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [anonName, setAnonName]             = useState('');
  const [anonBody, setAnonBody]             = useState('');
  const [spamWarning, setSpamWarning]       = useState('');
  const [commentError, setCommentError]     = useState('');
  const [submitting, setSubmitting]         = useState(false);

  // ── Reactions: load global counts + this visitor's pick ──
  const loadReactions = useCallback(async () => {
    if (!slug) return;
    const sb = createClient();
    const token = getOrCreateUserToken();
    const { data, error } = await sb
      .from('post_reactions')
      .select('reaction, user_token')
      .eq('post_slug', slug);
    if (error) {
      setReactionError(`Could not load reactions: ${error.message}`);
      setReactionsReady(true);
      return;
    }
    const tally = {};
    let mine = null;
    for (const row of data || []) {
      tally[row.reaction] = (tally[row.reaction] || 0) + 1;
      if (row.user_token === token) mine = row.reaction;
    }
    setCounts(tally);
    setPicked(mine);
    setReactionError('');
    setReactionsReady(true);
  }, [slug]);

  useEffect(() => { loadReactions(); }, [loadReactions]);

  // ── Reactions: react / swap / unreact ──
  const react = async (key) => {
    const sb = createClient();
    const token = getOrCreateUserToken();
    if (!token) return;

    // Optimistic update so the UI feels instant — reverted on failure.
    const wasPicked = picked;
    const willToggle = wasPicked === key;
    const optimisticCounts = { ...counts };
    if (wasPicked) optimisticCounts[wasPicked] = Math.max(0, (optimisticCounts[wasPicked] || 1) - 1);
    if (!willToggle) optimisticCounts[key] = (optimisticCounts[key] || 0) + 1;
    setPicked(willToggle ? null : key);
    setCounts(optimisticCounts);
    setReactionError('');

    if (willToggle) {
      const { error } = await sb
        .from('post_reactions')
        .delete()
        .eq('post_slug', slug)
        .eq('user_token', token);
      if (error) {
        setReactionError(`Couldn't remove your reaction: ${error.message}`);
        loadReactions();
      }
      return;
    }

    // upsert keyed on the (post_slug, user_token) UNIQUE so a swap
    // updates the existing row instead of stacking a new one.
    const { error } = await sb
      .from('post_reactions')
      .upsert(
        { post_slug: slug, user_token: token, reaction: key },
        { onConflict: 'post_slug,user_token' },
      );
    if (error) {
      setReactionError(`Couldn't save your reaction: ${error.message}`);
      loadReactions();
    }
  };

  // ── Comments: load + post ──
  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase
      .from('comments')
      .select('*')
      .eq('post_slug', slug)
      .eq('flagged', false)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setCommentError(`Could not load comments: ${error.message}`);
        } else {
          setComments(
            (data || []).map(({ created_at, ...rest }) => ({ ...rest, createdAt: created_at })),
          );
        }
        setCommentsLoaded(true);
      });
  }, [slug]);

  const submitComment = async () => {
    const body = anonBody.trim();
    if (!body || submitting) return;
    setSpamWarning('');
    setCommentError('');
    setSubmitting(true);

    const supabase = createClient();
    const isFlagged = isSpam(body);

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_slug: slug,
        author: anonName.trim() || 'Anonymous',
        body,
        flagged: isFlagged,
      })
      .select()
      .single();

    if (error) {
      // Surface the real error so silent failures stop being a thing.
      setCommentError(`Couldn't post your comment: ${error.message}`);
      setSubmitting(false);
      return;
    }

    if (isFlagged) {
      setSpamWarning('Your comment has been flagged for moderator review and will appear after approval.');
    } else if (data) {
      const { created_at, ...rest } = data;
      setComments((prev) => [{ ...rest, createdAt: created_at }, ...prev]);
    }
    setAnonName('');
    setAnonBody('');
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── Reactions ── */}
      <div className="overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] transition-all duration-300 hover:border-[#008000]/30 hover:shadow-[0_8px_28px_rgba(0,128,0,0.08),0_2px_8px_rgba(0,128,0,0.05)]">
        <div className="border-b border-[var(--glass-border)] border-t-[3px] border-t-[#008000] px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#008000]/10 text-[#008000]">
              <Smile className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#008000]">Your Reaction</p>
              <h3 className="text-base font-bold text-[var(--color-fg)]">How did you feel about this article?</h3>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            {REACTIONS.map((r) => (
              <button
                key={r.key}
                onClick={() => react(r.key)}
                disabled={!reactionsReady}
                title={r.label}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-4 py-3 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 ${
                  picked === r.key
                    ? 'border-[#008000]/60 bg-[#008000]/10 shadow-[0_4px_14px_rgba(0,128,0,0.15)]'
                    : 'border-[var(--glass-border)] bg-[var(--color-bg)] hover:border-[#008000]/30 hover:bg-[#008000]/5 hover:shadow-[0_4px_12px_rgba(0,128,0,0.08)]'
                }`}
              >
                <span className="text-2xl leading-none">{r.emoji}</span>
                <span className={`text-[10px] font-semibold transition-colors ${picked === r.key ? 'text-[#008000]' : 'text-[var(--color-fg-soft)]'}`}>
                  {r.label}
                </span>
                {counts[r.key] > 0 && (
                  <span className="text-[9px] font-bold text-[#008000]">{counts[r.key]}</span>
                )}
              </button>
            ))}
          </div>
          {reactionError && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-500">
              <AlertCircle className="h-3.5 w-3.5" /> {reactionError}
            </p>
          )}
          <p className="mt-4 text-sm text-[var(--color-fg-soft)]">
            <Link href="/sign-in" className="font-semibold text-[#008000] hover:underline">Sign in</Link>
            {' '}to react with your account.
          </p>
        </div>
      </div>

      {/* ── Comments ── */}
      <div className="overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] transition-all duration-300 hover:border-[#d4af37]/30 hover:shadow-[0_8px_28px_rgba(212,175,55,0.08),0_2px_8px_rgba(212,175,55,0.05)]">
        <div className="border-b border-[var(--glass-border)] border-t-[3px] border-t-[#d4af37] px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4af37]/10 text-[#d4af37]">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#d4af37]">Discussion</p>
              <h3 className="text-base font-bold text-[var(--color-fg)]">
                Comments{comments.length > 0 && (
                  <span className="ml-2 rounded-full bg-[#d4af37]/15 px-2 py-0.5 text-xs font-bold text-[#d4af37]">
                    {comments.length}
                  </span>
                )}
              </h3>
            </div>
          </div>
        </div>
        <div className="p-6">
          {commentsLoaded && comments.length > 0 && (
            <div className="mb-6 flex flex-col gap-3">
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--glass-border)] text-[var(--color-fg-soft)]">
                      <User className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-fg)]">{c.author}</span>
                    <span className="ml-auto text-xs text-[var(--color-fg-soft)]">
                      {new Date(c.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--color-fg-soft)]">{c.body}</p>
                </div>
              ))}
            </div>
          )}

          {commentsLoaded && comments.length === 0 && !commentError && (
            <p className="mb-5 text-sm text-[var(--color-fg-soft)]">No comments yet — be the first to share your thoughts.</p>
          )}

          <p className="mb-3 text-sm font-bold text-[var(--color-fg)]">Leave a comment</p>
          <div className="flex flex-col gap-3">
            <input
              value={anonName}
              onChange={(e) => setAnonName(e.target.value)}
              placeholder="Your name (optional)"
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-fg)] placeholder-[var(--color-fg-soft)] focus:border-[#d4af37]/60 focus:outline-none"
            />
            <textarea
              value={anonBody}
              onChange={(e) => setAnonBody(e.target.value)}
              placeholder="Write your comment…"
              rows={4}
              className="resize-none rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-fg)] placeholder-[var(--color-fg-soft)] focus:border-[#d4af37]/60 focus:outline-none"
            />
            {spamWarning && (
              <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-600 dark:text-yellow-300">
                {spamWarning}
              </p>
            )}
            {commentError && (
              <p className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-500">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {commentError}
              </p>
            )}
            <div>
              <button
                onClick={submitComment}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#d4af37] px-5 py-2.5 text-sm font-semibold text-[#1a1208] transition-all duration-200 hover:bg-[#c9a227] hover:shadow-[0_4px_16px_rgba(212,175,55,0.30)] active:scale-[0.97] disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Posting…' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Send,
  User,
  Smile,
  AlertCircle,
  CornerDownRight,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Spam guard (URLs, marketing words, repeat-spam, all-caps) ────────────────
const SPAM_PATTERNS = [
  /\b(https?:\/\/|www\.)\S+/gi,
  /\b(buy|cheap|discount|free|offer|deal|click here|earn money|make money|casino|poker|crypto|bitcoin|nft|forex|invest now)\b/gi,
  /(.)\1{5,}/g,
  /[A-Z]{6,}/g,
];
const isSpam = (text) => SPAM_PATTERNS.some((re) => { re.lastIndex = 0; return re.test(text); });

// ── Reaction sets ────────────────────────────────────────────────────────────
const POST_REACTIONS = [
  { key: 'love',  emoji: '❤️',  label: 'Love'  },
  { key: 'laugh', emoji: '😄',  label: 'Laugh' },
  { key: 'wow',   emoji: '😮',  label: 'Wow'   },
  { key: 'think', emoji: '🤔',  label: 'Think' },
  { key: 'sad',   emoji: '😢',  label: 'Sad'   },
  { key: 'angry', emoji: '😡',  label: 'Angry' },
];

// Keeping the comment reaction row compact — four most-used emojis.
// The DB CHECK still permits all seven so swapping in more later
// doesn't need a migration.
const COMMENT_REACTIONS = [
  { key: 'like',  emoji: '👍', label: 'Like'  },
  { key: 'love',  emoji: '❤️', label: 'Love'  },
  { key: 'laugh', emoji: '😄', label: 'Laugh' },
  { key: 'wow',   emoji: '😮', label: 'Wow'   },
];

// ── Per-device anonymous identity (shared with post reactions) ───────────────
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

// ──────────────────────────────────────────────────────────────────────────────

export function ArticleReactions({ slug }) {
  // Post-level reactions
  const [picked, setPicked]                 = useState(null);
  const [postCounts, setPostCounts]         = useState({});
  const [reactionsReady, setReactionsReady] = useState(false);
  const [reactionError, setReactionError]   = useState('');

  // Comments (flat — replies are grouped client-side via parent_id)
  const [comments, setComments]                       = useState([]);
  const [commentsLoaded, setCommentsLoaded]           = useState(false);
  const [commentError, setCommentError]               = useState('');
  const [reactionsByComment, setReactionsByComment]   = useState({});

  // New top-level comment form
  const [anonName, setAnonName]       = useState('');
  const [anonBody, setAnonBody]       = useState('');
  const [spamWarning, setSpamWarning] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  // ── Post-level reactions: load + react ─────────────────────────
  const loadPostReactions = useCallback(async () => {
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
    setPostCounts(tally);
    setPicked(mine);
    setReactionError('');
    setReactionsReady(true);
  }, [slug]);

  useEffect(() => { loadPostReactions(); }, [loadPostReactions]);

  const reactToPost = async (key) => {
    const sb = createClient();
    const token = getOrCreateUserToken();
    if (!token) return;
    const wasPicked = picked;
    const willToggle = wasPicked === key;
    const optimisticCounts = { ...postCounts };
    if (wasPicked) optimisticCounts[wasPicked] = Math.max(0, (optimisticCounts[wasPicked] || 1) - 1);
    if (!willToggle) optimisticCounts[key] = (optimisticCounts[key] || 0) + 1;
    setPicked(willToggle ? null : key);
    setPostCounts(optimisticCounts);
    setReactionError('');

    if (willToggle) {
      const { error } = await sb
        .from('post_reactions')
        .delete()
        .eq('post_slug', slug)
        .eq('user_token', token);
      if (error) { setReactionError(`Couldn't remove your reaction: ${error.message}`); loadPostReactions(); }
      return;
    }
    const { error } = await sb
      .from('post_reactions')
      .upsert({ post_slug: slug, user_token: token, reaction: key }, { onConflict: 'post_slug,user_token' });
    if (error) { setReactionError(`Couldn't save your reaction: ${error.message}`); loadPostReactions(); }
  };

  // ── Comments: load top-level + replies + their reactions ─────────
  const loadComments = useCallback(async () => {
    if (!slug) return;
    const supabase = createClient();
    const token = getOrCreateUserToken();
    const { data: cData, error: cErr } = await supabase
      .from('comments')
      .select('*')
      .eq('post_slug', slug)
      .eq('flagged', false)
      .order('created_at', { ascending: true }); // chronological so replies render in posting order

    if (cErr) {
      setCommentError(`Could not load comments: ${cErr.message}`);
      setCommentsLoaded(true);
      return;
    }
    const rows = (cData || []).map(({ created_at, ...rest }) => ({ ...rest, createdAt: created_at }));

    let cReactions = {};
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const { data: rxData, error: rxErr } = await supabase
        .from('comment_reactions')
        .select('comment_id, reaction, user_token')
        .in('comment_id', ids);
      if (rxErr) {
        // Non-fatal — comments still display, reactions just stay empty.
        console.warn('[comments] reaction load failed:', rxErr.message);
      } else {
        for (const r of rxData || []) {
          if (!cReactions[r.comment_id]) cReactions[r.comment_id] = { counts: {}, mine: null };
          cReactions[r.comment_id].counts[r.reaction] = (cReactions[r.comment_id].counts[r.reaction] || 0) + 1;
          if (r.user_token === token) cReactions[r.comment_id].mine = r.reaction;
        }
      }
    }

    setComments(rows);
    setReactionsByComment(cReactions);
    setCommentError('');
    setCommentsLoaded(true);
  }, [slug]);

  useEffect(() => { loadComments(); }, [loadComments]);

  // Index comments into top-level + replies-by-parent for rendering
  const { topLevel, repliesByParent } = useMemo(() => {
    const tops = [];
    const replies = {};
    for (const c of comments) {
      if (c.parent_id) {
        if (!replies[c.parent_id]) replies[c.parent_id] = [];
        replies[c.parent_id].push(c);
      } else {
        tops.push(c);
      }
    }
    // Show newest top-level first; replies stay chronological under their parent.
    tops.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { topLevel: tops, repliesByParent: replies };
  }, [comments]);

  // ── Comment writes ─────────────────────────────────────────────
  async function postComment({ author, body, parentId = null }) {
    const supabase = createClient();
    const flagged = isSpam(body);
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_slug: slug,
        author: author?.trim() || 'Anonymous',
        body,
        flagged,
        parent_id: parentId,
      })
      .select()
      .single();
    if (error) return { error: error.message };
    if (flagged) return { flagged: true };
    const { created_at, ...rest } = data;
    setComments((prev) => [...prev, { ...rest, createdAt: created_at }]);
    return { data };
  }

  const submitTopLevel = async () => {
    const body = anonBody.trim();
    if (!body || submitting) return;
    setSpamWarning('');
    setCommentError('');
    setSubmitting(true);
    const result = await postComment({ author: anonName, body });
    if (result.error) {
      setCommentError(`Couldn't post your comment: ${result.error}`);
    } else if (result.flagged) {
      setSpamWarning('Your comment has been flagged for moderator review and will appear after approval.');
    }
    setAnonName('');
    setAnonBody('');
    setSubmitting(false);
  };

  // ── Comment-level reactions ────────────────────────────────────
  async function reactToComment(commentId, key) {
    const supabase = createClient();
    const token = getOrCreateUserToken();
    if (!token) return;
    const current = reactionsByComment[commentId] || { counts: {}, mine: null };
    const wasPicked = current.mine;
    const willToggle = wasPicked === key;
    const optimisticCounts = { ...current.counts };
    if (wasPicked) optimisticCounts[wasPicked] = Math.max(0, (optimisticCounts[wasPicked] || 1) - 1);
    if (!willToggle) optimisticCounts[key] = (optimisticCounts[key] || 0) + 1;

    setReactionsByComment((prev) => ({
      ...prev,
      [commentId]: { counts: optimisticCounts, mine: willToggle ? null : key },
    }));

    if (willToggle) {
      const { error } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_token', token);
      if (error) loadComments();
      return;
    }
    const { error } = await supabase
      .from('comment_reactions')
      .upsert(
        { comment_id: commentId, user_token: token, reaction: key },
        { onConflict: 'comment_id,user_token' },
      );
    if (error) loadComments();
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* ── Post-level Reactions ── */}
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
            {POST_REACTIONS.map((r) => (
              <button
                key={r.key}
                onClick={() => reactToPost(r.key)}
                disabled={!reactionsReady}
                title={r.label}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-4 py-3 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 ${
                  picked === r.key
                    ? 'border-[#008000]/60 bg-[#008000]/10 shadow-[0_4px_14px_rgba(0,128,0,0.15)]'
                    : 'border-[var(--glass-border)] bg-[var(--color-bg)] hover:border-[#008000]/30 hover:bg-[#008000]/5'
                }`}
              >
                <span className="text-2xl leading-none">{r.emoji}</span>
                <span className={`text-[10px] font-semibold ${picked === r.key ? 'text-[#008000]' : 'text-[var(--color-fg-soft)]'}`}>
                  {r.label}
                </span>
                {postCounts[r.key] > 0 && (
                  <span className="text-[9px] font-bold text-[#008000]">{postCounts[r.key]}</span>
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
          {commentsLoaded && topLevel.length > 0 && (
            <div className="mb-6 flex flex-col gap-3">
              {topLevel.map((c) => (
                <Comment
                  key={c.id}
                  c={c}
                  reactions={reactionsByComment[c.id] || { counts: {}, mine: null }}
                  replies={repliesByParent[c.id] || []}
                  reactionsByComment={reactionsByComment}
                  onReact={reactToComment}
                  onReply={(replyData) => postComment({ ...replyData, parentId: c.id })}
                />
              ))}
            </div>
          )}

          {commentsLoaded && topLevel.length === 0 && !commentError && (
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
                onClick={submitTopLevel}
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

// ── Comment subcomponent (used for both parents and replies) ─────────────────

function Comment({ c, reactions, replies = [], reactionsByComment = {}, onReact, onReply, isReply = false }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyName, setReplyName] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replySpam, setReplySpam] = useState('');
  const [replyError, setReplyError] = useState('');

  const submitReply = async () => {
    const body = replyBody.trim();
    if (!body || replySubmitting) return;
    setReplySpam('');
    setReplyError('');
    setReplySubmitting(true);
    const result = await onReply({ author: replyName, body });
    if (result?.error) {
      setReplyError(`Couldn't post your reply: ${result.error}`);
    } else if (result?.flagged) {
      setReplySpam('Your reply has been flagged for moderator review.');
      setReplyName('');
      setReplyBody('');
    } else {
      setReplyName('');
      setReplyBody('');
      setReplyOpen(false);
    }
    setReplySubmitting(false);
  };

  return (
    <div
      className={`rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg)] p-4 ${
        isReply ? '' : ''
      }`}
    >
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

      {/* Reactions row + Reply button */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {COMMENT_REACTIONS.map((r) => {
          const count = reactions.counts?.[r.key] || 0;
          const isMine = reactions.mine === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => onReact(c.id, r.key)}
              title={r.label}
              aria-label={isMine ? `Remove ${r.label}` : r.label}
              aria-pressed={isMine}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all duration-150 hover:scale-105 active:scale-95 ${
                isMine
                  ? 'border-[#d4af37]/60 bg-[#d4af37]/15 text-[#d4af37]'
                  : 'border-[var(--glass-border)] bg-[var(--color-bg-deep)] text-[var(--color-fg-soft)] hover:border-[#d4af37]/40 hover:text-[var(--color-fg)]'
              }`}
            >
              <span className="text-base leading-none">{r.emoji}</span>
              {count > 0 && <span className="font-semibold tabular-nums">{count}</span>}
            </button>
          );
        })}

        {/* Replies are flat — only top-level comments expose a reply button. */}
        {!isReply && (
          <button
            type="button"
            onClick={() => setReplyOpen((v) => !v)}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-3 py-1 text-xs font-semibold text-[var(--color-fg-soft)] transition-colors hover:border-[#d4af37]/40 hover:text-[var(--color-fg)]"
          >
            <CornerDownRight className="h-3 w-3" />
            {replyOpen ? 'Cancel' : 'Reply'}
          </button>
        )}
      </div>

      {/* Reply form */}
      {replyOpen && !isReply && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] p-3">
          <input
            value={replyName}
            onChange={(e) => setReplyName(e.target.value)}
            placeholder="Your name (optional)"
            className="rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder-[var(--color-fg-soft)] focus:border-[#d4af37]/60 focus:outline-none"
          />
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder={`Reply to ${c.author}…`}
            rows={3}
            className="resize-none rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder-[var(--color-fg-soft)] focus:border-[#d4af37]/60 focus:outline-none"
          />
          {replySpam && (
            <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-300">
              {replySpam}
            </p>
          )}
          {replyError && (
            <p className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
              <AlertCircle className="h-3.5 w-3.5" /> {replyError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setReplyOpen(false); setReplyBody(''); setReplyName(''); setReplySpam(''); setReplyError(''); }}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-fg-soft)] hover:text-[var(--color-fg)]"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
            <button
              type="button"
              onClick={submitReply}
              disabled={replySubmitting || !replyBody.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#d4af37] px-3 py-1.5 text-xs font-semibold text-[#1a1208] transition-colors hover:bg-[#c9a227] disabled:opacity-60"
            >
              <Send className="h-3 w-3" />
              {replySubmitting ? 'Posting…' : 'Post Reply'}
            </button>
          </div>
        </div>
      )}

      {/* Replies (always rendered — chronological, indented) */}
      {!isReply && replies.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-l-2 border-[var(--glass-border)] pl-4">
          {replies.map((r) => (
            <Comment
              key={r.id}
              c={r}
              reactions={reactionsByComment[r.id] || { counts: {}, mine: null }}
              replies={[]}
              reactionsByComment={reactionsByComment}
              onReact={onReact}
              onReply={() => {}}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

-- ============================================================
-- Wildlife Universe — comment threading + per-comment reactions
-- (migration 017)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Two adds:
--   1. comments.parent_id — nullable self-reference. NULL means
--      top-level; set means it's a reply to the referenced comment.
--      One level deep is enough (Twitter-style flat replies); the
--      UI groups replies under their parent.
--   2. comment_reactions table — same per-visitor pattern as
--      post_reactions, scoped by comment_id. Allowed values include
--      'like' alongside the existing six emoji reactions so a quick
--      thumbs-up doubles as a non-text "reply".
--
-- Idempotent. Anon-readable + anon-writable so unauthenticated
-- visitors can react and reply without sign-in.
-- ============================================================

-- ── 1. Threading on comments ─────────────────────────────────
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_parent_id
  ON comments(parent_id) WHERE parent_id IS NOT NULL;

COMMENT ON COLUMN comments.parent_id IS
  'NULL for top-level comments; UUID FK back to comments.id when this row is a reply.';

-- ── 2. Per-comment reactions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_token  TEXT NOT NULL,
  reaction    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT comment_reactions_reaction_chk
    CHECK (reaction IN ('like','love','laugh','wow','think','sad','angry')),
  CONSTRAINT comment_reactions_unique_per_user
    UNIQUE (comment_id, user_token)
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment
  ON comment_reactions(comment_id);

CREATE OR REPLACE FUNCTION comment_reactions_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_reactions_updated_at ON comment_reactions;
CREATE TRIGGER trg_comment_reactions_updated_at
  BEFORE UPDATE ON comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION comment_reactions_set_updated_at();

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_reactions read anon"   ON comment_reactions;
DROP POLICY IF EXISTS "comment_reactions write anon"  ON comment_reactions;
DROP POLICY IF EXISTS "comment_reactions update anon" ON comment_reactions;
DROP POLICY IF EXISTS "comment_reactions delete anon" ON comment_reactions;

CREATE POLICY "comment_reactions read anon"   ON comment_reactions FOR SELECT USING (true);
CREATE POLICY "comment_reactions write anon"  ON comment_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "comment_reactions update anon" ON comment_reactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "comment_reactions delete anon" ON comment_reactions FOR DELETE USING (true);

COMMENT ON TABLE comment_reactions IS
  'One reaction per (comment_id, user_token). Same per-device user_token UUID stored in localStorage as post_reactions.';

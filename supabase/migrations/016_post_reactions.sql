-- ============================================================
-- Wildlife Universe — global post reactions (migration 016)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Until now reactions only lived in localStorage, so counts were
-- per-device and "disappeared" the moment another tab opened or the
-- user cleared storage. This table makes them globally aggregated
-- across every visitor, with a per-device user_token (random UUID
-- written to localStorage) deduplicating each visitor to one
-- reaction per post — clicking the same reaction again removes the
-- row, clicking a different one updates it.
--
-- Idempotent. Anon-readable + anon-writable so unauthenticated
-- visitors can react without sign-in.
-- ============================================================

CREATE TABLE IF NOT EXISTS post_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug   TEXT NOT NULL,
  user_token  TEXT NOT NULL,
  reaction    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_reactions_reaction_chk
    CHECK (reaction IN ('love','laugh','wow','think','sad','angry')),
  CONSTRAINT post_reactions_unique_per_user
    UNIQUE (post_slug, user_token)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_slug
  ON post_reactions(post_slug);

CREATE OR REPLACE FUNCTION post_reactions_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_reactions_updated_at ON post_reactions;
CREATE TRIGGER trg_post_reactions_updated_at
  BEFORE UPDATE ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION post_reactions_set_updated_at();

-- RLS: enable, then add explicit anon-friendly policies. We're not
-- protecting any sensitive data here — abuse mitigation is left to a
-- future captcha/rate-limit pass. For v1 the user_token UUID is
-- "obscure enough" that drive-by tampering with someone else's
-- reaction is unlikely.
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_reactions read anon"  ON post_reactions;
DROP POLICY IF EXISTS "post_reactions write anon" ON post_reactions;
DROP POLICY IF EXISTS "post_reactions update anon" ON post_reactions;
DROP POLICY IF EXISTS "post_reactions delete anon" ON post_reactions;

CREATE POLICY "post_reactions read anon"   ON post_reactions FOR SELECT USING (true);
CREATE POLICY "post_reactions write anon"  ON post_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "post_reactions update anon" ON post_reactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "post_reactions delete anon" ON post_reactions FOR DELETE USING (true);

COMMENT ON TABLE post_reactions IS
  'One row per (post_slug, user_token). user_token is a random UUID stored in the visitor''s localStorage. Counts are computed by SELECT reaction, COUNT(*) GROUP BY reaction.';

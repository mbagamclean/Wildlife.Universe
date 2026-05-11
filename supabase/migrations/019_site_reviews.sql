-- ============================================================
-- Wildlife Universe — homepage user reviews (migration 019)
-- Run in: Supabase Dashboard → SQL Editor (idempotent)
--
-- Mirrors the Mayobe Bros reviews table so the homepage carries the
-- same "What Our Readers Say" experience. Anyone can post (no login
-- required) — reviews auto-publish (status='approved'); the admin
-- can hide one with UPDATE status='hidden'. ip_hash gives us a
-- per-IP rate-limit knob if we ever need it; the route enforces a
-- 60-second client cooldown today.
-- ============================================================

CREATE TABLE IF NOT EXISTS site_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name       TEXT NOT NULL CHECK (length(trim(user_name)) BETWEEN 2 AND 80),
  user_avatar     TEXT,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT NOT NULL CHECK (length(trim(comment)) BETWEEN 10 AND 2000),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected', 'spam')),
  ip_hash         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS site_reviews_status_created_idx
  ON site_reviews (status, created_at DESC);

CREATE INDEX IF NOT EXISTS site_reviews_iphash_created_idx
  ON site_reviews (ip_hash, created_at DESC);

-- RLS — anonymous can SELECT approved + INSERT; service role does
-- everything else.
ALTER TABLE site_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read approved" ON site_reviews;
CREATE POLICY "anon read approved" ON site_reviews
  FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "anon insert" ON site_reviews;
CREATE POLICY "anon insert" ON site_reviews
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE site_reviews IS 'Public homepage user reviews. Mirrors Mayobe Bros reviews. Auto-approves on insert; admin hides via UPDATE status=''hidden''.';

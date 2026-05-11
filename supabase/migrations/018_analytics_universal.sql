-- ============================================================
-- Wildlife Universe — universal analytics (migration 018)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Extends post_views into a general-purpose pageviews table so the
-- new /admin/analytics dashboard can show traffic for the homepage,
-- category pages, search, etc. — not only post detail pages.
--
-- Changes (all additive + nullable, idempotent):
--   1. pathname TEXT — full request path (e.g. "/animals/mammals?page=2")
--      The dashboard groups by this to surface Top Pages across the site.
--   2. Relax NOT NULL on post_id + post_slug so a tracker on /,
--      /search, /redlist, etc. can write rows even though no post
--      backs them.
--   3. Index on (viewed_at, pathname) for Top Pages aggregation, and
--      on country / referrer for the leaderboard panels.
-- ============================================================

-- 1. New pathname column
ALTER TABLE post_views
  ADD COLUMN IF NOT EXISTS pathname TEXT;

-- 2. Make post_id / post_slug optional. They stay populated when the
--    pageview is for a /posts/<slug> route — null for everything else.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'post_views' AND column_name = 'post_id'
       AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE post_views ALTER COLUMN post_id DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'post_views' AND column_name = 'post_slug'
       AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE post_views ALTER COLUMN post_slug DROP NOT NULL;
  END IF;
END$$;

-- 3. Dashboard-supporting indexes (idempotent).
CREATE INDEX IF NOT EXISTS post_views_pathname_idx
  ON post_views (pathname);
CREATE INDEX IF NOT EXISTS post_views_country_idx
  ON post_views (country);
CREATE INDEX IF NOT EXISTS post_views_session_idx
  ON post_views (session_id);

COMMENT ON COLUMN post_views.pathname IS 'Full URL path of the page viewed. Populated for every public-route hit so the analytics dashboard can render Top Pages across the entire site, not just post details.';

-- ============================================================
-- Wildlife Universe — post editor fields (migration 005)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Adds the columns the PostEditor sends with every save:
--   excerpt, meta_title, meta_description, meta_keywords, publish_date
--
-- The app is self-healing — without this migration the editor still
-- saves the post, just without these SEO/scheduling fields. With this
-- migration, every field persists.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS excerpt          TEXT,
  ADD COLUMN IF NOT EXISTS meta_title       TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS meta_keywords    TEXT,
  ADD COLUMN IF NOT EXISTS publish_date     TIMESTAMPTZ;

-- Useful index for sitemap / RSS scheduled-publishing queries
CREATE INDEX IF NOT EXISTS idx_posts_publish_date ON posts(publish_date)
  WHERE publish_date IS NOT NULL;

-- Helpful comment for future devs
COMMENT ON COLUMN posts.excerpt IS 'Short standalone summary used by RSS feed and OG description fallback';
COMMENT ON COLUMN posts.meta_title IS 'Override <title> tag (defaults to title if NULL)';
COMMENT ON COLUMN posts.meta_description IS 'Override <meta name="description"> (defaults to excerpt if NULL)';
COMMENT ON COLUMN posts.meta_keywords IS 'Comma-separated keyword list for SEO (low SEO weight, but used)';
COMMENT ON COLUMN posts.publish_date IS 'Scheduled publish time. Currently informational; consider gating /posts visibility on this >= NOW() in future';

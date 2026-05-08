-- ============================================================
-- Wildlife Universe — content pipeline fields (migration 012)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Adds the columns required by the mass content generation pipeline:
--
--   faq                   JSONB    — array of {question, answer} pairs,
--                                    rendered as semantic <dl> + emitted
--                                    as FAQPage JSON-LD on post pages
--   structured_data       JSONB    — optional schema.org overrides (extra
--                                    Article fields, custom @types, etc.)
--   related_post_ids      TEXT[]   — manually curated related-post IDs;
--                                    when empty/null, RelatedPosts falls
--                                    back to auto-computed by-label/by-tag
--   reading_time_minutes  INTEGER  — pre-computed reading time so we don't
--                                    re-count words on every render
--
-- Without this migration, posts.create()/update() in lib/storage/db.js
-- silently strips these fields via execWithSchemaHealing — articles save
-- successfully but lose their FAQ, schema, related links, and reading
-- time. Same trap that bit the hero poster (see 009 for context).
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS faq                  JSONB,
  ADD COLUMN IF NOT EXISTS structured_data      JSONB,
  ADD COLUMN IF NOT EXISTS related_post_ids     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER;

-- Lets sitemap/SEO queries cheaply find posts that have FAQ schema to emit.
CREATE INDEX IF NOT EXISTS idx_posts_has_faq
  ON posts ((faq IS NOT NULL))
  WHERE faq IS NOT NULL;

-- Helpful comments for future devs
COMMENT ON COLUMN posts.faq IS
  'JSONB array of {question, answer} pairs. Rendered as semantic <dl> on the post page and emitted as FAQPage JSON-LD. NULL or empty array → FAQ section not rendered.';
COMMENT ON COLUMN posts.structured_data IS
  'Optional schema.org overrides merged into the auto-generated Article JSON-LD. Use sparingly — most posts should rely on the defaults from lib/seo.js.';
COMMENT ON COLUMN posts.related_post_ids IS
  'Curated related-post IDs (max ~8). When empty/null, the RelatedPosts component auto-computes from same-label + tag-overlap.';
COMMENT ON COLUMN posts.reading_time_minutes IS
  'Pre-computed at save time from body word count (~200 wpm). Used in OG metadata and post header. NULL → fall back to runtime estimate.';

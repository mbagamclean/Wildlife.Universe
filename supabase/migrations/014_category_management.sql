-- ============================================================
-- Wildlife Universe — category management fields (migration 014)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Extends the categories table created in 001_schema.sql with the
-- fields the new admin editor needs: rich descriptions, hero / thumb
-- imagery, full SEO + Open Graph + Twitter metadata, plus a few
-- discoverability flags (featured / trending / position).
--
-- All adds are nullable so the existing seeded rows continue to work
-- without backfill. The admin editor populates them on save.
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS short_description    TEXT,
  ADD COLUMN IF NOT EXISTS description          TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url        TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_url       TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_mobile_url TEXT,
  ADD COLUMN IF NOT EXISTS image_alt            TEXT,
  ADD COLUMN IF NOT EXISTS image_caption        TEXT,
  ADD COLUMN IF NOT EXISTS seo_title            TEXT,
  ADD COLUMN IF NOT EXISTS seo_description      TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords         TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url        TEXT,
  ADD COLUMN IF NOT EXISTS og_title             TEXT,
  ADD COLUMN IF NOT EXISTS og_description       TEXT,
  ADD COLUMN IF NOT EXISTS twitter_title        TEXT,
  ADD COLUMN IF NOT EXISTS twitter_description  TEXT,
  ADD COLUMN IF NOT EXISTS featured             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trending             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS position             INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Auto-bump updated_at on update so the editor doesn't have to touch it.
CREATE OR REPLACE FUNCTION categories_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION categories_set_updated_at();

-- Useful for ordering on the admin list view + future homepage hero strips.
CREATE INDEX IF NOT EXISTS idx_categories_position ON categories(position);
CREATE INDEX IF NOT EXISTS idx_categories_featured ON categories(featured) WHERE featured = true;

COMMENT ON COLUMN categories.short_description    IS 'One-line tagline (≤180 chars). Used for cards + RSS.';
COMMENT ON COLUMN categories.description          IS 'Full editorial description (markdown/HTML) for the category landing page.';
COMMENT ON COLUMN categories.thumbnail_url        IS 'Square / portrait card image used in nav + summary blocks.';
COMMENT ON COLUMN categories.hero_image_url       IS 'Wide hero banner shown at the top of /<slug>.';
COMMENT ON COLUMN categories.hero_image_mobile_url IS 'Optional portrait/mobile-tuned hero. Falls back to hero_image_url.';
COMMENT ON COLUMN categories.seo_title            IS 'Override <title>. Defaults to "<name> — Wildlife Universe" when blank.';
COMMENT ON COLUMN categories.seo_description      IS 'Override <meta name="description">. Defaults to short_description.';
COMMENT ON COLUMN categories.canonical_url        IS 'Optional canonical override. Leave blank to point at /<slug>.';
COMMENT ON COLUMN categories.featured             IS 'Highlight on the homepage hero strip.';
COMMENT ON COLUMN categories.trending             IS 'Surface in the "trending now" rail.';

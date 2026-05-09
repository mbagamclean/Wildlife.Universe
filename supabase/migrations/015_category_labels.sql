-- ============================================================
-- Wildlife Universe — per-label rich metadata (migration 015)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Mirrors the editor surface added for categories in 014, scoped to
-- individual labels (e.g. Animals → Mammals, Birds → Raptors). Each
-- label gets its own row keyed by (category_slug, slug).
--
-- Backfill: every value already present in categories.labels[] is
-- copied into category_labels with a slugified key. The legacy
-- categories.labels[] array stays in place — the existing add/rename/
-- delete UI keeps working — and the rich editor reads + writes the
-- new table on top of it.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS category_labels (
  id                    TEXT PRIMARY KEY,
  category_slug         TEXT NOT NULL REFERENCES categories(slug) ON DELETE CASCADE,
  slug                  TEXT NOT NULL,
  name                  TEXT NOT NULL,
  short_description     TEXT,
  description           TEXT,
  thumbnail_url         TEXT,
  hero_image_url        TEXT,
  hero_image_mobile_url TEXT,
  image_alt             TEXT,
  image_caption         TEXT,
  seo_title             TEXT,
  seo_description       TEXT,
  seo_keywords          TEXT,
  canonical_url         TEXT,
  og_title              TEXT,
  og_description        TEXT,
  twitter_title         TEXT,
  twitter_description   TEXT,
  featured              BOOLEAN NOT NULL DEFAULT false,
  position              INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT category_labels_unique UNIQUE (category_slug, slug)
);

CREATE INDEX IF NOT EXISTS idx_category_labels_category ON category_labels(category_slug);
CREATE INDEX IF NOT EXISTS idx_category_labels_position ON category_labels(category_slug, position);

CREATE OR REPLACE FUNCTION category_labels_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_category_labels_updated_at ON category_labels;
CREATE TRIGGER trg_category_labels_updated_at
  BEFORE UPDATE ON category_labels
  FOR EACH ROW
  EXECUTE FUNCTION category_labels_set_updated_at();

-- ── Backfill from categories.labels[] ──
DO $$
DECLARE
  cat RECORD;
  lbl TEXT;
  s   TEXT;
BEGIN
  FOR cat IN SELECT slug, labels FROM categories WHERE labels IS NOT NULL LOOP
    IF cat.labels IS NULL OR array_length(cat.labels, 1) IS NULL THEN
      CONTINUE;
    END IF;
    FOREACH lbl IN ARRAY cat.labels LOOP
      -- Slugify the label name the same way labelSlug() does in JS:
      -- lowercase, non-alphanumeric → hyphen, trim leading/trailing.
      s := lower(regexp_replace(lbl, '[^a-zA-Z0-9]+', '-', 'g'));
      s := regexp_replace(s, '(^-|-$)', '', 'g');
      IF length(s) = 0 THEN
        CONTINUE;
      END IF;
      INSERT INTO category_labels (id, category_slug, slug, name)
      VALUES ('lbl_' || cat.slug || '_' || s, cat.slug, s, lbl)
      ON CONFLICT (category_slug, slug) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

COMMENT ON TABLE category_labels IS
  'Rich per-label metadata. The legacy categories.labels[] array remains for backward compatibility; this table is the source of truth for descriptions, hero images, and SEO.';

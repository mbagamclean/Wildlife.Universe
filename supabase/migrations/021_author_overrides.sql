-- ============================================================
-- Wildlife.Universe — author overrides (migration 021)
--
-- Why this exists:
--   The 13 author personas ship as defaults in lib/seo/authors.js.
--   We don't want to bake the editable text (bio, title, expertise,
--   photo URL, social links) into the code bundle — every wording
--   change would require a code deploy. This table stores per-slug
--   OVERRIDES of the editable fields. The application merges the
--   override over the static default when it renders.
--
--   slug is the primary key (matches the static roster's slug).
--   Every override column is nullable; NULL means "keep the static
--   default for this field".
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS author_overrides (
  slug          TEXT PRIMARY KEY,
  name          TEXT,
  title         TEXT,
  bio           TEXT,
  photo_url     TEXT,
  expertise     TEXT,
  affiliation   TEXT,
  email         TEXT,
  twitter       TEXT,
  website       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_author_overrides_updated_at
  ON author_overrides(updated_at DESC);

ALTER TABLE author_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "author_overrides_public_read" ON author_overrides;
CREATE POLICY "author_overrides_public_read" ON author_overrides
  FOR SELECT USING (TRUE);

-- Writes are gated by the service-role key — only the admin API
-- routes (which run server-side under SUPABASE_SERVICE_ROLE_KEY)
-- can update this table. No client-side editor RLS policy is needed.

COMMENT ON TABLE author_overrides IS
  'Per-author editable overrides. Slug matches lib/seo/authors.js. Application merges override over default at render time.';
COMMENT ON COLUMN author_overrides.photo_url IS
  'Author headshot. Typically an /authors/<slug>.jpg path under public/, or a full Supabase storage URL after upload via /api/admin/authors/<slug>/photo.';

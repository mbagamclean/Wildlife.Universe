-- ============================================================
-- Wildlife Universe — hero media columns (migration 009)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Two changes that together unblock hero saves:
--
--   1. Add heroes.poster JSONB. The HeroEditor and NetflixRowCarousel
--      already use it as a fallback image for video heroes. Without the
--      column every hero save was rejected by PostgREST.
--
--   2. Promote heroes.src from TEXT to JSONB so it can hold EITHER a
--      legacy URL string OR the full {type, sources, responsive, bytes}
--      upload-result object that MediaUpload now emits. The hero renderer
--      already branches on `typeof slide.src === 'string'` to support both.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- 1. Poster (JSONB so it can hold a string URL or a full upload-result object)
ALTER TABLE heroes
  ADD COLUMN IF NOT EXISTS poster JSONB;

-- 2. Promote src TEXT -> JSONB without losing existing string URLs.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_name = 'heroes'
       AND column_name = 'src'
       AND data_type   = 'text'
  ) THEN
    ALTER TABLE heroes
      ALTER COLUMN src TYPE JSONB USING (
        CASE
          WHEN src IS NULL OR src = '' THEN NULL
          ELSE to_jsonb(src)
        END
      );
  END IF;
END$$;

COMMENT ON COLUMN heroes.poster IS 'Optional poster shown over video heroes until the clip loads. JSONB so it accepts a URL string or a full upload-result object.';
COMMENT ON COLUMN heroes.src    IS 'Hero media. JSONB so it accepts a legacy URL string or a {type, sources, responsive, bytes} upload-result object.';

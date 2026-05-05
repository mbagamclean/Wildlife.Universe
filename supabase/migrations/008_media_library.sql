-- ============================================================
-- Wildlife Universe — unified media library (migration 008)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Tracks every uploaded media file (image, video, audio) regardless of
-- where it was uploaded from (post editor cover, hero, homepage videos,
-- AI image generator, TTS / voiceover audio, etc.) so the admin Media
-- page can list/preview/delete the full inventory.
--
-- Mirrors Mayobe Bros's media_library table but extended with a
-- `variants` JSONB column that captures all the format/resolution
-- variants our pipeline produces (AVIF + WebP + 1600w + WebM + poster).
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS media_library (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename          text NOT NULL,
  original_filename text,
  storage_path      text,                          -- path within the 'media' bucket if we own the bytes
  file_url          text NOT NULL,                 -- primary public URL
  file_type         text NOT NULL,                 -- MIME type
  media_kind        text NOT NULL DEFAULT 'image', -- 'image' | 'video' | 'audio'
  file_size         bigint NOT NULL DEFAULT 0,
  width             integer,
  height            integer,
  duration_sec      integer,
  alt_text          text,
  caption           text,
  source            text NOT NULL DEFAULT 'upload',-- 'upload' | 'ai-generated' | 'tts' | 'voiceover' | 'transcoded' | 'external' | 'pexels'
  variants          jsonb,                         -- { sources: [...], poster, avif, webp, avif1600, webp1600, webm, ... }
  uploaded_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_library_kind_check CHECK (media_kind IN ('image', 'video', 'audio'))
);

CREATE INDEX IF NOT EXISTS idx_media_library_created_at  ON media_library(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_library_kind        ON media_library(media_kind);
CREATE INDEX IF NOT EXISTS idx_media_library_source      ON media_library(source);
CREATE INDEX IF NOT EXISTS idx_media_library_storage_path ON media_library(storage_path);

-- Reuse set_updated_at() from migration 004; create if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $f$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $f$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_media_library_updated_at ON media_library;
CREATE TRIGGER trg_media_library_updated_at
  BEFORE UPDATE ON media_library
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: anyone (anon) can read public media, only staff can write.
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_library_select_public" ON media_library;
CREATE POLICY "media_library_select_public" ON media_library
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "media_library_write_staff" ON media_library;
CREATE POLICY "media_library_write_staff" ON media_library
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'admin', 'editor', 'writer', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'admin', 'editor', 'writer', 'moderator')
    )
  );

COMMENT ON TABLE media_library IS 'Unified media inventory — every upload (image/video/audio) from any path lands here for the admin Media page.';
COMMENT ON COLUMN media_library.source IS 'Where the file came from: upload | ai-generated | tts | voiceover | transcoded | external | pexels';
COMMENT ON COLUMN media_library.variants IS 'Sibling format/resolution variants produced by the pipeline (AVIF, WebP, 1600w, WebM, poster, etc.)';

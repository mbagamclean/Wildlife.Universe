-- ============================================================
-- Wildlife Universe — homepage videos (migration 006)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Curated video gallery for the public homepage. Editors paste a URL
-- (YouTube, TikTok, Instagram Reel, Vimeo, Facebook, X/Twitter, or a
-- direct .mp4) or upload a file via /api/upload, then assign it to a
-- section ("featured", "shorts", "documentaries") and a position.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS homepage_videos (
  id           TEXT PRIMARY KEY,
  source_url   TEXT NOT NULL,                  -- embed URL or direct file URL
  source_type  TEXT NOT NULL DEFAULT 'embed',  -- 'embed' | 'upload'
  provider     TEXT,                            -- youtube|tiktok|vimeo|instagram|... (autodetected)
  title        TEXT,
  description  TEXT,
  thumbnail    TEXT,                            -- optional cover image URL
  section      TEXT NOT NULL DEFAULT 'featured', -- 'featured' | 'shorts' | 'documentaries'
  position     INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER,                         -- optional, informational
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT homepage_videos_section_check
    CHECK (section IN ('featured', 'shorts', 'documentaries'))
);

CREATE INDEX IF NOT EXISTS idx_homepage_videos_section_position
  ON homepage_videos(section, position);
CREATE INDEX IF NOT EXISTS idx_homepage_videos_active
  ON homepage_videos(active) WHERE active = TRUE;

-- Reuse the set_updated_at() trigger function from migration 004
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
  ) THEN
    CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $f$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $f$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_homepage_videos_updated_at ON homepage_videos;
CREATE TRIGGER trg_homepage_videos_updated_at
  BEFORE UPDATE ON homepage_videos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: public read of active rows, staff write
ALTER TABLE homepage_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage_videos_select_public" ON homepage_videos;
CREATE POLICY "homepage_videos_select_public" ON homepage_videos
  FOR SELECT TO anon, authenticated
  USING (active = TRUE);

DROP POLICY IF EXISTS "homepage_videos_select_staff" ON homepage_videos;
CREATE POLICY "homepage_videos_select_staff" ON homepage_videos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'admin', 'editor', 'writer', 'moderator')
    )
  );

DROP POLICY IF EXISTS "homepage_videos_write_staff" ON homepage_videos;
CREATE POLICY "homepage_videos_write_staff" ON homepage_videos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'admin', 'editor', 'writer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'admin', 'editor', 'writer')
    )
  );

COMMENT ON TABLE homepage_videos IS 'Curated videos shown on the public homepage HomepageVideosSection.';
COMMENT ON COLUMN homepage_videos.section IS 'Which homepage section the video appears in: featured (top), shorts (vertical), documentaries (long-form).';

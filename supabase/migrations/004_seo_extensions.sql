-- ============================================================
-- Wildlife Universe — SEO + analytics extensions
-- Run in: Supabase Dashboard → SQL Editor
--
-- Adds:
--   1. posts.updated_at + auto-update trigger (sitemap/RSS lastModified)
--   2. post_views event table (true per-day traffic in /traffic-growth)
--   3. post_translations table (Translate admin tool persistence)
--
-- All statements are idempotent — safe to re-run.
-- ============================================================

-- ── 1. posts.updated_at ─────────────────────────────────────
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill any existing rows where updated_at is null
UPDATE posts SET updated_at = COALESCE(created_at, NOW())
  WHERE updated_at IS NULL;

-- Trigger function — sets updated_at on every row update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Index for sitemap ordering
CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at DESC);


-- ── 2. post_views event table ───────────────────────────────
-- One row per page view (rough — may be deduped client-side
-- per session, but allows true per-day traffic aggregation).
CREATE TABLE IF NOT EXISTS post_views (
  id          BIGSERIAL PRIMARY KEY,
  post_id     TEXT REFERENCES posts(id) ON DELETE CASCADE,
  post_slug   TEXT,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash     TEXT,           -- SHA-256(ip + daily_salt) — optional, for dedup
  user_agent  TEXT,
  referrer    TEXT,
  country     TEXT,           -- if you wire a geo lookup later
  session_id  TEXT            -- client-generated UUID, used to dedupe rapid replays
);

CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON post_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_post_slug ON post_views(post_slug);

-- RLS: anyone can insert (anon writes from public site), only staff can read
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_views_insert_anyone" ON post_views;
CREATE POLICY "post_views_insert_anyone" ON post_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "post_views_select_staff" ON post_views;
CREATE POLICY "post_views_select_staff" ON post_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'admin', 'editor', 'writer', 'moderator')
    )
  );


-- ── 3. post_translations ────────────────────────────────────
-- Stores translated copies of a post in N target languages.
-- One row per (post_id, target_language).
CREATE TABLE IF NOT EXISTS post_translations (
  id                BIGSERIAL PRIMARY KEY,
  post_id           TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  source_language   TEXT NOT NULL DEFAULT 'en',
  target_language   TEXT NOT NULL,
  translated_title  TEXT,
  translated_body   TEXT NOT NULL,
  notes             TEXT,
  provider          TEXT,           -- 'claude' | 'openai'
  preserve_tone     BOOLEAN DEFAULT TRUE,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, target_language)
);

CREATE INDEX IF NOT EXISTS idx_post_translations_post_id ON post_translations(post_id);
CREATE INDEX IF NOT EXISTS idx_post_translations_lang ON post_translations(target_language);

DROP TRIGGER IF EXISTS trg_post_translations_updated_at ON post_translations;
CREATE TRIGGER trg_post_translations_updated_at
  BEFORE UPDATE ON post_translations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS: public can read, only staff can insert/update/delete
ALTER TABLE post_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "translations_select_public" ON post_translations;
CREATE POLICY "translations_select_public" ON post_translations
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "translations_write_staff" ON post_translations;
CREATE POLICY "translations_write_staff" ON post_translations
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

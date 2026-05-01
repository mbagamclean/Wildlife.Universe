-- ============================================================
-- Wildlife Universe — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Profiles (extends auth.users) ───────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  bio         TEXT,
  role        TEXT NOT NULL DEFAULT 'reader',
  avatar_id   TEXT DEFAULT 'lion',
  first_name  TEXT,
  last_name   TEXT,
  country     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Posts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id            TEXT PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  category      TEXT,
  cover         TEXT,
  cover_palette JSONB DEFAULT '{"from":"#0c4a1a","via":"#3aa15a","to":"#d4af37"}',
  featured      BOOLEAN DEFAULT FALSE,
  status        TEXT DEFAULT 'draft',
  views         INTEGER DEFAULT 0,
  iucn_status   TEXT,
  tags          TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Heroes (homepage carousel) ───────────────────────────────
CREATE TABLE IF NOT EXISTS heroes (
  id          TEXT PRIMARY KEY,
  type        TEXT DEFAULT 'image',
  src         TEXT,
  sources     JSONB,
  palette     JSONB DEFAULT '{"from":"#0c4a1a","via":"#3aa15a","to":"#a8e0c0"}',
  accent      TEXT DEFAULT '#d4af37',
  subject     TEXT DEFAULT 'forest',
  headline    TEXT,
  subline     TEXT,
  badge       TEXT,
  link        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hero display mode (single row) ───────────────────────────
CREATE TABLE IF NOT EXISTS hero_mode (
  id    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode  TEXT DEFAULT 'default'
);
INSERT INTO hero_mode (id, mode) VALUES (1, 'default') ON CONFLICT DO NOTHING;

-- ── Comments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug   TEXT NOT NULL,
  author      TEXT DEFAULT 'Anonymous',
  body        TEXT NOT NULL,
  flagged     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Categories (slugs + dynamic labels) ──────────────────────
CREATE TABLE IF NOT EXISTS categories (
  slug    TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  labels  TEXT[] DEFAULT '{}'
);

INSERT INTO categories (slug, name, labels) VALUES
  ('animals', 'Animals', ARRAY['Mammals','Reptiles','Amphibians','Fish','IUCN Redlist']),
  ('plants',  'Plants',  ARRAY['Trees','Shrubs','Herbs','Vines']),
  ('birds',   'Birds',   ARRAY['Basal','Waterfowl','Coastal','Raptors','Land','Song']),
  ('insects', 'Insects', ARRAY['Porifera','Cnidaria','Platyhelminthes','Nematoda','Annelida','Mollusca','Arthropoda','Echinodermata']),
  ('posts',   'Posts',   ARRAY['How','Why','Tourism','Conservation','Articles'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Enable Row Level Security
-- ============================================================
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE heroes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_mode ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ── Helper: is current user CEO? ─────────────────────────────
CREATE OR REPLACE FUNCTION is_ceo()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'
  );
$$;

-- ── Profiles policies ────────────────────────────────────────
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_ceo());

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── Posts policies ───────────────────────────────────────────
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (status != 'draft' OR is_ceo());

CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (is_ceo());

CREATE POLICY "posts_update" ON posts
  FOR UPDATE USING (is_ceo());

CREATE POLICY "posts_delete" ON posts
  FOR DELETE USING (is_ceo());

-- ── Heroes policies ──────────────────────────────────────────
CREATE POLICY "heroes_select" ON heroes
  FOR SELECT USING (TRUE);

CREATE POLICY "heroes_insert" ON heroes
  FOR INSERT WITH CHECK (is_ceo());

CREATE POLICY "heroes_update" ON heroes
  FOR UPDATE USING (is_ceo());

CREATE POLICY "heroes_delete" ON heroes
  FOR DELETE USING (is_ceo());

-- ── Hero mode policies ───────────────────────────────────────
CREATE POLICY "hero_mode_select" ON hero_mode
  FOR SELECT USING (TRUE);

CREATE POLICY "hero_mode_upsert" ON hero_mode
  FOR ALL USING (is_ceo()) WITH CHECK (is_ceo());

-- ── Comments policies ────────────────────────────────────────
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (flagged = FALSE OR is_ceo());

CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (is_ceo());

CREATE POLICY "comments_update" ON comments
  FOR UPDATE USING (is_ceo());

-- ── Categories policies ──────────────────────────────────────
CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (TRUE);

CREATE POLICY "categories_all" ON categories
  FOR ALL USING (is_ceo()) WITH CHECK (is_ceo());

-- ============================================================
-- Storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "media_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "media_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND is_ceo());

CREATE POLICY "media_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'media' AND is_ceo());

-- ============================================================
-- Trigger: auto-create profile on sign-up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'reader')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

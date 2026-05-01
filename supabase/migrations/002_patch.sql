-- ============================================================
-- Wildlife Universe — patch 002
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Add missing columns to posts ────────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS label       TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_id   TEXT;

-- ── Add missing columns to heroes ───────────────────────────
ALTER TABLE heroes ADD COLUMN IF NOT EXISTS title       TEXT;
ALTER TABLE heroes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE heroes ADD COLUMN IF NOT EXISTS cta         JSONB;

-- ── Fix trigger: never fail user creation ───────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'reader')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block user creation due to profile errors
  RETURN NEW;
END;
$$;

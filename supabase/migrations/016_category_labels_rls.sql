-- ============================================================
-- Wildlife Universe — category_labels public-read RLS (migration 016)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Migration 015 created the category_labels table but didn't ship any
-- RLS policies, so Supabase's default-enabled RLS blocked anon reads —
-- public label pages (e.g. /animals/mammals) couldn't load the
-- admin-uploaded hero image, alt text, or short description.
--
-- This migration mirrors the policies on the `categories` table from
-- 001_schema.sql: anon can SELECT every row, but writes are gated to
-- CEO/admin staff (writes already go through service-role API routes,
-- so the write policy is belt-and-braces).
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE category_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "category_labels_select" ON category_labels;
CREATE POLICY "category_labels_select" ON category_labels
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "category_labels_all" ON category_labels;
CREATE POLICY "category_labels_all" ON category_labels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'admin')
    )
  );

COMMENT ON POLICY "category_labels_select" ON category_labels IS
  'Public read so label-landing hero metadata reaches anon visitors.';

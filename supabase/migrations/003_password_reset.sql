-- ============================================================
-- Wildlife Universe — patch 003
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT FALSE;

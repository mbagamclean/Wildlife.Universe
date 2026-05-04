-- ============================================================
-- Wildlife Universe — hero ordering + visibility (migration 007)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Adds the columns the new HeroList drag-reorder + active toggle need:
--   heroes.position  INTEGER DEFAULT 0  — lower = earlier
--   heroes.active    BOOLEAN DEFAULT TRUE — hide without deleting
--
-- Also backfills `position` from creation order so the existing rows
-- start in a stable, edit-friendly arrangement.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE heroes
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active   BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill position from creation order (only rows still at position=0)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
  FROM heroes
  WHERE position = 0
)
UPDATE heroes h
   SET position = o.rn
  FROM ordered o
 WHERE h.id = o.id;

CREATE INDEX IF NOT EXISTS idx_heroes_position ON heroes(position);
CREATE INDEX IF NOT EXISTS idx_heroes_active ON heroes(active) WHERE active = TRUE;

COMMENT ON COLUMN heroes.position IS 'Sort order on the homepage (lower = earlier). Reorderable from /admin/heroes.';
COMMENT ON COLUMN heroes.active IS 'When false the hero is saved but skipped by HeroOrchestrator.';

-- ============================================================
-- Wildlife Universe — search-engine submission log (migration 010)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Records every time we ping a search engine (IndexNow, Google
-- Indexing API, etc.) about a published URL. Used by the admin
-- Indexing Monitor to show submission history and diagnose
-- failures. Optional — searchPing.js silently skips logging if
-- this table is missing.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS indexing_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url     text NOT NULL,
  post_slug    text,
  event_type   text NOT NULL DEFAULT 'publish_ping',
  -- 'publish_ping' | 'update_ping' | 'manual_request' | 'media_ping' | 'bulk_ping'
  ping_results jsonb,
  pinged_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indexing_events_pinged_at ON indexing_events(pinged_at DESC);
CREATE INDEX IF NOT EXISTS idx_indexing_events_post_slug ON indexing_events(post_slug);
CREATE INDEX IF NOT EXISTS idx_indexing_events_event_type ON indexing_events(event_type);

ALTER TABLE indexing_events ENABLE ROW LEVEL SECURITY;

-- Only staff can read the log (it's an internal dashboard).
DROP POLICY IF EXISTS "indexing_events_select_staff" ON indexing_events;
CREATE POLICY "indexing_events_select_staff" ON indexing_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'admin', 'editor', 'writer', 'moderator')
    )
  );

-- Inserts come from server routes using the anon client (no auth.uid()).
-- We allow anon insert because the route handlers already gate access by
-- staff role before they reach the ping. To be extra-strict, run inserts
-- through the service-role key only.
DROP POLICY IF EXISTS "indexing_events_insert_anyone" ON indexing_events;
CREATE POLICY "indexing_events_insert_anyone" ON indexing_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

COMMENT ON TABLE indexing_events IS 'Audit log of search-engine submissions (IndexNow, Google Indexing API).';
COMMENT ON COLUMN indexing_events.ping_results IS 'Array of per-engine result objects: { engine, ok, status, error }.';

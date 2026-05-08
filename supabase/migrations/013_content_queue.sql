-- ============================================================
-- Wildlife Universe — content generation queue (migration 013)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Tracks topics queued for batched AI article generation. The cron
-- worker picks `pending` rows in priority/created order, generates
-- them via the same pipeline the pilot uses, and updates status.
--
-- Status lifecycle:
--   pending     — queued, awaiting generation
--   generating  — claimed by a worker (lock state)
--   generated   — article written and published
--   failed      — quality gate / dedup / API error; see last_error
--   paused      — admin manually parked this row
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS content_queue (
  id                 TEXT PRIMARY KEY,
  category           TEXT NOT NULL,
  label              TEXT NOT NULL,
  topic              TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending',
  generated_post_id  TEXT REFERENCES posts(id) ON DELETE SET NULL,
  attempts           INTEGER NOT NULL DEFAULT 0,
  last_error         TEXT,
  priority           INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_at       TIMESTAMPTZ,
  CONSTRAINT content_queue_status_chk
    CHECK (status IN ('pending','generating','generated','failed','paused')),
  CONSTRAINT content_queue_unique_topic
    UNIQUE (category, label, topic)
);

-- Batch worker picks rows by status + priority + age. Putting all three
-- columns in the index lets it scan only pending rows ordered correctly.
CREATE INDEX IF NOT EXISTS idx_content_queue_pending
  ON content_queue (status, priority DESC, created_at ASC)
  WHERE status = 'pending';

-- Admin queue UI groups rows per label and counts by status.
CREATE INDEX IF NOT EXISTS idx_content_queue_label_status
  ON content_queue (category, label, status);

-- Used when reverse-looking-up a queue row from a generated post.
CREATE INDEX IF NOT EXISTS idx_content_queue_generated_post_id
  ON content_queue (generated_post_id)
  WHERE generated_post_id IS NOT NULL;

-- Auto-bump updated_at on UPDATE so the worker doesn't have to touch it
-- explicitly. (Mirrors the pattern other Wildlife.Universe tables use.)
CREATE OR REPLACE FUNCTION content_queue_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_queue_updated_at ON content_queue;
CREATE TRIGGER trg_content_queue_updated_at
  BEFORE UPDATE ON content_queue
  FOR EACH ROW
  EXECUTE FUNCTION content_queue_set_updated_at();

COMMENT ON TABLE content_queue IS
  'Queued topics for the batch article generator. Cron worker picks pending rows, generates via /api/ai/write + /api/ai/image, and updates status.';
COMMENT ON COLUMN content_queue.topic IS
  'The full canonical title to write about, e.g. "Sunda Pangolin (Manis javanica)".';
COMMENT ON COLUMN content_queue.priority IS
  'Higher priority is generated first within the pending pool. Default 0.';
COMMENT ON COLUMN content_queue.attempts IS
  'Number of generation attempts. Worker gives up after 3 retries — admin must reset to retry further.';

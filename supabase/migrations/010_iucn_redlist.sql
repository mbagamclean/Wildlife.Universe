-- 010_iucn_redlist.sql
-- IUCN Red List feature — adds scientific name and verification metadata.
-- Frontend filtering via /redlist page benefits from a partial index on iucn_status.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS scientific_name   TEXT,
  ADD COLUMN IF NOT EXISTS iucn_verified     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iucn_verified_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS posts_iucn_status_idx
  ON posts (iucn_status)
  WHERE iucn_status IS NOT NULL;

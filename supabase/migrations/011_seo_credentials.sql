-- ============================================================
-- Wildlife Universe — SEO provider credentials (migration 011)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Stores OAuth tokens granted by site staff so server-side jobs can
-- talk to Google Indexing API / Search Console / Bing on the
-- authorising user's behalf. One row per provider — newer rows
-- replace older ones via ON CONFLICT.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS seo_credentials (
  provider      text PRIMARY KEY,           -- 'google_indexing'
  refresh_token text NOT NULL,
  scopes        text,
  granted_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_email text,
  granted_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $f$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $f$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_seo_credentials_updated_at ON seo_credentials;
CREATE TRIGGER trg_seo_credentials_updated_at
  BEFORE UPDATE ON seo_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE seo_credentials ENABLE ROW LEVEL SECURITY;

-- Reads gated to staff (admin UI shows connection status); writes happen
-- through server routes that already gate by staff role. Refresh tokens
-- never leave the server — only `granted_email` and `granted_at` are
-- surfaced to the UI.
DROP POLICY IF EXISTS "seo_credentials_select_staff" ON seo_credentials;
CREATE POLICY "seo_credentials_select_staff" ON seo_credentials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS "seo_credentials_write_staff" ON seo_credentials;
CREATE POLICY "seo_credentials_write_staff" ON seo_credentials
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

COMMENT ON TABLE seo_credentials IS 'OAuth refresh tokens for SEO providers (Google Indexing API, etc).';

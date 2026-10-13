-- ==========================================================================
--  error_logs — Centralized error tracking for frontend + backend
--  Alerts dispatched via /api/error-log → Uazapi WhatsApp
-- ==========================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  severity    TEXT NOT NULL CHECK (severity IN ('critical','error','warn','info')),
  source      TEXT NOT NULL CHECK (source IN ('frontend','api','auth','database')),
  message     TEXT NOT NULL,
  stack       TEXT,
  context     JSONB DEFAULT '{}',
  url         TEXT,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created  ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_source   ON error_logs(source);

-- RLS: authenticated users can INSERT (report errors), only service_role can SELECT
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_report_errors"
  ON error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "users_see_own_errors"
  ON error_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE error_logs IS 'Centralized error tracking — frontend JS errors, API failures, auth issues. Critical/error severity triggers WhatsApp alert.';
COMMENT ON COLUMN error_logs.severity IS 'critical=immediate alert, error=alert, warn=log only, info=log only';
COMMENT ON COLUMN error_logs.source IS 'Origin layer: frontend, api, auth, database';
COMMENT ON COLUMN error_logs.context IS 'JSON with extra context: endpoint, payload size, response status, etc';

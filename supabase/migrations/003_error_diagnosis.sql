-- ==========================================================================
--  003_error_diagnosis — Auto-remediation pipeline columns
--  Adds diagnosis capabilities to error_logs for Opus 4.6 analysis
-- ==========================================================================

-- New columns for diagnosis workflow
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS fix_status TEXT DEFAULT 'new';
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS diagnosis JSONB;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS diagnosed_at TIMESTAMPTZ;
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS fix_suggestion TEXT;

-- Check constraint for fix_status lifecycle
DO $$ BEGIN
  ALTER TABLE error_logs ADD CONSTRAINT chk_fix_status
    CHECK (fix_status IN ('new','diagnosing','diagnosed','fix_suggested','resolved','ignored'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Partial index for cron job: only pending errors
CREATE INDEX IF NOT EXISTS idx_error_logs_pending
  ON error_logs(created_at DESC)
  WHERE fix_status = 'new';

-- Index for diagnosis queries
CREATE INDEX IF NOT EXISTS idx_error_logs_fix_status
  ON error_logs(fix_status);

-- RLS: allow API endpoints (anon) to UPDATE diagnosis fields
CREATE POLICY "api_can_update_diagnosis"
  ON error_logs FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON COLUMN error_logs.fix_status IS 'Diagnosis lifecycle: new → diagnosing → diagnosed → fix_suggested → resolved | ignored';
COMMENT ON COLUMN error_logs.diagnosis IS 'Structured diagnosis from Opus 4.6: root_cause, category, suggested_fix, remediation_steps, confidence';
COMMENT ON COLUMN error_logs.diagnosed_at IS 'Timestamp when Opus 4.6 completed diagnosis';
COMMENT ON COLUMN error_logs.fix_suggestion IS 'Human-readable fix suggestion extracted from diagnosis';

-- 004_auto_fix_states.sql
-- Expand error lifecycle to support auto-fix daemon
-- New states: 'fixing' (in progress), 'fix_failed' (auto-fix failed)

-- Drop old constraint
ALTER TABLE error_logs DROP CONSTRAINT IF EXISTS chk_fix_status;

-- Add updated constraint with full lifecycle
-- new → diagnosing → diagnosed → fixing → resolved
--                              → fix_suggested (manual)
--                              → fix_failed
--                              → ignored
ALTER TABLE error_logs ADD CONSTRAINT chk_fix_status
  CHECK (fix_status IN (
    'new',
    'diagnosing',
    'diagnosed',
    'fix_suggested',
    'fixing',
    'resolved',
    'fix_failed',
    'ignored'
  ));

-- Index for daemon polling: find auto-fixable errors quickly
CREATE INDEX IF NOT EXISTS idx_error_logs_auto_fixable
  ON error_logs (created_at DESC)
  WHERE fix_status IN ('diagnosed', 'fix_suggested');

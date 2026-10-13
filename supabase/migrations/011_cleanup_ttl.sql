-- ==========================================================================
--  011_cleanup_ttl — TTL cleanup for daemon_heartbeats and error_logs
--  Debito D5: tables accumulate data indefinitely with no cleanup
--  Fix: cleanup function + indexes for efficient deletion
-- ==========================================================================

-- Step 1: Ensure created_at index exists on error_logs (for TTL queries)
-- Note: idx_error_logs_created already exists from 002, but let's be safe
CREATE INDEX IF NOT EXISTS idx_error_logs_created
  ON error_logs(created_at DESC);

-- Step 2: Index on daemon_heartbeats.recorded_at (already exists from 005)
CREATE INDEX IF NOT EXISTS idx_daemon_heartbeats_recorded_at
  ON daemon_heartbeats(recorded_at DESC);

-- Step 3: Add index on error_logs fix_status + created_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_cleanup
  ON error_logs(created_at)
  WHERE fix_status IN ('resolved', 'ignored');

-- Step 4: Cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  heartbeats_deleted INTEGER;
  errors_deleted INTEGER;
  result JSONB;
BEGIN
  -- Delete daemon heartbeats older than 7 days
  DELETE FROM daemon_heartbeats
  WHERE recorded_at < now() - interval '7 days';
  GET DIAGNOSTICS heartbeats_deleted = ROW_COUNT;

  -- Delete resolved/ignored error_logs older than 30 days
  DELETE FROM error_logs
  WHERE created_at < now() - interval '30 days'
    AND fix_status IN ('resolved', 'ignored');
  GET DIAGNOSTICS errors_deleted = ROW_COUNT;

  result := jsonb_build_object(
    'heartbeats_deleted', heartbeats_deleted,
    'errors_deleted', errors_deleted,
    'executed_at', now()
  );

  RAISE NOTICE 'Cleanup complete: % heartbeats, % errors deleted',
    heartbeats_deleted, errors_deleted;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION cleanup_old_records() IS
  'TTL cleanup: removes daemon_heartbeats > 7 days and resolved/ignored error_logs > 30 days. '
  'Call via Supabase RPC: supabase.rpc("cleanup_old_records"). '
  'Recommended: schedule via Vercel cron or pg_cron every 24h.';

-- Step 5: Grant execute to service_role only (not anon/authenticated)
REVOKE ALL ON FUNCTION cleanup_old_records() FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_old_records() FROM anon;
REVOKE ALL ON FUNCTION cleanup_old_records() FROM authenticated;
-- service_role has superuser-like access in Supabase, so no explicit GRANT needed

-- ==========================================================================
--  USAGE INSTRUCTIONS:
--
--  Option A — Vercel Cron (recommended for this project):
--    Create /api/cron/cleanup.js:
--      const { createClient } = require('@supabase/supabase-js');
--      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
--      const { data } = await supabase.rpc('cleanup_old_records');
--      console.log('Cleanup result:', data);
--
--    In vercel.json add:
--      { "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }] }
--
--  Option B — pg_cron (if available on your Supabase plan):
--    SELECT cron.schedule('cleanup-ttl', '0 3 * * *',
--      $$SELECT cleanup_old_records()$$);
-- ==========================================================================

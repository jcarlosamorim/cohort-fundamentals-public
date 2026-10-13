-- ==========================================================================
--  010_error_logs_rate_limit — Restrict error_logs INSERT to authenticated
--  Debito D3: anon INSERT without rate limiting is a spam vector
--  Fix: revoke anon INSERT, allow only authenticated users to log errors
-- ==========================================================================

-- Step 1: Drop the old permissive policy that allows anon INSERT
DROP POLICY IF EXISTS "anyone_can_report_errors" ON error_logs;

-- Step 2: Create new policy — only authenticated users can INSERT
CREATE POLICY "authenticated_can_report_errors"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 3: Also restrict the UPDATE policy from 003 (diagnosis updates)
-- API endpoints should use service_role key, not anon
DROP POLICY IF EXISTS "api_can_update_diagnosis" ON error_logs;

CREATE POLICY "service_can_update_diagnosis"
  ON error_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Note: API endpoints (Vercel serverless functions) that need to INSERT or
-- UPDATE error_logs should use SUPABASE_SERVICE_ROLE_KEY, not the anon key.
-- The anon role no longer has INSERT or UPDATE access to this table.

COMMENT ON POLICY "authenticated_can_report_errors" ON error_logs IS
  'D3 fix: only authenticated users can report errors. API endpoints use service_role key.';

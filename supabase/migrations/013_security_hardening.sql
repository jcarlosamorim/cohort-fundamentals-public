-- ==========================================================================
--  013_security_hardening — Correcoes de seguranca (auditoria 2026-02-22)
--  Fixes: C1 (RLS api_token_usage), C2 (UPDATE error_logs),
--         H1 (email leak leaderboard), H2 (search_path SECURITY DEFINER),
--         H3 (daemon_heartbeats policy explicita), M1 (INSERT user_id)
-- ==========================================================================

-- =========================================================================
-- C1: api_token_usage — Tabela criada sem RLS (qualquer anon pode ler/escrever)
-- Fix: Habilitar RLS. Nenhuma policy para anon/authenticated.
--      Somente service_role (que bypassa RLS) pode inserir via API endpoints.
-- =========================================================================

ALTER TABLE api_token_usage ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy = acesso bloqueado para anon e authenticated.
-- API endpoints usam SUPABASE_SERVICE_ROLE_KEY que bypassa RLS.

COMMENT ON TABLE api_token_usage IS
  'Consumo de tokens por endpoint/modelo. RLS habilitado — somente service_role pode inserir. '
  'Anon e authenticated nao tem acesso.';

-- =========================================================================
-- C2: error_logs UPDATE policy excessivamente permissiva
-- Antes: qualquer authenticated podia UPDATE qualquer row (USING true)
-- Fix: Remover policy. service_role (usado pelas APIs) bypassa RLS.
-- =========================================================================

DROP POLICY IF EXISTS "service_can_update_diagnosis" ON error_logs;

-- Sem policy de UPDATE para authenticated = bloqueado.
-- API endpoints (error-diagnose.js, cron/diagnose-errors.js) usam service_role.

-- =========================================================================
-- M1: error_logs INSERT nao valida user_id
-- Antes: WITH CHECK (true) permitia atribuir erro a outro usuario
-- Fix: user_id deve ser NULL ou o proprio auth.uid()
-- =========================================================================

DROP POLICY IF EXISTS "authenticated_can_report_errors" ON error_logs;

CREATE POLICY "authenticated_can_report_errors"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- =========================================================================
-- H1: get_leaderboard() expoe email completo dos usuarios (violacao LGPD)
-- Fix: Mascarar email — mostrar apenas primeira letra + '***@' + dominio
-- H2: Adicionar SET search_path para prevenir search path injection
-- =========================================================================

CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  user_id   UUID,
  email     TEXT,
  total_xp  BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT
    sr.user_id,
    LEFT(au.email, 1) || '***@' || SPLIT_PART(au.email, '@', 2) AS email,
    COALESCE(SUM(sr.points), 0) AS total_xp
  FROM scenario_results sr
  JOIN auth.users au ON au.id = sr.user_id
  WHERE sr.correct = true
  GROUP BY sr.user_id, au.email
  ORDER BY total_xp DESC
  LIMIT 100;
$$;

COMMENT ON FUNCTION get_leaderboard IS
  'Ranking top 100 alunos por XP. Email mascarado (LGPD). SECURITY DEFINER com search_path fixo.';

GRANT EXECUTE ON FUNCTION get_leaderboard TO authenticated;

-- =========================================================================
-- H2: cleanup_old_records() sem search_path (search path injection)
-- Fix: Recriar com SET search_path
-- =========================================================================

CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  heartbeats_deleted INTEGER;
  errors_deleted INTEGER;
  result JSONB;
BEGIN
  DELETE FROM daemon_heartbeats
  WHERE recorded_at < now() - interval '7 days';
  GET DIAGNOSTICS heartbeats_deleted = ROW_COUNT;

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

REVOKE ALL ON FUNCTION cleanup_old_records() FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_old_records() FROM anon;
REVOKE ALL ON FUNCTION cleanup_old_records() FROM authenticated;

COMMENT ON FUNCTION cleanup_old_records() IS
  'TTL cleanup com search_path fixo. Somente service_role pode executar.';

-- =========================================================================
-- H3: daemon_heartbeats — RLS ativado mas nenhuma policy explicita
-- Fix: Adicionar policy explicita de deny (documentacao + seguranca defensiva)
-- service_role continua bypassando RLS normalmente
-- =========================================================================

-- Policy de SELECT vazia que nega tudo para authenticated (defesa explicita)
DO $$ BEGIN
  CREATE POLICY "deny_all_authenticated"
    ON daemon_heartbeats FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON POLICY "deny_all_authenticated" ON daemon_heartbeats IS
  'Bloqueia explicitamente acesso de usuarios autenticados. Somente service_role (daemon) pode acessar.';

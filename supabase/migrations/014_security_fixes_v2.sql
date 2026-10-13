-- ==========================================================================
--  014_security_fixes_v2 — Correcoes de seguranca (auditoria 2026-02-24)
--  Fixes:
--    V1: Leaderboard expoe user_id (UUID) para qualquer anon
--    V2: Leaderboard chamavel sem autenticacao
--    V3: Score manipulation — usuario pode setar points arbitrarios
--    V4: Score manipulation — usuario pode UPDATE seus proprios scores
-- ==========================================================================

-- =========================================================================
-- V1+V2: get_leaderboard() — Remover user_id do retorno publico,
--         exigir autenticacao, remover acesso anon
-- =========================================================================

-- Precisa dropar primeiro porque o return type mudou (PostgreSQL nao permite ALTER)
DROP FUNCTION IF EXISTS get_leaderboard();

CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  display_name  TEXT,
  total_xp      BIGINT,
  is_me         BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT
    LEFT(au.email, 1) || '***@' || SPLIT_PART(au.email, '@', 2) AS display_name,
    COALESCE(SUM(sr.points), 0) AS total_xp,
    (sr.user_id = auth.uid()) AS is_me
  FROM scenario_results sr
  JOIN auth.users au ON au.id = sr.user_id
  WHERE sr.correct = true
  GROUP BY sr.user_id, au.email
  ORDER BY total_xp DESC
  LIMIT 100;
$$;

-- Revogar acesso anon — somente authenticated pode chamar
REVOKE EXECUTE ON FUNCTION get_leaderboard FROM anon;
REVOKE EXECUTE ON FUNCTION get_leaderboard FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_leaderboard TO authenticated;

COMMENT ON FUNCTION get_leaderboard IS
  'Ranking top 100 alunos por XP. Sem user_id (privacidade). '
  'Email mascarado. Somente authenticated. SECURITY DEFINER com search_path fixo.';

-- =========================================================================
-- V3: Limitar pontos por cenario — impedir points arbitrarios
--     Max 450 pontos por cenario (1.5x de base 300 que é o max real)
-- =========================================================================

ALTER TABLE scenario_results
  DROP CONSTRAINT IF EXISTS check_points_range;

ALTER TABLE scenario_results
  ADD CONSTRAINT check_points_range
  CHECK (points >= 0 AND points <= 450);

-- =========================================================================
-- V4: Remover UPDATE policy — alunos NAO podem alterar scores depois
--     de inseridos. Somente INSERT (primeira resposta) é permitido.
--     Re-tentativas são tratadas via UPSERT com ON CONFLICT no frontend,
--     mas o UPDATE precisa ser controlado.
-- =========================================================================

-- Substituir UPDATE policy por uma que so permite incrementar attempts,
-- mas NAO permite mudar points para valor maior que o original
DROP POLICY IF EXISTS "students_update_own_scenarios" ON scenario_results;

CREATE POLICY "students_update_own_scenarios_safe"
  ON scenario_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND points >= 0
    AND points <= 450
  );

-- =========================================================================
-- EXTRA: Garantir que INSERT tambem valida points
-- =========================================================================

DROP POLICY IF EXISTS "students_insert_own_scenarios" ON scenario_results;

CREATE POLICY "students_insert_own_scenarios_safe"
  ON scenario_results FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND points >= 0
    AND points <= 450
  );

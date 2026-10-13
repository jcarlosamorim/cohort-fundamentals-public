-- ==========================================================================
--  get_leaderboard — RPC para ranking de XP
--  Usado por persistence.js (fetchLeaderboard)
--  Retorna top alunos por XP total (cenários corretos)
-- ==========================================================================

CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  user_id   UUID,
  email     TEXT,
  total_xp  BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    sr.user_id,
    au.email,
    COALESCE(SUM(sr.points), 0) AS total_xp
  FROM scenario_results sr
  JOIN auth.users au ON au.id = sr.user_id
  WHERE sr.correct = true
  GROUP BY sr.user_id, au.email
  ORDER BY total_xp DESC
  LIMIT 100;
$$;

COMMENT ON FUNCTION get_leaderboard IS 'Retorna ranking dos top 100 alunos por XP total. Usado pelo widget de leaderboard realtime.';

-- Permissão para usuários autenticados chamarem a RPC
GRANT EXECUTE ON FUNCTION get_leaderboard TO authenticated;

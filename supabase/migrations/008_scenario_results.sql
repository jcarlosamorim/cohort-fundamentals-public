-- ==========================================================================
--  scenario_results — Resultados de cenários interativos (gamificação)
--  Usado por persistence.js (saveScenarioResult, loadScenarioResults, etc.)
--  Alimenta o leaderboard via RPC get_leaderboard
-- ==========================================================================

CREATE TABLE IF NOT EXISTS scenario_results (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id   TEXT NOT NULL,
  page_key      TEXT NOT NULL DEFAULT '',
  correct       BOOLEAN NOT NULL DEFAULT false,
  attempts      INTEGER NOT NULL DEFAULT 1,
  points        INTEGER NOT NULL DEFAULT 0,
  answered_at   TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_scenario_results_user
  ON scenario_results(user_id);

CREATE INDEX IF NOT EXISTS idx_scenario_results_page
  ON scenario_results(page_key);

-- RLS: cada aluno lê/escreve apenas seus próprios resultados
ALTER TABLE scenario_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_own_scenarios"
  ON scenario_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "students_insert_own_scenarios"
  ON scenario_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "students_update_own_scenarios"
  ON scenario_results FOR UPDATE
  USING (auth.uid() = user_id);

-- SELECT para leaderboard: qualquer autenticado pode ler aggregates
-- (a RPC get_leaderboard usa SECURITY DEFINER, então essa policy é suficiente)

COMMENT ON TABLE scenario_results IS 'Resultados dos cenários interativos (quiz, sequência, terminal, branching, squad-builder). Base do leaderboard XP.';
COMMENT ON COLUMN scenario_results.page_key IS 'Identificador da página (ex: e1-fundacao, e2-organizacao) para agrupar por encontro.';
COMMENT ON COLUMN scenario_results.points IS 'XP ganhos neste cenário. Primeiro acerto = base * 1.5, demais = base.';

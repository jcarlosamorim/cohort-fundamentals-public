-- ==========================================================================
--  student_progress — Rastreamento de tempo por encontro/aula
--  Usado por persistence.js (saveTimeSpent, loadProgress)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS student_progress (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encontro_id         INTEGER NOT NULL,
  lesson_slug         TEXT NOT NULL DEFAULT '',
  time_spent_seconds  INTEGER NOT NULL DEFAULT 0,
  last_accessed_at    TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, encontro_id, lesson_slug)
);

CREATE INDEX IF NOT EXISTS idx_student_progress_user
  ON student_progress(user_id);

-- RLS: cada aluno lê/escreve apenas seus próprios dados
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_own_progress"
  ON student_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "students_insert_own_progress"
  ON student_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "students_update_own_progress"
  ON student_progress FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE student_progress IS 'Tempo gasto por aluno em cada encontro/aula. Atualizado incrementalmente via persistence.js.';
COMMENT ON COLUMN student_progress.lesson_slug IS 'Slug da aula dentro do encontro (ex: fundacao, fluxos). Vazio para overview.';

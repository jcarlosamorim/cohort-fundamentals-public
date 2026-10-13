-- ==========================================================================
--  student_notes — Notas pessoais por encontro/aula
--  Usado por persistence.js (loadNote, saveNoteDebounced)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS student_notes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encontro_id   INTEGER NOT NULL,
  lesson_slug   TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, encontro_id, lesson_slug)
);

CREATE INDEX IF NOT EXISTS idx_student_notes_user
  ON student_notes(user_id);

-- RLS: cada aluno lê/escreve apenas suas próprias notas
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_own_notes"
  ON student_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "students_insert_own_notes"
  ON student_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "students_update_own_notes"
  ON student_notes FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para auto-update de updated_at (reutiliza função de migration 001)
CREATE TRIGGER trg_student_notes_updated_at
  BEFORE UPDATE ON student_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE student_notes IS 'Notas pessoais de cada aluno por encontro/aula. Salvamento com debounce de 1.5s.';

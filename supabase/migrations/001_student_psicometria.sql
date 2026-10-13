-- ==========================================================================
--  student_psicometria — Persiste resultado da análise psicométrica
--  Cache L2 (Supabase) para dados que hoje vivem só em localStorage
-- ==========================================================================

CREATE TABLE IF NOT EXISTS student_psicometria (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_data  JSONB NOT NULL,
  source_text   TEXT,
  file_name     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)  -- um resultado por aluno (upsert-friendly)
);

-- Index para lookup por user_id (coberto pela UNIQUE, mas explícito para clareza)
CREATE INDEX IF NOT EXISTS idx_student_psicometria_user
  ON student_psicometria(user_id);

-- RLS: cada aluno vê/edita apenas seus próprios dados
ALTER TABLE student_psicometria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_own_psicometria"
  ON student_psicometria FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "students_insert_own_psicometria"
  ON student_psicometria FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "students_update_own_psicometria"
  ON student_psicometria FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para auto-update de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_psicometria_updated_at
  BEFORE UPDATE ON student_psicometria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE student_psicometria IS 'Armazena resultado da análise psicométrica (7 frameworks). Cache L2 — localStorage é L1.';
COMMENT ON COLUMN student_psicometria.profile_data IS 'JSON completo retornado por /api/analyze (profile, zones, talents, kolbe, hormozi, etc)';
COMMENT ON COLUMN student_psicometria.source_text IS 'Texto original do PDF/MD/TXT para contexto da Aurora (até 100k chars)';

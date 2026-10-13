-- ==========================================================================
--  student_pipeline — Leads no Kanban do Business Menu
--  Usado por persistence.js (loadPipeline, savePipelineLead, etc.)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS student_pipeline (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_name         TEXT NOT NULL,
  lead_handle       TEXT,
  lead_platform     TEXT NOT NULL DEFAULT 'instagram',
  lead_bio          TEXT,
  lead_followers    INTEGER NOT NULL DEFAULT 0,
  column_id         TEXT NOT NULL DEFAULT 'spears',
  position          INTEGER NOT NULL DEFAULT 0,
  suggested_message TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_user_column
  ON student_pipeline(user_id, column_id);

-- RLS: cada aluno le/escreve apenas seus proprios leads
ALTER TABLE student_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_own_pipeline"
  ON student_pipeline FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "students_insert_own_pipeline"
  ON student_pipeline FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "students_update_own_pipeline"
  ON student_pipeline FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "students_delete_own_pipeline"
  ON student_pipeline FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_student_pipeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_pipeline_updated_at
  BEFORE UPDATE ON student_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION update_student_pipeline_updated_at();

-- Validar column_id contra valores permitidos
ALTER TABLE student_pipeline
  ADD CONSTRAINT chk_pipeline_column_id
  CHECK (column_id IN ('seeds', 'nets', 'spears', 'calls', 'deals'));

COMMENT ON TABLE student_pipeline IS 'Leads do pipeline de prospeccao no Business Menu. Kanban com 5 colunas fixas.';
COMMENT ON COLUMN student_pipeline.column_id IS 'Coluna do Kanban: seeds, nets, spears, calls, deals';
COMMENT ON COLUMN student_pipeline.position IS 'Ordem do card dentro da coluna (0-based, para drag-drop reorder)';

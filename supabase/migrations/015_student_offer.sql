-- ==========================================================================
--  student_offer — Oferta do aluno (Business Menu)
--  Usado por persistence.js (loadOffer, saveOffer)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS student_offer (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  title            TEXT NOT NULL DEFAULT '',
  ticket           INTEGER NOT NULL DEFAULT 0,
  perceived_value  INTEGER NOT NULL DEFAULT 0,
  value_score      NUMERIC(3,1) NOT NULL DEFAULT 0,
  core_four        JSONB NOT NULL DEFAULT '{}',
  roadmap_phase    INTEGER NOT NULL DEFAULT 1,
  roadmap_checklist JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_offer_user
  ON student_offer(user_id);

-- RLS: cada aluno le/escreve apenas sua propria oferta
ALTER TABLE student_offer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_own_offer"
  ON student_offer FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "students_insert_own_offer"
  ON student_offer FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "students_update_own_offer"
  ON student_offer FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_student_offer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_offer_updated_at
  BEFORE UPDATE ON student_offer
  FOR EACH ROW
  EXECUTE FUNCTION update_student_offer_updated_at();

COMMENT ON TABLE student_offer IS 'Oferta personalizada do aluno no Business Menu. Um registro por aluno (UNIQUE user_id).';
COMMENT ON COLUMN student_offer.core_four IS 'Progresso semanal do Core Four: { warmOutreach: { current, goal }, freeContent: {...}, coldOutreach: {...}, paidAds: {...} }';
COMMENT ON COLUMN student_offer.roadmap_checklist IS 'Array de marcos do roadmap 30-60-90: [{ id, label, done }]';

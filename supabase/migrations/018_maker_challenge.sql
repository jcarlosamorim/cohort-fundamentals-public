-- ============================================================================
-- Migration 018: Maker Challenge - Desafio Filtro 72h
-- Tabela para armazenar candidaturas e avaliações do Maker Sprint Challenge
-- ============================================================================

-- 1. Tabela principal de candidaturas
CREATE TABLE IF NOT EXISTS maker_challenge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Dados do candidato
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Phase 1: Filtro de Intenção
  hours_per_week INTEGER NOT NULL,
  tools_known TEXT[] DEFAULT '{}',
  tools_other TEXT,
  commitment_level INTEGER NOT NULL CHECK (commitment_level BETWEEN 1 AND 10),
  motivation TEXT NOT NULL,
  available_72h BOOLEAN NOT NULL DEFAULT false,
  biggest_build TEXT,
  preferred_role TEXT CHECK (preferred_role IN ('executor', 'builder', 'both', 'unsure')),

  -- Phase 2: Sprint Tracking
  phase TEXT DEFAULT 'applied' CHECK (phase IN (
    'applied',        -- Enviou formulário
    'approved',       -- Aprovado para sprint
    'sprint_active',  -- Sprint em andamento
    'submitted',      -- Entregou o sprint
    'evaluated',      -- Avaliado
    'rejected'        -- Não aprovado
  )),
  sprint_brief TEXT,
  sprint_started_at TIMESTAMPTZ,
  sprint_deadline_at TIMESTAMPTZ,
  sprint_submitted_at TIMESTAMPTZ,
  submission_url TEXT,
  submission_notes TEXT,

  -- Phase 3: Avaliação
  score_execution INTEGER CHECK (score_execution BETWEEN 0 AND 10),
  score_quality INTEGER CHECK (score_quality BETWEEN 0 AND 10),
  score_speed INTEGER CHECK (score_speed BETWEEN 0 AND 10),
  score_communication INTEGER CHECK (score_communication BETWEEN 0 AND 10),
  score_resourcefulness INTEGER CHECK (score_resourcefulness BETWEEN 0 AND 10),
  total_score NUMERIC(4,1),
  evaluator_notes TEXT,
  verdict TEXT CHECK (verdict IN ('maker_confirmed', 'needs_development', 'not_maker')),

  -- Maker Purity Score (do psicometria, se disponível)
  kolbe_ft INTEGER,
  kolbe_im INTEGER,
  kolbe_qs INTEGER,
  maker_purity_score INTEGER,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_maker_challenge_email ON maker_challenge(email);
CREATE INDEX IF NOT EXISTS idx_maker_challenge_phase ON maker_challenge(phase);
CREATE INDEX IF NOT EXISTS idx_maker_challenge_verdict ON maker_challenge(verdict);

-- 3. RLS - Formulário público para INSERT, admin para o resto
ALTER TABLE maker_challenge ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode se candidatar (INSERT público via anon key)
CREATE POLICY "anyone_can_apply"
  ON maker_challenge FOR INSERT
  WITH CHECK (true);

-- Apenas usuários autenticados podem ler (admin)
CREATE POLICY "authenticated_can_read"
  ON maker_challenge FOR SELECT
  USING (auth.role() = 'authenticated');

-- Apenas usuários autenticados podem atualizar (admin)
CREATE POLICY "authenticated_can_update"
  ON maker_challenge FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 4. Trigger de updated_at
CREATE OR REPLACE FUNCTION update_maker_challenge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_maker_challenge_updated_at
  BEFORE UPDATE ON maker_challenge
  FOR EACH ROW
  EXECUTE FUNCTION update_maker_challenge_updated_at();

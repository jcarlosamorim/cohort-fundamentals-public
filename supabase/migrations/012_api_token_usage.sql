-- Migration 012: API Token Usage Tracking
-- Tabela para monitorar consumo de tokens por endpoint/modelo

CREATE TABLE api_token_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_token_usage_created ON api_token_usage(created_at DESC);

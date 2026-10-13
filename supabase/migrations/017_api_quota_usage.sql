-- 017_api_quota_usage.sql
-- Tabela para controle de quotas por usuario (psicometria: 3/semana, aurora: 20/dia)

CREATE TABLE api_quota_usage (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quota_user_endpoint_time
  ON api_quota_usage(user_id, endpoint, created_at DESC);

ALTER TABLE api_quota_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_quota"
  ON api_quota_usage FOR SELECT
  USING (auth.uid() = user_id);

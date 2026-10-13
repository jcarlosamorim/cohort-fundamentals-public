-- 005_daemon_heartbeats.sql
-- Persistent heartbeat table for auto-fix daemon monitoring
-- Daemon writes one row per poll cycle (every 30s)
-- Auto-cleanup: only last 24h retained (cleaned at write time by daemon)

CREATE TABLE IF NOT EXISTS daemon_heartbeats (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recorded_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  uptime_seconds         INTEGER NOT NULL,
  total_fixed            INTEGER NOT NULL DEFAULT 0,
  total_failed           INTEGER NOT NULL DEFAULT 0,
  total_skipped          INTEGER NOT NULL DEFAULT 0,
  circuit_breaker_status TEXT NOT NULL DEFAULT 'CLOSED'
                           CHECK (circuit_breaker_status IN ('OPEN', 'CLOSED')),
  model                  TEXT NOT NULL DEFAULT 'opus',
  is_dry_run             BOOLEAN NOT NULL DEFAULT false,
  last_error_fixed       TEXT,
  poll_count             INTEGER NOT NULL DEFAULT 0
);

-- Fast "most recent heartbeat" query
CREATE INDEX IF NOT EXISTS idx_daemon_heartbeats_recorded_at
  ON daemon_heartbeats (recorded_at DESC);

-- RLS: only service_role may read/write (daemon uses service role key)
ALTER TABLE daemon_heartbeats ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE daemon_heartbeats IS
  'One row per poll cycle from the auto-fix daemon. Query MAX(recorded_at) to check liveness. If > 2min stale, daemon is likely down.';

-- ==========================================================================
-- Cohort Fundamentals - Supabase Schema Migration
-- Run this in Supabase Dashboard > SQL Editor
-- ==========================================================================

-- student_progress (1 row per student per lesson)
CREATE TABLE student_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  encontro_id INTEGER NOT NULL,
  lesson_slug TEXT DEFAULT '',
  completed BOOLEAN DEFAULT FALSE,
  time_spent_seconds INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, encontro_id, lesson_slug)
);

-- scenario_results (1 row per student per scenario)
CREATE TABLE scenario_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scenario_id TEXT NOT NULL,
  page_key TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  attempts INTEGER DEFAULT 1,
  answered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, scenario_id)
);

-- student_notes (1 row per student per lesson)
CREATE TABLE student_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  encontro_id INTEGER NOT NULL,
  lesson_slug TEXT DEFAULT '',
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, encontro_id, lesson_slug)
);

-- RLS (Row Level Security)
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_progress_select" ON student_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_progress_insert" ON student_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_progress_update" ON student_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "own_results_select" ON scenario_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_results_insert" ON scenario_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_results_update" ON scenario_results FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "own_notes_select" ON student_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_notes_insert" ON student_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_notes_update" ON student_notes FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_progress_user ON student_progress(user_id);
CREATE INDEX idx_results_user ON scenario_results(user_id);
CREATE INDEX idx_notes_user ON student_notes(user_id);

-- ==========================================================================
-- quiz_rankings (realtime leaderboard, 1 row per user per quiz)
-- ==========================================================================
CREATE TABLE quiz_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  time_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);

-- RLS: Everyone authenticated can READ (leaderboard), only own rows for write
ALTER TABLE quiz_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rankings_select_all" ON quiz_rankings FOR SELECT USING (true);
CREATE POLICY "rankings_insert_own" ON quiz_rankings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rankings_update_own" ON quiz_rankings FOR UPDATE USING (auth.uid() = user_id);

-- Enable Supabase Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_rankings;

-- Index optimized for leaderboard query (score DESC, time ASC)
CREATE INDEX idx_rankings_quiz ON quiz_rankings(quiz_id, score DESC, time_seconds ASC);

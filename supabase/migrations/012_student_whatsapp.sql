-- ==========================================================================
-- student_whatsapp: links user account to WhatsApp phone number
-- Used for matching WhatsApp group messages to student profiles (timeline)
-- Already executed on 2026-02-27
-- ==========================================================================

CREATE TABLE student_whatsapp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  whatsapp_phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE student_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_whatsapp_select" ON student_whatsapp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_whatsapp_insert" ON student_whatsapp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_whatsapp_update" ON student_whatsapp FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_whatsapp_user ON student_whatsapp(user_id);
CREATE INDEX idx_whatsapp_phone ON student_whatsapp(whatsapp_phone);

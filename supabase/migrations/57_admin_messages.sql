-- Admin Messages: logs messages sent from admin panel to Telegram bot users
CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('individual', 'broadcast', 'segment')),
  recipient_id UUID REFERENCES profiles(id),        -- for individual messages
  recipient_filter JSONB,                            -- for segment filters
  message_text TEXT NOT NULL,
  total_recipients INTEGER DEFAULT 0,
  successful_sends INTEGER DEFAULT 0,
  failed_sends INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage messages"
  ON admin_messages FOR ALL
  USING (public.is_admin());

-- Index for history queries
CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON admin_messages(created_at DESC);

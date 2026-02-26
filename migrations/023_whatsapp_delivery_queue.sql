-- WhatsApp message delivery queue
-- Adds delivery columns to messages table so Vercel can queue WhatsApp messages
-- for the local Mac polling script to deliver via OpenClaw.
-- Same pattern as phone_verification_codes delivery (migration 021).

ALTER TABLE messages ADD COLUMN whatsapp_message TEXT;
ALTER TABLE messages ADD COLUMN whatsapp_delivered_at TEXT;
ALTER TABLE messages ADD COLUMN whatsapp_expires_at TEXT;
ALTER TABLE messages ADD COLUMN whatsapp_attempts INTEGER NOT NULL DEFAULT 0;

-- Partial index: only scans rows that have pending WhatsApp delivery
CREATE INDEX idx_messages_wa_delivery
  ON messages(whatsapp_delivered_at)
  WHERE whatsapp_message IS NOT NULL AND whatsapp_delivered_at IS NULL;

-- Add delivery tracking columns to phone_verification_codes.
-- delivered_at: when the code was sent via WhatsApp (NULL = not yet delivered)
-- delivery_message: plaintext message for WhatsApp delivery (NULLed after verification/expiry for security)
ALTER TABLE phone_verification_codes ADD COLUMN delivered_at TEXT;
ALTER TABLE phone_verification_codes ADD COLUMN delivery_message TEXT;

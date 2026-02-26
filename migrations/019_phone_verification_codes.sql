-- Migration 019: Phone verification codes (WhatsApp OTP login)
-- Stores hashed OTP codes for phone-based authentication.
-- Codes are SHA-256 hashed (never stored in plaintext).
-- DB-backed rate limiting for serverless environments (in-memory resets on cold start).

CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  phone TEXT NOT NULL,
  user_id TEXT,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0 AND attempts <= 10),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK(max_attempts >= 1),
  expires_at TEXT NOT NULL,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_phone_codes_phone ON phone_verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_phone_codes_expires ON phone_verification_codes(expires_at);

CREATE TABLE IF NOT EXISTS phone_rate_limits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  phone TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1 CHECK(count >= 0),
  window_start TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until TEXT,
  UNIQUE(phone, action)
);
CREATE INDEX IF NOT EXISTS idx_phone_rate_phone ON phone_rate_limits(phone);

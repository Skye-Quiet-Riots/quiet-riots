-- Migration 020: Auth upgrade — password auth, generalised rate limits, verification token types
--
-- Adds password_hash + password_changed_at + merged_into_user_id to users.
-- Renames phone_rate_limits to rate_limits with a generic identifier column.
-- Adds type column to verification_tokens + index on identifier.

-- 1. Password auth columns on users
ALTER TABLE users ADD COLUMN password_hash TEXT CHECK(length(password_hash) <= 255);
ALTER TABLE users ADD COLUMN password_changed_at TEXT;
ALTER TABLE users ADD COLUMN merged_into_user_id TEXT REFERENCES users(id);

-- 2. Generalise rate_limits table (replace phone_rate_limits)
--    SQLite doesn't support RENAME COLUMN, so create new table and migrate data.
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL,
  locked_until TEXT,
  UNIQUE(identifier, action)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);

-- Migrate existing phone_rate_limits data
INSERT OR IGNORE INTO rate_limits (id, identifier, action, count, window_start, locked_until)
  SELECT id, phone, action, count, window_start, locked_until FROM phone_rate_limits;

DROP TABLE IF EXISTS phone_rate_limits;

-- 3. Add type column to verification_tokens for distinguishing magic_link vs password_reset
ALTER TABLE verification_tokens ADD COLUMN type TEXT NOT NULL DEFAULT 'magic_link'
  CHECK(type IN ('magic_link', 'password_reset', 'email_verify'));

CREATE INDEX IF NOT EXISTS idx_verification_tokens_identifier ON verification_tokens(identifier);

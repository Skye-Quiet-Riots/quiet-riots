-- Phase 4: Privacy, compliance & account safety
-- Notification preferences + login event audit trail

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  security INTEGER NOT NULL DEFAULT 1,
  product_updates INTEGER NOT NULL DEFAULT 1,
  campaign_updates INTEGER NOT NULL DEFAULT 1,
  weekly_digest INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS login_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id),
  event_type TEXT NOT NULL CHECK(event_type IN ('login','logout','failed_login','password_reset','account_locked')),
  ip_address TEXT CHECK(length(ip_address) <= 45),
  user_agent TEXT CHECK(length(user_agent) <= 500),
  provider TEXT CHECK(length(provider) <= 50),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_login_events_type ON login_events(user_id, event_type, created_at);

-- Bot event tracking for WhatsApp analytics
-- Records every action dispatched through the /api/bot endpoint

CREATE TABLE IF NOT EXISTS bot_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  action TEXT NOT NULL CHECK(length(action) <= 50),
  user_id TEXT REFERENCES users(id),
  issue_id TEXT,
  duration_ms INTEGER CHECK(duration_ms >= 0),
  status TEXT NOT NULL DEFAULT 'ok' CHECK(status IN ('ok', 'error')),
  error_message TEXT CHECK(length(error_message) <= 500),
  metadata TEXT CHECK(length(metadata) <= 2000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bot_events_action ON bot_events(action);
CREATE INDEX IF NOT EXISTS idx_bot_events_user ON bot_events(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_events_created ON bot_events(created_at DESC);

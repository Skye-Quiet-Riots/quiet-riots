CREATE TABLE IF NOT EXISTS user_follows (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  auto_followed INTEGER NOT NULL DEFAULT 0 CHECK(auto_followed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, issue_id)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_user ON user_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_issue ON user_follows(issue_id);

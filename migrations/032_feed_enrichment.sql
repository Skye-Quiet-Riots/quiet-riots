-- Feed post enrichment: photos, comments, shares
ALTER TABLE feed ADD COLUMN photo_urls TEXT NOT NULL DEFAULT '[]';
ALTER TABLE feed ADD COLUMN comments_count INTEGER NOT NULL DEFAULT 0 CHECK(comments_count >= 0);
ALTER TABLE feed ADD COLUMN shares INTEGER NOT NULL DEFAULT 0 CHECK(shares >= 0);

-- Feed comments table (mirrors evidence_comments pattern)
CREATE TABLE IF NOT EXISTS feed_comments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  feed_id TEXT NOT NULL REFERENCES feed(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK(length(content) > 0 AND length(content) <= 2000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for feed_comments
CREATE INDEX IF NOT EXISTS idx_feed_comments_feed_id ON feed_comments(feed_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feed_comments_user_id ON feed_comments(user_id);

-- Verify feed has index on issue_id for the JOIN query
CREATE INDEX IF NOT EXISTS idx_feed_issue_id ON feed(issue_id, created_at DESC);

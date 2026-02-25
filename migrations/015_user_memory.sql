-- Persistent per-user memory for WhatsApp bot
-- Stores curated notes about each user across session resets

CREATE TABLE IF NOT EXISTS user_memory (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  memory_key TEXT NOT NULL CHECK(length(memory_key) BETWEEN 1 AND 100),
  memory_value TEXT NOT NULL CHECK(length(memory_value) BETWEEN 1 AND 500),
  category TEXT NOT NULL DEFAULT 'general' CHECK(category IN ('preference','context','goal','emotional','general')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, memory_key)
);

CREATE INDEX IF NOT EXISTS idx_user_memory_updated ON user_memory(user_id, updated_at DESC);

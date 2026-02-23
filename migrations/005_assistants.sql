-- Category Assistants: assistant pairs, user introductions, activity log, claims
-- Plus per-riot assistant copy columns on issues table

CREATE TABLE IF NOT EXISTS category_assistants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category TEXT NOT NULL UNIQUE CHECK(length(category) <= 50),

  -- Agent (AI)
  agent_name TEXT NOT NULL CHECK(length(agent_name) <= 50),
  agent_icon TEXT NOT NULL CHECK(length(agent_icon) <= 10),
  agent_quote TEXT CHECK(length(agent_quote) <= 500),
  agent_bio TEXT CHECK(length(agent_bio) <= 1000),
  agent_gradient_start TEXT CHECK(length(agent_gradient_start) <= 10),
  agent_gradient_end TEXT CHECK(length(agent_gradient_end) <= 10),

  -- Human
  human_name TEXT NOT NULL CHECK(length(human_name) <= 50),
  human_icon TEXT NOT NULL CHECK(length(human_icon) <= 10),
  human_quote TEXT CHECK(length(human_quote) <= 500),
  human_bio TEXT CHECK(length(human_bio) <= 1000),
  human_gradient_start TEXT CHECK(length(human_gradient_start) <= 10),
  human_gradient_end TEXT CHECK(length(human_gradient_end) <= 10),
  human_user_id TEXT REFERENCES users(id),

  -- Shared
  goal TEXT CHECK(length(goal) <= 500),
  focus TEXT CHECK(length(focus) <= 255),
  focus_detail TEXT CHECK(length(focus_detail) <= 1000),
  profile_url TEXT CHECK(length(profile_url) <= 255),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_assistant_introductions (
  user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL CHECK(length(category) <= 50),
  introduced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, category)
);

CREATE TABLE IF NOT EXISTS assistant_activity (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category TEXT NOT NULL CHECK(length(category) <= 50),
  assistant_type TEXT NOT NULL CHECK(assistant_type IN ('agent', 'human')),
  activity_type TEXT NOT NULL CHECK(length(activity_type) <= 50),
  description TEXT NOT NULL CHECK(length(description) <= 500),
  stat_value INTEGER,
  stat_label TEXT CHECK(length(stat_label) <= 50),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assistant_claims (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category TEXT NOT NULL CHECK(length(category) <= 50),
  user_id TEXT NOT NULL REFERENCES users(id),
  message TEXT CHECK(length(message) <= 1000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assistant_activity_category ON assistant_activity(category);
CREATE INDEX IF NOT EXISTS idx_assistant_activity_created ON assistant_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_introductions_user ON user_assistant_introductions(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_claims_category ON assistant_claims(category);

-- Per-riot assistant copy on issues table
ALTER TABLE issues ADD COLUMN agent_helps TEXT;
ALTER TABLE issues ADD COLUMN human_helps TEXT;
ALTER TABLE issues ADD COLUMN agent_focus TEXT;
ALTER TABLE issues ADD COLUMN human_focus TEXT;

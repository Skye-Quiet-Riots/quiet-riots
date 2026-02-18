-- Riot Reels tables
CREATE TABLE IF NOT EXISTS riot_reels (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  youtube_url TEXT NOT NULL CHECK(length(youtube_url) <= 500),
  youtube_video_id TEXT NOT NULL CHECK(length(youtube_video_id) <= 20),
  title TEXT NOT NULL CHECK(length(title) <= 255),
  thumbnail_url TEXT NOT NULL DEFAULT '' CHECK(length(thumbnail_url) <= 500),
  duration_seconds INTEGER,
  caption TEXT NOT NULL DEFAULT '' CHECK(length(caption) <= 500),
  submitted_by TEXT REFERENCES users(id),
  source TEXT NOT NULL CHECK(source IN ('curated','community','ai_suggested')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','featured','rejected')),
  upvotes INTEGER NOT NULL DEFAULT 0 CHECK(upvotes >= 0),
  views INTEGER NOT NULL DEFAULT 0 CHECK(views >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reel_votes (
  reel_id TEXT NOT NULL REFERENCES riot_reels(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  vote INTEGER NOT NULL DEFAULT 1 CHECK(vote >= 0),
  voted_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (reel_id, user_id)
);

CREATE TABLE IF NOT EXISTS reel_shown_log (
  user_id TEXT NOT NULL REFERENCES users(id),
  reel_id TEXT NOT NULL REFERENCES riot_reels(id),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  shown_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reels_issue ON riot_reels(issue_id);
CREATE INDEX IF NOT EXISTS idx_reels_status ON riot_reels(status);
CREATE INDEX IF NOT EXISTS idx_reels_upvotes ON riot_reels(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_reel_shown_user ON reel_shown_log(user_id, shown_at);

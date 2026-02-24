-- Evidence gathering: rich posts linked to issues and optionally organisations
-- Supports text, photo, video, links, and simulated live streams

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  org_id TEXT REFERENCES organisations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL CHECK(length(content) <= 5000),
  media_type TEXT NOT NULL DEFAULT 'text' CHECK(media_type IN ('text','photo','video','link','live_stream')),
  photo_urls TEXT DEFAULT '[]' CHECK(length(photo_urls) <= 2000),
  video_url TEXT CHECK(length(video_url) <= 500),
  external_urls TEXT DEFAULT '[]' CHECK(length(external_urls) <= 2000),
  live INTEGER NOT NULL DEFAULT 0 CHECK(live IN (0, 1)),
  likes INTEGER NOT NULL DEFAULT 0 CHECK(likes >= 0),
  comments_count INTEGER NOT NULL DEFAULT 0 CHECK(comments_count >= 0),
  shares INTEGER NOT NULL DEFAULT 0 CHECK(shares >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidence_comments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  evidence_id TEXT NOT NULL REFERENCES evidence(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL CHECK(length(content) <= 2000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_issue ON evidence(issue_id);
CREATE INDEX IF NOT EXISTS idx_evidence_org ON evidence(org_id);
CREATE INDEX IF NOT EXISTS idx_evidence_user ON evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_live ON evidence(live);
CREATE INDEX IF NOT EXISTS idx_evidence_created ON evidence(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_comments_evidence ON evidence_comments(evidence_id);

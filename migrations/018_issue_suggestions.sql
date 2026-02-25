-- Issue suggestions (waiting room for new Quiet Riots) — handles both issues AND organisations
CREATE TABLE IF NOT EXISTS issue_suggestions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  suggested_by TEXT NOT NULL REFERENCES users(id),
  original_text TEXT NOT NULL CHECK(length(original_text) <= 1000),
  suggested_name TEXT NOT NULL CHECK(length(suggested_name) <= 255),
  suggested_type TEXT NOT NULL DEFAULT 'issue' CHECK(suggested_type IN ('issue','organisation')),
  category TEXT NOT NULL CHECK(category IN (
    'Transport','Telecoms','Banking','Health','Education','Environment',
    'Energy','Water','Insurance','Housing','Shopping','Delivery',
    'Local','Employment','Tech','Other'
  )),
  description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 2000),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN (
    'pending_review','more_info_requested','approved','translations_ready','live','rejected','merged'
  )),
  issue_id TEXT REFERENCES issues(id),
  organisation_id TEXT REFERENCES organisations(id),
  merged_into_issue_id TEXT REFERENCES issues(id),
  merged_into_org_id TEXT REFERENCES organisations(id),
  reviewer_id TEXT REFERENCES users(id),
  rejection_reason TEXT CHECK(rejection_reason IN (
    'close_to_existing','about_people','illegal_subject','other'
  )),
  rejection_detail TEXT CHECK(length(rejection_detail) <= 1000),
  close_match_ids TEXT CHECK(length(close_match_ids) <= 2000),
  public_recognition INTEGER NOT NULL DEFAULT 1 CHECK(public_recognition IN (0,1)),
  first_rioter_notified INTEGER NOT NULL DEFAULT 0 CHECK(first_rioter_notified IN (0,1)),
  reviewer_notes TEXT CHECK(length(reviewer_notes) <= 2000),
  reviewed_at TEXT,
  approved_at TEXT,
  live_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON issue_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_by ON issue_suggestions(suggested_by);
CREATE INDEX IF NOT EXISTS idx_suggestions_created ON issue_suggestions(created_at DESC);

-- Messages / inbox
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  sender_name TEXT CHECK(length(sender_name) <= 255),
  type TEXT NOT NULL CHECK(type IN (
    'suggestion_received','suggestion_approved','suggestion_rejected',
    'suggestion_merged','suggestion_more_info','suggestion_live',
    'suggestion_progress','role_assigned','general'
  )),
  subject TEXT NOT NULL CHECK(length(subject) <= 255),
  body TEXT NOT NULL CHECK(length(body) <= 5000),
  entity_type TEXT CHECK(entity_type IN ('issue_suggestion','issue','organisation','user')),
  entity_id TEXT,
  read INTEGER NOT NULL DEFAULT 0 CHECK(read IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_entity ON messages(entity_type, entity_id);

-- Add status + first_rioter to issues
ALTER TABLE issues ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK(status IN ('pending_review','active','rejected'));
ALTER TABLE issues ADD COLUMN first_rioter_id TEXT REFERENCES users(id);
ALTER TABLE issues ADD COLUMN approved_at TEXT;

-- Add status + first_rioter to organisations
ALTER TABLE organisations ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK(status IN ('pending_review','active','rejected'));
ALTER TABLE organisations ADD COLUMN first_rioter_id TEXT REFERENCES users(id);
ALTER TABLE organisations ADD COLUMN approved_at TEXT;

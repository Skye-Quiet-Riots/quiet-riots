-- User interests — tracks which issue categories each user is interested in
CREATE TABLE IF NOT EXISTS user_interests (
  user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL CHECK(category IN (
    'Transport','Telecoms','Banking','Health','Education','Environment',
    'Energy','Water','Insurance','Housing','Shopping','Delivery','Local','Employment','Tech','Other'
  )),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests(user_id);

-- Track whether user has completed onboarding
ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0;

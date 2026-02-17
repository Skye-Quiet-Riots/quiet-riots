-- Migration: Convert all INTEGER PRIMARY KEY AUTOINCREMENT to TEXT UUID primary keys.
-- All foreign key references also change from INTEGER to TEXT.
-- Existing integer IDs are CAST to TEXT strings.
-- Process parents first, then children (respecting foreign key dependencies).

-- ─── Step 1: Parent tables (no FK dependencies) ─────────────────────

-- issues
CREATE TABLE IF NOT EXISTS issues_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('Transport','Telecoms','Banking','Health','Education','Environment')),
  description TEXT NOT NULL DEFAULT '',
  rioter_count INTEGER NOT NULL DEFAULT 0,
  country_count INTEGER NOT NULL DEFAULT 0,
  trending_delta INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO issues_new (id, name, category, description, rioter_count, country_count, trending_delta, created_at)
  SELECT CAST(id AS TEXT), name, category, description, rioter_count, country_count, trending_delta, created_at FROM issues;
DROP TABLE issues;
ALTER TABLE issues_new RENAME TO issues;

-- organisations
CREATE TABLE IF NOT EXISTS organisations_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  logo_emoji TEXT NOT NULL DEFAULT '🏢',
  description TEXT NOT NULL DEFAULT ''
);
INSERT INTO organisations_new (id, name, category, logo_emoji, description)
  SELECT CAST(id AS TEXT), name, category, logo_emoji, description FROM organisations;
DROP TABLE organisations;
ALTER TABLE organisations_new RENAME TO organisations;

-- users
CREATE TABLE IF NOT EXISTS users_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT UNIQUE,
  time_available TEXT NOT NULL DEFAULT '10min',
  skills TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO users_new (id, name, email, phone, time_available, skills, created_at)
  SELECT CAST(id AS TEXT), name, email, phone, time_available, skills, created_at FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- ─── Step 2: Child tables (depend on parents) ───────────────────────

-- issue_organisation
CREATE TABLE IF NOT EXISTS issue_organisation_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  organisation_id TEXT NOT NULL REFERENCES organisations(id),
  rioter_count INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  UNIQUE(issue_id, organisation_id)
);
INSERT INTO issue_organisation_new (id, issue_id, organisation_id, rioter_count, rank)
  SELECT CAST(id AS TEXT), CAST(issue_id AS TEXT), CAST(organisation_id AS TEXT), rioter_count, rank FROM issue_organisation;
DROP TABLE issue_organisation;
ALTER TABLE issue_organisation_new RENAME TO issue_organisation;

-- synonyms
CREATE TABLE IF NOT EXISTS synonyms_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  term TEXT NOT NULL
);
INSERT INTO synonyms_new (id, issue_id, term)
  SELECT CAST(id AS TEXT), CAST(issue_id AS TEXT), term FROM synonyms;
DROP TABLE synonyms;
ALTER TABLE synonyms_new RENAME TO synonyms;

-- user_issues
CREATE TABLE IF NOT EXISTS user_issues_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, issue_id)
);
INSERT INTO user_issues_new (id, user_id, issue_id, joined_at)
  SELECT CAST(id AS TEXT), CAST(user_id AS TEXT), CAST(issue_id AS TEXT), joined_at FROM user_issues;
DROP TABLE user_issues;
ALTER TABLE user_issues_new RENAME TO user_issues;

-- actions
CREATE TABLE IF NOT EXISTS actions_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK(type IN ('idea','action','together')),
  time_required TEXT NOT NULL DEFAULT '10min',
  skills_needed TEXT NOT NULL DEFAULT '',
  external_url TEXT,
  provider_name TEXT
);
INSERT INTO actions_new (id, issue_id, title, description, type, time_required, skills_needed, external_url, provider_name)
  SELECT CAST(id AS TEXT), CAST(issue_id AS TEXT), title, description, type, time_required, skills_needed, external_url, provider_name FROM actions;
DROP TABLE actions;
ALTER TABLE actions_new RENAME TO actions;

-- feed
CREATE TABLE IF NOT EXISTS feed_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO feed_new (id, issue_id, user_id, content, likes, created_at)
  SELECT CAST(id AS TEXT), CAST(issue_id AS TEXT), CAST(user_id AS TEXT), content, likes, created_at FROM feed;
DROP TABLE feed;
ALTER TABLE feed_new RENAME TO feed;

-- community_health
CREATE TABLE IF NOT EXISTS community_health_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  issue_id TEXT NOT NULL REFERENCES issues(id) UNIQUE,
  needs_met INTEGER NOT NULL DEFAULT 50,
  membership INTEGER NOT NULL DEFAULT 50,
  influence INTEGER NOT NULL DEFAULT 50,
  connection INTEGER NOT NULL DEFAULT 50
);
INSERT INTO community_health_new (id, issue_id, needs_met, membership, influence, connection)
  SELECT CAST(id AS TEXT), CAST(issue_id AS TEXT), needs_met, membership, influence, connection FROM community_health;
DROP TABLE community_health;
ALTER TABLE community_health_new RENAME TO community_health;

-- expert_profiles
CREATE TABLE IF NOT EXISTS expert_profiles_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  speciality TEXT NOT NULL DEFAULT '',
  achievement TEXT NOT NULL DEFAULT '',
  avatar_emoji TEXT NOT NULL DEFAULT '👤'
);
INSERT INTO expert_profiles_new (id, issue_id, name, role, speciality, achievement, avatar_emoji)
  SELECT CAST(id AS TEXT), CAST(issue_id AS TEXT), name, role, speciality, achievement, avatar_emoji FROM expert_profiles;
DROP TABLE expert_profiles;
ALTER TABLE expert_profiles_new RENAME TO expert_profiles;

-- country_breakdown
CREATE TABLE IF NOT EXISTS country_breakdown_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  rioter_count INTEGER NOT NULL DEFAULT 0
);
INSERT INTO country_breakdown_new (id, issue_id, country_code, country_name, rioter_count)
  SELECT CAST(id AS TEXT), CAST(issue_id AS TEXT), country_code, country_name, rioter_count FROM country_breakdown;
DROP TABLE country_breakdown;
ALTER TABLE country_breakdown_new RENAME TO country_breakdown;

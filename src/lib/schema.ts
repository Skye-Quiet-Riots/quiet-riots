import { getDb } from './db';

export async function createTables() {
  const db = getDb();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL CHECK(length(name) <= 255),
      category TEXT NOT NULL CHECK(category IN (
        'Transport','Telecoms','Banking','Health','Education','Environment',
        'Energy','Water','Insurance','Housing','Shopping','Delivery','Local','Employment','Tech','Other'
      )),
      description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 2000),
      rioter_count INTEGER NOT NULL DEFAULT 0 CHECK(rioter_count >= 0),
      country_count INTEGER NOT NULL DEFAULT 0 CHECK(country_count >= 0),
      trending_delta INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS organisations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL CHECK(length(name) <= 255),
      category TEXT NOT NULL,
      logo_emoji TEXT NOT NULL DEFAULT '🏢',
      description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 2000),
      sector TEXT,
      country TEXT NOT NULL DEFAULT 'UK',
      regulator TEXT,
      ombudsman TEXT,
      website TEXT
    );

    CREATE TABLE IF NOT EXISTS issue_organisation (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      issue_id TEXT NOT NULL REFERENCES issues(id),
      organisation_id TEXT NOT NULL REFERENCES organisations(id),
      rioter_count INTEGER NOT NULL DEFAULT 0 CHECK(rioter_count >= 0),
      rank INTEGER NOT NULL DEFAULT 0 CHECK(rank >= 0),
      UNIQUE(issue_id, organisation_id)
    );

    CREATE TABLE IF NOT EXISTS synonyms (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      issue_id TEXT NOT NULL REFERENCES issues(id),
      term TEXT NOT NULL CHECK(length(term) <= 255)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL CHECK(length(name) <= 255),
      email TEXT NOT NULL UNIQUE CHECK(length(email) <= 255),
      phone TEXT UNIQUE,
      time_available TEXT NOT NULL DEFAULT '10min' CHECK(time_available IN ('1min','10min','1hr+')),
      skills TEXT NOT NULL DEFAULT '' CHECK(length(skills) <= 500),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_issues (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      issue_id TEXT NOT NULL REFERENCES issues(id),
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, issue_id)
    );

    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      issue_id TEXT NOT NULL REFERENCES issues(id),
      title TEXT NOT NULL CHECK(length(title) <= 255),
      description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 2000),
      type TEXT NOT NULL CHECK(type IN ('idea','action','together')),
      time_required TEXT NOT NULL DEFAULT '10min' CHECK(time_required IN ('1min','10min','1hr+')),
      skills_needed TEXT NOT NULL DEFAULT '' CHECK(length(skills_needed) <= 500),
      external_url TEXT,
      provider_name TEXT CHECK(length(provider_name) <= 255)
    );

    CREATE TABLE IF NOT EXISTS feed (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      issue_id TEXT NOT NULL REFERENCES issues(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL CHECK(length(content) <= 5000),
      likes INTEGER NOT NULL DEFAULT 0 CHECK(likes >= 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS community_health (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      issue_id TEXT NOT NULL REFERENCES issues(id) UNIQUE,
      needs_met INTEGER NOT NULL DEFAULT 50 CHECK(needs_met >= 0 AND needs_met <= 100),
      membership INTEGER NOT NULL DEFAULT 50 CHECK(membership >= 0 AND membership <= 100),
      influence INTEGER NOT NULL DEFAULT 50 CHECK(influence >= 0 AND influence <= 100),
      connection INTEGER NOT NULL DEFAULT 50 CHECK(connection >= 0 AND connection <= 100)
    );

    CREATE TABLE IF NOT EXISTS expert_profiles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      issue_id TEXT NOT NULL REFERENCES issues(id),
      name TEXT NOT NULL CHECK(length(name) <= 255),
      role TEXT NOT NULL CHECK(length(role) <= 255),
      speciality TEXT NOT NULL DEFAULT '' CHECK(length(speciality) <= 500),
      achievement TEXT NOT NULL DEFAULT '' CHECK(length(achievement) <= 500),
      avatar_emoji TEXT NOT NULL DEFAULT '👤'
    );

    CREATE TABLE IF NOT EXISTS country_breakdown (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      issue_id TEXT NOT NULL REFERENCES issues(id),
      country_code TEXT NOT NULL CHECK(length(country_code) <= 3),
      country_name TEXT NOT NULL CHECK(length(country_name) <= 100),
      rioter_count INTEGER NOT NULL DEFAULT 0 CHECK(rioter_count >= 0)
    );

    CREATE TABLE IF NOT EXISTS seasonal_patterns (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      issue_id TEXT NOT NULL REFERENCES issues(id) UNIQUE,
      peak_months TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS issue_relations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      child_id TEXT NOT NULL REFERENCES issues(id),
      parent_id TEXT NOT NULL REFERENCES issues(id),
      relation_type TEXT NOT NULL CHECK(relation_type IN ('specific_of','related_to','subset_of')),
      UNIQUE(child_id, parent_id)
    );

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
  `);
}

export async function dropTables() {
  const db = getDb();
  await db.executeMultiple(`
    DROP TABLE IF EXISTS reel_shown_log;
    DROP TABLE IF EXISTS reel_votes;
    DROP TABLE IF EXISTS riot_reels;
    DROP TABLE IF EXISTS issue_relations;
    DROP TABLE IF EXISTS seasonal_patterns;
    DROP TABLE IF EXISTS country_breakdown;
    DROP TABLE IF EXISTS expert_profiles;
    DROP TABLE IF EXISTS community_health;
    DROP TABLE IF EXISTS feed;
    DROP TABLE IF EXISTS actions;
    DROP TABLE IF EXISTS user_issues;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS synonyms;
    DROP TABLE IF EXISTS issue_organisation;
    DROP TABLE IF EXISTS organisations;
    DROP TABLE IF EXISTS issues;
  `);
}

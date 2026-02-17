import { getDb } from './db';

export async function createTables() {
  const db = getDb();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN (
        'Transport','Telecoms','Banking','Health','Education','Environment',
        'Energy','Water','Insurance','Housing','Shopping','Delivery','Local','Employment','Tech','Other'
      )),
      description TEXT NOT NULL DEFAULT '',
      rioter_count INTEGER NOT NULL DEFAULT 0,
      country_count INTEGER NOT NULL DEFAULT 0,
      trending_delta INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS organisations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      logo_emoji TEXT NOT NULL DEFAULT '🏢',
      description TEXT NOT NULL DEFAULT '',
      sector TEXT,
      country TEXT NOT NULL DEFAULT 'UK',
      regulator TEXT,
      ombudsman TEXT,
      website TEXT
    );

    CREATE TABLE IF NOT EXISTS issue_organisation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id),
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      rioter_count INTEGER NOT NULL DEFAULT 0,
      rank INTEGER NOT NULL DEFAULT 0,
      UNIQUE(issue_id, organisation_id)
    );

    CREATE TABLE IF NOT EXISTS synonyms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id),
      term TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT UNIQUE,
      time_available TEXT NOT NULL DEFAULT '10min',
      skills TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      issue_id INTEGER NOT NULL REFERENCES issues(id),
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, issue_id)
    );

    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL CHECK(type IN ('idea','action','together')),
      time_required TEXT NOT NULL DEFAULT '10min',
      skills_needed TEXT NOT NULL DEFAULT '',
      external_url TEXT,
      provider_name TEXT
    );

    CREATE TABLE IF NOT EXISTS feed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      likes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS community_health (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) UNIQUE,
      needs_met INTEGER NOT NULL DEFAULT 50,
      membership INTEGER NOT NULL DEFAULT 50,
      influence INTEGER NOT NULL DEFAULT 50,
      connection INTEGER NOT NULL DEFAULT 50
    );

    CREATE TABLE IF NOT EXISTS expert_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id),
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      speciality TEXT NOT NULL DEFAULT '',
      achievement TEXT NOT NULL DEFAULT '',
      avatar_emoji TEXT NOT NULL DEFAULT '👤'
    );

    CREATE TABLE IF NOT EXISTS country_breakdown (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id),
      country_code TEXT NOT NULL,
      country_name TEXT NOT NULL,
      rioter_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS seasonal_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) UNIQUE,
      peak_months TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS issue_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES issues(id),
      parent_id INTEGER NOT NULL REFERENCES issues(id),
      relation_type TEXT NOT NULL CHECK(relation_type IN ('specific_of','related_to','subset_of')),
      UNIQUE(child_id, parent_id)
    );
  `);
}

export async function dropTables() {
  const db = getDb();
  await db.executeMultiple(`
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

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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      agent_helps TEXT,
      human_helps TEXT,
      agent_focus TEXT,
      human_focus TEXT
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

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) UNIQUE,
      balance_pence INTEGER NOT NULL DEFAULT 0 CHECK(balance_pence >= 0),
      total_loaded_pence INTEGER NOT NULL DEFAULT 0 CHECK(total_loaded_pence >= 0),
      total_spent_pence INTEGER NOT NULL DEFAULT 0 CHECK(total_spent_pence >= 0),
      currency TEXT NOT NULL DEFAULT 'GBP' CHECK(length(currency) <= 3),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      wallet_id TEXT NOT NULL REFERENCES wallets(id),
      type TEXT NOT NULL CHECK(type IN ('topup','contribute','refund')),
      amount_pence INTEGER NOT NULL CHECK(amount_pence > 0),
      campaign_id TEXT,
      issue_id TEXT,
      stripe_payment_id TEXT,
      description TEXT DEFAULT '' CHECK(length(description) <= 500),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      issue_id TEXT NOT NULL REFERENCES issues(id),
      org_id TEXT REFERENCES organisations(id),
      title TEXT NOT NULL CHECK(length(title) <= 255),
      description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 2000),
      target_pence INTEGER NOT NULL CHECK(target_pence > 0),
      raised_pence INTEGER NOT NULL DEFAULT 0 CHECK(raised_pence >= 0),
      contributor_count INTEGER NOT NULL DEFAULT 0 CHECK(contributor_count >= 0),
      recipient TEXT CHECK(length(recipient) <= 255),
      recipient_url TEXT CHECK(length(recipient_url) <= 500),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','funded','disbursed','cancelled')),
      platform_fee_pct INTEGER NOT NULL DEFAULT 15 CHECK(platform_fee_pct >= 0 AND platform_fee_pct <= 100),
      funded_at TEXT,
      disbursed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reels_issue ON riot_reels(issue_id);
    CREATE INDEX IF NOT EXISTS idx_reels_status ON riot_reels(status);
    CREATE INDEX IF NOT EXISTS idx_reels_upvotes ON riot_reels(upvotes DESC);
    CREATE INDEX IF NOT EXISTS idx_reel_shown_user ON reel_shown_log(user_id, shown_at);
    CREATE TABLE IF NOT EXISTS category_assistants (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      category TEXT NOT NULL UNIQUE CHECK(length(category) <= 50),
      agent_name TEXT NOT NULL CHECK(length(agent_name) <= 50),
      agent_icon TEXT NOT NULL CHECK(length(agent_icon) <= 10),
      agent_quote TEXT CHECK(length(agent_quote) <= 500),
      agent_bio TEXT CHECK(length(agent_bio) <= 1000),
      agent_gradient_start TEXT CHECK(length(agent_gradient_start) <= 10),
      agent_gradient_end TEXT CHECK(length(agent_gradient_end) <= 10),
      human_name TEXT NOT NULL CHECK(length(human_name) <= 50),
      human_icon TEXT NOT NULL CHECK(length(human_icon) <= 10),
      human_quote TEXT CHECK(length(human_quote) <= 500),
      human_bio TEXT CHECK(length(human_bio) <= 1000),
      human_gradient_start TEXT CHECK(length(human_gradient_start) <= 10),
      human_gradient_end TEXT CHECK(length(human_gradient_end) <= 10),
      human_user_id TEXT REFERENCES users(id),
      goal TEXT CHECK(length(goal) <= 500),
      focus TEXT CHECK(length(focus) <= 255),
      focus_detail TEXT CHECK(length(focus_detail) <= 1000),
      profile_url TEXT CHECK(length(profile_url) <= 255),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_assistant_introductions (
      user_id TEXT NOT NULL REFERENCES users(id),
      category TEXT NOT NULL CHECK(length(category) <= 50),
      introduced_at TEXT NOT NULL DEFAULT (datetime('now')),
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assistant_claims (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      category TEXT NOT NULL CHECK(length(category) <= 50),
      user_id TEXT NOT NULL REFERENCES users(id),
      message TEXT CHECK(length(message) <= 1000),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bot_events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      action TEXT NOT NULL CHECK(length(action) <= 50),
      user_id TEXT REFERENCES users(id),
      issue_id TEXT,
      duration_ms INTEGER CHECK(duration_ms >= 0),
      status TEXT NOT NULL DEFAULT 'ok' CHECK(status IN ('ok', 'error')),
      error_message TEXT CHECK(length(error_message) <= 500),
      metadata TEXT CHECK(length(metadata) <= 2000),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bot_events_action ON bot_events(action);
    CREATE INDEX IF NOT EXISTS idx_bot_events_user ON bot_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_bot_events_created ON bot_events(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_wtx_wallet ON wallet_transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_wtx_campaign ON wallet_transactions(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_campaigns_issue ON campaigns(issue_id);
    CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_assistant_activity_category ON assistant_activity(category);
    CREATE INDEX IF NOT EXISTS idx_assistant_activity_created ON assistant_activity(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_introductions_user ON user_assistant_introductions(user_id);
    CREATE INDEX IF NOT EXISTS idx_assistant_claims_category ON assistant_claims(category);

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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evidence_comments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      evidence_id TEXT NOT NULL REFERENCES evidence(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL CHECK(length(content) <= 2000),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_issue ON evidence(issue_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_org ON evidence(org_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_user ON evidence(user_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_live ON evidence(live);
    CREATE INDEX IF NOT EXISTS idx_evidence_created ON evidence(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_evidence_comments_evidence ON evidence_comments(evidence_id);
  `);
}

export async function dropTables() {
  const db = getDb();
  await db.executeMultiple(`
    DROP TABLE IF EXISTS evidence_comments;
    DROP TABLE IF EXISTS evidence;
    DROP TABLE IF EXISTS bot_events;
    DROP TABLE IF EXISTS assistant_claims;
    DROP TABLE IF EXISTS assistant_activity;
    DROP TABLE IF EXISTS user_assistant_introductions;
    DROP TABLE IF EXISTS category_assistants;
    DROP TABLE IF EXISTS wallet_transactions;
    DROP TABLE IF EXISTS wallets;
    DROP TABLE IF EXISTS campaigns;
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

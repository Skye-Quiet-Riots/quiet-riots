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
      human_focus TEXT,
      country_scope TEXT DEFAULT 'global' CHECK(country_scope IN ('global','country')),
      primary_country TEXT CHECK(length(primary_country) <= 3),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('pending_review','active','rejected')),
      first_rioter_id TEXT,
      approved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);

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
      website TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('pending_review','active','rejected')),
      first_rioter_id TEXT,
      approved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_orgs_status ON organisations(status);

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
    CREATE INDEX IF NOT EXISTS idx_synonyms_issue ON synonyms(issue_id);
    CREATE INDEX IF NOT EXISTS idx_synonyms_term ON synonyms(term);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL CHECK(length(name) <= 255),
      email TEXT NOT NULL UNIQUE CHECK(length(email) <= 255),
      phone TEXT UNIQUE,
      time_available TEXT NOT NULL DEFAULT '10min' CHECK(time_available IN ('1min','10min','1hr+')),
      skills TEXT NOT NULL DEFAULT '' CHECK(length(skills) <= 500),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      first_name TEXT CHECK(length(first_name) <= 100),
      last_name TEXT CHECK(length(last_name) <= 100),
      display_name TEXT CHECK(length(display_name) <= 100),
      bio TEXT CHECK(length(bio) <= 300),
      avatar_url TEXT CHECK(length(avatar_url) <= 500),
      date_of_birth TEXT,
      country_code TEXT CHECK(length(country_code) <= 3),
      language_code TEXT DEFAULT 'en' CHECK(length(language_code) <= 10),
      email_verified INTEGER NOT NULL DEFAULT 0,
      phone_verified INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','deactivated','deleted')),
      deactivated_at TEXT,
      session_version INTEGER NOT NULL DEFAULT 1,
      onboarding_completed INTEGER NOT NULL DEFAULT 0
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
      completed_at TEXT,
      currency_code TEXT DEFAULT 'GBP' CHECK(length(currency_code) <= 3),
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
      currency_code TEXT DEFAULT 'GBP' CHECK(length(currency_code) <= 3),
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

    CREATE TABLE IF NOT EXISTS languages (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL CHECK(length(name) <= 100),
      native_name TEXT NOT NULL CHECK(length(native_name) <= 100),
      direction TEXT NOT NULL DEFAULT 'ltr' CHECK(direction IN ('ltr', 'rtl'))
    );

    CREATE TABLE IF NOT EXISTS countries (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL CHECK(length(name) <= 100),
      default_language TEXT REFERENCES languages(code),
      currency_code TEXT CHECK(length(currency_code) <= 3),
      phone_prefix TEXT CHECK(length(phone_prefix) <= 10)
    );

    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      entity_type TEXT NOT NULL CHECK(length(entity_type) <= 50),
      entity_id TEXT NOT NULL,
      field TEXT NOT NULL CHECK(length(field) <= 50),
      language_code TEXT NOT NULL REFERENCES languages(code),
      value TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'machine', 'reviewed')),
      UNIQUE(entity_type, entity_id, field, language_code)
    );

    CREATE INDEX IF NOT EXISTS idx_translations_lookup ON translations(entity_type, entity_id, language_code);
    CREATE INDEX IF NOT EXISTS idx_translations_lang ON translations(language_code, entity_type);

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      provider TEXT NOT NULL CHECK(length(provider) <= 50),
      provider_account_id TEXT NOT NULL CHECK(length(provider_account_id) <= 255),
      type TEXT NOT NULL CHECK(type IN ('oauth', 'oidc', 'email', 'credentials')),
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER,
      token_type TEXT CHECK(length(token_type) <= 50),
      scope TEXT CHECK(length(scope) <= 500),
      id_token TEXT,
      UNIQUE(provider, provider_account_id)
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider, provider_account_id);

    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL CHECK(length(identifier) <= 255),
      token TEXT NOT NULL UNIQUE,
      expires TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS legal_documents (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      country_code TEXT NOT NULL CHECK(length(country_code) <= 3),
      document_type TEXT NOT NULL CHECK(document_type IN ('terms', 'privacy', 'cookie')),
      version TEXT NOT NULL CHECK(length(version) <= 20),
      content_url TEXT NOT NULL CHECK(length(content_url) <= 500),
      effective_date TEXT NOT NULL,
      UNIQUE(country_code, document_type, version)
    );

    CREATE TABLE IF NOT EXISTS user_consents (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      document_type TEXT NOT NULL CHECK(document_type IN ('terms', 'privacy', 'cookie', 'analytics')),
      version TEXT NOT NULL CHECK(length(version) <= 20),
      country_code TEXT NOT NULL CHECK(length(country_code) <= 3),
      accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT CHECK(length(ip_address) <= 45),
      user_agent TEXT CHECK(length(user_agent) <= 500)
    );

    CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id, document_type);

    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      security INTEGER NOT NULL DEFAULT 1,
      product_updates INTEGER NOT NULL DEFAULT 1,
      campaign_updates INTEGER NOT NULL DEFAULT 1,
      weekly_digest INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS login_events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT REFERENCES users(id),
      event_type TEXT NOT NULL CHECK(event_type IN ('login','logout','failed_login','password_reset','account_locked')),
      ip_address TEXT CHECK(length(ip_address) <= 45),
      user_agent TEXT CHECK(length(user_agent) <= 500),
      provider TEXT CHECK(length(provider) <= 50),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_login_events_type ON login_events(user_id, event_type, created_at);

    CREATE TABLE IF NOT EXISTS user_blocks (
      blocker_id TEXT NOT NULL REFERENCES users(id),
      blocked_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (blocker_id, blocked_id),
      CHECK(blocker_id != blocked_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      reporter_id TEXT NOT NULL REFERENCES users(id),
      entity_type TEXT NOT NULL CHECK(entity_type IN ('feed','evidence','reel','user')),
      entity_id TEXT NOT NULL,
      reason TEXT NOT NULL CHECK(reason IN ('spam','harassment','misinformation','inappropriate','other')),
      description TEXT CHECK(length(description) <= 1000),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed','actioned','dismissed')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_reports_entity ON reports(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

    CREATE TABLE IF NOT EXISTS exchange_rates (
      from_currency TEXT NOT NULL CHECK(length(from_currency) <= 3),
      to_currency TEXT NOT NULL CHECK(length(to_currency) <= 3),
      rate REAL NOT NULL CHECK(rate > 0),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (from_currency, to_currency)
    );

    CREATE INDEX IF NOT EXISTS idx_issues_country ON issues(country_scope, primary_country);

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

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL CHECK(role IN ('setup_guide','administrator')),
      assigned_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, role)
    );
    CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

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
  `);
}

export async function dropTables() {
  const db = getDb();
  await db.executeMultiple(`
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS issue_suggestions;
    DROP TABLE IF EXISTS user_roles;
    DROP TABLE IF EXISTS user_memory;
    DROP TABLE IF EXISTS user_interests;
    DROP TABLE IF EXISTS reports;
    DROP TABLE IF EXISTS user_blocks;
    DROP TABLE IF EXISTS login_events;
    DROP TABLE IF EXISTS notification_preferences;
    DROP TABLE IF EXISTS exchange_rates;
    DROP TABLE IF EXISTS user_consents;
    DROP TABLE IF EXISTS legal_documents;
    DROP TABLE IF EXISTS verification_tokens;
    DROP TABLE IF EXISTS accounts;
    DROP TABLE IF EXISTS translations;
    DROP TABLE IF EXISTS countries;
    DROP TABLE IF EXISTS languages;
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

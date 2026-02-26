-- Migration 022: Global Share Scheme
-- Adds share applications, identity verification, messaging, audit logging,
-- status history, certificate counter, and extends roles + message types.
-- Treasury wallet created as a special system wallet.

-- ── New tables ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS share_applications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) UNIQUE,
  status TEXT NOT NULL DEFAULT 'not_eligible' CHECK(status IN (
    'not_eligible','available','under_review','approved',
    'identity_submitted','forwarded_senior',
    'issued','declined','rejected','withdrawn'
  )),
  -- Eligibility snapshots
  riots_joined_at_offer INTEGER CHECK(riots_joined_at_offer >= 0),
  actions_at_offer INTEGER CHECK(actions_at_offer >= 0),
  eligible_at TEXT,
  -- Payment
  payment_transaction_id TEXT,
  payment_amount_pence INTEGER CHECK(payment_amount_pence >= 0),
  -- Share Guide review
  share_guide_id TEXT REFERENCES users(id),
  share_guide_decision_at TEXT,
  share_guide_notes TEXT CHECK(length(share_guide_notes) <= 2000),
  -- Compliance Guide review
  compliance_guide_id TEXT REFERENCES users(id),
  compliance_decision_at TEXT,
  compliance_notes TEXT CHECK(length(compliance_notes) <= 2000),
  -- Senior Compliance review
  senior_compliance_id TEXT REFERENCES users(id),
  senior_decision_at TEXT,
  senior_notes TEXT CHECK(length(senior_notes) <= 2000),
  -- Rejection / reapply
  rejection_reason TEXT CHECK(length(rejection_reason) <= 1000),
  reapply_count INTEGER NOT NULL DEFAULT 0 CHECK(reapply_count >= 0),
  -- Certificate
  certificate_number TEXT UNIQUE CHECK(length(certificate_number) <= 50),
  issued_at TEXT,
  -- Tracking
  last_notification_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_share_apps_status ON share_applications(status);
CREATE INDEX IF NOT EXISTS idx_share_apps_guide ON share_applications(share_guide_id);

CREATE TABLE IF NOT EXISTS share_identities (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id TEXT NOT NULL REFERENCES share_applications(id) UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) UNIQUE,
  -- Personal details (encrypted at application level)
  legal_first_name TEXT NOT NULL CHECK(length(legal_first_name) <= 500),
  legal_middle_name TEXT CHECK(length(legal_middle_name) <= 500),
  legal_last_name TEXT NOT NULL CHECK(length(legal_last_name) <= 500),
  date_of_birth TEXT NOT NULL CHECK(length(date_of_birth) <= 500),
  gender TEXT CHECK(gender IN ('male','female','non_binary','prefer_not_to_say','other')),
  -- Address (encrypted at application level)
  address_line_1 TEXT NOT NULL CHECK(length(address_line_1) <= 500),
  address_line_2 TEXT CHECK(length(address_line_2) <= 500),
  city TEXT NOT NULL CHECK(length(city) <= 500),
  state_province TEXT CHECK(length(state_province) <= 500),
  postal_code TEXT CHECK(length(postal_code) <= 500),
  country_code TEXT NOT NULL CHECK(length(country_code) <= 3),
  -- Contact
  phone TEXT NOT NULL CHECK(length(phone) <= 500),
  -- ID verification
  id_document_type TEXT CHECK(id_document_type IN ('passport','national_id','driving_licence','other')),
  id_document_country TEXT CHECK(length(id_document_country) <= 3),
  digital_verification_available INTEGER NOT NULL DEFAULT 1 CHECK(digital_verification_available IN (0,1)),
  -- Timestamps
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_share_identities_app ON share_identities(application_id);

CREATE TABLE IF NOT EXISTS share_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id TEXT NOT NULL REFERENCES share_applications(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  sender_role TEXT NOT NULL CHECK(sender_role IN ('applicant','share_guide','compliance_guide','senior_compliance')),
  content TEXT NOT NULL CHECK(length(content) <= 5000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_share_msgs_app ON share_messages(application_id, created_at);
CREATE INDEX IF NOT EXISTS idx_share_msgs_sender ON share_messages(sender_id);

CREATE TABLE IF NOT EXISTS share_audit_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(length(action) <= 100),
  detail TEXT CHECK(length(detail) <= 2000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_share_audit_app ON share_audit_log(application_id, created_at);

CREATE TABLE IF NOT EXISTS share_status_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id TEXT NOT NULL REFERENCES share_applications(id),
  from_status TEXT NOT NULL CHECK(length(from_status) <= 30),
  to_status TEXT NOT NULL CHECK(length(to_status) <= 30),
  actor_id TEXT NOT NULL,
  notes TEXT CHECK(length(notes) <= 2000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_share_history_app ON share_status_history(application_id, created_at);

CREATE TABLE IF NOT EXISTS share_certificate_counter (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  next_number INTEGER NOT NULL DEFAULT 1 CHECK(next_number >= 1)
);
INSERT OR IGNORE INTO share_certificate_counter (id, next_number) VALUES (1, 1);

-- ── Extend user_roles CHECK to include new roles ──────────────────────
-- SQLite cannot ALTER CHECK constraints, so we recreate the table

CREATE TABLE user_roles_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('setup_guide','administrator','share_guide','compliance_guide','treasury_guide')),
  assigned_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role)
);
INSERT INTO user_roles_new (id, user_id, role, assigned_by, created_at)
  SELECT id, user_id, role, assigned_by, created_at FROM user_roles;
DROP TABLE user_roles;
ALTER TABLE user_roles_new RENAME TO user_roles;
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- ── Extend messages type + entity_type CHECK ──────────────────────────

CREATE TABLE messages_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  sender_name TEXT CHECK(length(sender_name) <= 255),
  type TEXT NOT NULL CHECK(type IN (
    'suggestion_received','suggestion_approved','suggestion_rejected',
    'suggestion_merged','suggestion_more_info','suggestion_live',
    'suggestion_progress','role_assigned','general',
    'share_available','share_approved','share_identity_needed',
    'share_issued','share_rejected','share_question',
    'share_payment_received','share_refunded'
  )),
  subject TEXT NOT NULL CHECK(length(subject) <= 255),
  body TEXT NOT NULL CHECK(length(body) <= 5000),
  entity_type TEXT CHECK(entity_type IN ('issue_suggestion','issue','organisation','user','share_application')),
  entity_id TEXT,
  read INTEGER NOT NULL DEFAULT 0 CHECK(read IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO messages_new (id, recipient_id, sender_name, type, subject, body, entity_type, entity_id, read, created_at)
  SELECT id, recipient_id, sender_name, type, subject, body, entity_type, entity_id, read, created_at FROM messages;
DROP TABLE messages;
ALTER TABLE messages_new RENAME TO messages;
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_entity ON messages(entity_type, entity_id);

-- ── Extend wallet_transactions type to include share_consideration ────

CREATE TABLE wallet_transactions_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL CHECK(type IN ('topup','contribute','refund','share_consideration')),
  amount_pence INTEGER NOT NULL CHECK(amount_pence > 0),
  campaign_id TEXT,
  issue_id TEXT,
  stripe_payment_id TEXT,
  description TEXT DEFAULT '' CHECK(length(description) <= 500),
  completed_at TEXT,
  currency_code TEXT DEFAULT 'GBP' CHECK(length(currency_code) <= 3),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO wallet_transactions_new (id, wallet_id, type, amount_pence, campaign_id, issue_id, stripe_payment_id, description, completed_at, currency_code, created_at)
  SELECT id, wallet_id, type, amount_pence, campaign_id, issue_id, stripe_payment_id, description, completed_at, currency_code, created_at FROM wallet_transactions;
DROP TABLE wallet_transactions;
ALTER TABLE wallet_transactions_new RENAME TO wallet_transactions;
CREATE INDEX IF NOT EXISTS idx_wtx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wtx_campaign ON wallet_transactions(campaign_id);

-- ── Create treasury system user + wallet ───────────────────────────────
-- The treasury needs a real user row because wallets.user_id is a FK to users.
-- This is a system account, not a real person — email marks it as internal.

INSERT OR IGNORE INTO users (id, name, email, status)
  VALUES ('treasury', 'Quiet Riots Treasury', 'treasury@system.quietriots.com', 'active');

INSERT OR IGNORE INTO wallets (id, user_id, balance_pence, total_loaded_pence, total_spent_pence, currency)
  VALUES ('treasury-wallet', 'treasury', 0, 0, 0, 'GBP');

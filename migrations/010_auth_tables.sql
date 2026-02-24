-- Migration 010: Auth.js tables + legal/consent
-- OAuth accounts, verification tokens, legal documents, user consent tracking

-- Auth.js accounts (OAuth providers linked to users)
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

-- Auth.js verification tokens (magic links, email verification)
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL CHECK(length(identifier) <= 255),
  token TEXT NOT NULL UNIQUE,
  expires TEXT NOT NULL
);

-- Country-specific legal documents (T&Cs, Privacy Policy)
CREATE TABLE IF NOT EXISTS legal_documents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  country_code TEXT NOT NULL CHECK(length(country_code) <= 3),
  document_type TEXT NOT NULL CHECK(document_type IN ('terms', 'privacy', 'cookie')),
  version TEXT NOT NULL CHECK(length(version) <= 20),
  content_url TEXT NOT NULL CHECK(length(content_url) <= 500),
  effective_date TEXT NOT NULL,
  UNIQUE(country_code, document_type, version)
);

-- Track user consent/acceptance (upsert pattern — one row per user per type)
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

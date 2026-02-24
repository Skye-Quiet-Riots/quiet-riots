-- Phase 3: Multi-currency wallets + country-scoped content

-- Idempotency guard: prevent double-crediting a topup
ALTER TABLE wallet_transactions ADD COLUMN completed_at TEXT;

-- Track currency per transaction (for cross-currency contributions)
ALTER TABLE wallet_transactions ADD COLUMN currency_code TEXT DEFAULT 'GBP' CHECK(length(currency_code) <= 3);

-- Campaign currency (target is denominated in this currency)
ALTER TABLE campaigns ADD COLUMN currency_code TEXT DEFAULT 'GBP' CHECK(length(currency_code) <= 3);

-- Country scope on issues: global vs country-specific
ALTER TABLE issues ADD COLUMN country_scope TEXT DEFAULT 'global' CHECK(country_scope IN ('global','country'));
ALTER TABLE issues ADD COLUMN primary_country TEXT CHECK(length(primary_country) <= 3);

-- Exchange rates for cross-currency contributions
CREATE TABLE IF NOT EXISTS exchange_rates (
  from_currency TEXT NOT NULL CHECK(length(from_currency) <= 3),
  to_currency TEXT NOT NULL CHECK(length(to_currency) <= 3),
  rate REAL NOT NULL CHECK(rate > 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (from_currency, to_currency)
);

-- Index for country-scoped issue queries
CREATE INDEX IF NOT EXISTS idx_issues_country ON issues(country_scope, primary_country);

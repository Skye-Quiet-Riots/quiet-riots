-- Riot Wallet: wallets, wallet_transactions, campaigns tables
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) UNIQUE,
  balance_pence INTEGER NOT NULL DEFAULT 0 CHECK(balance_pence >= 0),
  total_loaded_pence INTEGER NOT NULL DEFAULT 0 CHECK(total_loaded_pence >= 0),
  total_spent_pence INTEGER NOT NULL DEFAULT 0 CHECK(total_spent_pence >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP' CHECK(length(currency) <= 3),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wtx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wtx_campaign ON wallet_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_issue ON campaigns(issue_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

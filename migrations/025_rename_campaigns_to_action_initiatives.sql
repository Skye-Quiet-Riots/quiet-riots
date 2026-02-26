-- Rename campaigns → action_initiatives for Stripe compliance
-- Also renames columns and status values to remove crowdfunding language

-- Step 1: Rename table
ALTER TABLE campaigns RENAME TO action_initiatives;

-- Step 2: Rebuild action_initiatives with renamed columns + status values
CREATE TABLE action_initiatives_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  org_id TEXT REFERENCES organisations(id),
  title TEXT NOT NULL CHECK(length(title) <= 255),
  description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 2000),
  target_pence INTEGER NOT NULL CHECK(target_pence > 0),
  committed_pence INTEGER NOT NULL DEFAULT 0 CHECK(committed_pence >= 0),
  supporter_count INTEGER NOT NULL DEFAULT 0 CHECK(supporter_count >= 0),
  recipient TEXT CHECK(length(recipient) <= 255),
  recipient_url TEXT CHECK(length(recipient_url) <= 500),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','goal_reached','delivered','cancelled')),
  service_fee_pct INTEGER NOT NULL DEFAULT 15 CHECK(service_fee_pct >= 0 AND service_fee_pct <= 100),
  currency_code TEXT DEFAULT 'GBP' CHECK(length(currency_code) <= 3),
  goal_reached_at TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO action_initiatives_new SELECT id, issue_id, org_id, title, description,
  target_pence, raised_pence, contributor_count, recipient, recipient_url,
  CASE status WHEN 'funded' THEN 'goal_reached' WHEN 'disbursed' THEN 'delivered' ELSE status END,
  platform_fee_pct, currency_code, funded_at, disbursed_at, created_at
FROM action_initiatives;
DROP TABLE action_initiatives;
ALTER TABLE action_initiatives_new RENAME TO action_initiatives;

-- Step 3: Rebuild wallet_transactions with renamed column + transaction type
CREATE TABLE wallet_transactions_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL CHECK(type IN ('topup','payment','refund','share_consideration')),
  amount_pence INTEGER NOT NULL CHECK(amount_pence > 0),
  action_initiative_id TEXT,
  issue_id TEXT,
  stripe_payment_id TEXT,
  description TEXT DEFAULT '' CHECK(length(description) <= 500),
  completed_at TEXT,
  currency_code TEXT DEFAULT 'GBP' CHECK(length(currency_code) <= 3),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO wallet_transactions_new SELECT id, wallet_id,
  CASE type WHEN 'contribute' THEN 'payment' ELSE type END,
  amount_pence, campaign_id, issue_id, stripe_payment_id,
  description, completed_at, currency_code, created_at
FROM wallet_transactions;
DROP TABLE wallet_transactions;
ALTER TABLE wallet_transactions_new RENAME TO wallet_transactions;

-- Step 4: Recreate indexes
CREATE INDEX idx_action_initiatives_issue ON action_initiatives(issue_id);
CREATE INDEX idx_action_initiatives_status ON action_initiatives(status);
CREATE INDEX idx_wtx_action_initiative ON wallet_transactions(action_initiative_id);
CREATE INDEX idx_wtx_wallet ON wallet_transactions(wallet_id);

-- Step 5: Update translation entity type in data
UPDATE translations SET entity_type = 'action_initiative' WHERE entity_type = 'campaign';

-- Step 6: Backwards-compatible view (read-only, for deployment window)
-- Old code can still SELECT FROM campaigns during the brief window between
-- migration running and new code deploying. DROP in a future cleanup PR.
CREATE VIEW campaigns AS SELECT
  id, issue_id, org_id, title, description, target_pence,
  committed_pence AS raised_pence, supporter_count AS contributor_count,
  recipient, recipient_url,
  CASE status WHEN 'goal_reached' THEN 'funded' WHEN 'delivered' THEN 'disbursed' ELSE status END AS status,
  service_fee_pct AS platform_fee_pct, currency_code,
  goal_reached_at AS funded_at, delivered_at AS disbursed_at, created_at
FROM action_initiatives;

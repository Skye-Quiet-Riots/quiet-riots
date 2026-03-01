-- Deploy a Chicken: paid action where a chicken-costumed person delivers a handwritten note

CREATE TABLE IF NOT EXISTS chicken_pricing (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  country_code TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  base_price_pence INTEGER NOT NULL CHECK (base_price_pence > 0),
  distance_surcharge_pence INTEGER NOT NULL DEFAULT 0 CHECK (distance_surcharge_pence >= 0),
  express_surcharge_pence INTEGER NOT NULL DEFAULT 0 CHECK (express_surcharge_pence >= 0),
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chicken_fulfillers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT NOT NULL,
  country_code TEXT NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 50,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  rating REAL DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  deployments_completed INTEGER NOT NULL DEFAULT 0 CHECK (deployments_completed >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chicken_deployments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  issue_id TEXT REFERENCES issues(id),
  organisation_id TEXT REFERENCES organisations(id),
  target_name TEXT NOT NULL,
  target_role TEXT,
  target_address TEXT NOT NULL,
  target_city TEXT NOT NULL,
  target_country TEXT NOT NULL,
  message_text TEXT NOT NULL CHECK (length(message_text) <= 500),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'accepted', 'in_progress', 'delivered', 'cancelled', 'refunded', 'disputed')),
  pricing_id TEXT REFERENCES chicken_pricing(id),
  amount_paid_pence INTEGER NOT NULL CHECK (amount_paid_pence > 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  express_delivery INTEGER NOT NULL DEFAULT 0 CHECK (express_delivery IN (0, 1)),
  estimated_delivery_date TEXT,
  fulfiller_id TEXT REFERENCES chicken_fulfillers(id),
  fulfiller_notes TEXT,
  proof_photo_url TEXT,
  wallet_transaction_id TEXT REFERENCES wallet_transactions(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at TEXT,
  cancelled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_chicken_deployments_user ON chicken_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_chicken_deployments_status ON chicken_deployments(status);
CREATE INDEX IF NOT EXISTS idx_chicken_deployments_fulfiller ON chicken_deployments(fulfiller_id);
CREATE INDEX IF NOT EXISTS idx_chicken_pricing_country ON chicken_pricing(country_code, active);

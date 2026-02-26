# Plan: Rename "campaigns" → "action_initiatives" (Full Code Refactor)

## Context

Session 50 (PR #116) changed the **UI-facing copy** to Stripe-compliant language ("Action Projects", "Goal Reached", etc.), but all **internal code** still uses `campaigns`, `contribute`, `raised_pence`, `funded`, `disbursed`, `platform_fee_pct`. Stripe can see API routes and URL paths, so this needs a full code-level rename. No previous session attempted this code refactor.

## Scope Boundaries

### IN SCOPE
- Table rename `campaigns` → `action_initiatives` (+ all column renames)
- Column rename `wallet_transactions.campaign_id` → `action_initiative_id`
- Transaction type `'contribute'` → `'payment'`
- Status values `'funded'` → `'goal_reached'`, `'disbursed'` → `'delivered'`
- Column renames: `raised_pence` → `committed_pence`, `contributor_count` → `supporter_count`, `platform_fee_pct` → `service_fee_pct`, `funded_at` → `goal_reached_at`, `disbursed_at` → `delivered_at`
- All TypeScript types, queries, API routes, pages, components
- URL path renames (`/campaigns` → `/action-initiatives`, `/wallet/contribute` → `/wallet/pay`)
- Translation entity type `'campaign'` → `'action_initiative'` (in DB data)
- i18n namespace renames in all 45 locale files
- SEO redirects for old URLs

### OUT OF SCOPE (with justification)
- **`notification_preferences.campaign_updates` column** — internal DB column, not user-facing. Renaming cascades into privacy.ts, privacy.test.ts, notifications route, types. Separate PR.
- **Bot action names (`contribute`, `get_campaigns`)** — Changing requires SKILL.md + TOOLS.md + OpenClaw session clearing. Keep old action names in bot route for compatibility. Separate PR with OpenClaw coordination.
- **Analytics event name `campaign_contributed`** — Keep for dashboard continuity; rename later.

## Naming Convention

| Old | New |
|---|---|
| `campaigns` (table) | `action_initiatives` |
| `Campaign` (type) | `ActionInitiative` |
| `CampaignStatus` | `ActionInitiativeStatus` |
| `CampaignWithIssue` | `ActionInitiativeWithIssue` |
| `campaign_id` (FK column) | `action_initiative_id` |
| `/api/campaigns` | `/api/action-initiatives` |
| `/[locale]/campaigns` | `/[locale]/action-initiatives` |
| `getCampaigns()` etc. | `getActionInitiatives()` etc. |
| `createContribution()` | `createPayment()` |
| `translateCampaigns()` | `translateActionInitiatives()` |
| `campaign-card.tsx` | `action-initiative-card.tsx` |
| `campaign-progress.tsx` | `action-initiative-progress.tsx` |
| `contribute-form.tsx` | `pay-form.tsx` |
| `campaigns.ts` (query file) | `action-initiatives.ts` |
| `contribute` (tx type) | `payment` |
| `/api/wallet/contribute` | `/api/wallet/pay` |
| `raised_pence` | `committed_pence` |
| `contributor_count` | `supporter_count` |
| `platform_fee_pct` | `service_fee_pct` |
| `funded` (status) | `goal_reached` |
| `funded_at` | `goal_reached_at` |
| `disbursed` (status) | `delivered` |
| `disbursed_at` | `delivered_at` |

## Incremental Commit Protocol (MANDATORY)

Every phase gets its own commit + push **immediately** after `npm test` passes. If the session crashes, the last pushed commit survives. Each phase includes its own test updates so tests pass at every checkpoint.

## Deployment Strategy

**Problem:** Renaming a table creates a chicken-and-egg between code and schema. Old code references `FROM campaigns`, new code references `FROM action_initiatives`.

**Solution:** The migration creates a **backwards-compatible VIEW** so old code keeps working during the brief deployment window:

```sql
CREATE VIEW campaigns AS SELECT
  id, issue_id, org_id, title, description, target_pence,
  committed_pence AS raised_pence, supporter_count AS contributor_count,
  recipient, recipient_url,
  CASE status WHEN 'goal_reached' THEN 'funded' WHEN 'delivered' THEN 'disbursed' ELSE status END AS status,
  service_fee_pct AS platform_fee_pct, currency_code,
  goal_reached_at AS funded_at, delivered_at AS disbursed_at, created_at
FROM action_initiatives;
```

**Deployment sequence:**
1. Run migration on staging → verify
2. Run migration on production → the VIEW lets old deployed code keep reading
3. Merge PR → Vercel auto-deploys new code (reads from `action_initiatives` directly)
4. Future cleanup PR: `DROP VIEW IF EXISTS campaigns;`

Note: The VIEW is read-only (SQLite limitation). During the ~60s window between migration and new code deploy, writes (`createContribution`, `createCampaign`) will fail. Reads keep working.

---

## Phase 0: Plan
- Save PLAN.md → commit + push

## Phase 1: Database Migration + Schema

**Create** `migrations/025_rename_campaigns_to_action_initiatives.sql`:

```sql
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
CREATE VIEW campaigns AS SELECT
  id, issue_id, org_id, title, description, target_pence,
  committed_pence AS raised_pence, supporter_count AS contributor_count,
  recipient, recipient_url,
  CASE status WHEN 'goal_reached' THEN 'funded' WHEN 'delivered' THEN 'disbursed' ELSE status END AS status,
  service_fee_pct AS platform_fee_pct, currency_code,
  goal_reached_at AS funded_at, delivered_at AS disbursed_at, created_at
FROM action_initiatives;
```

**CRITICAL:** Use `CURRENT_TIMESTAMP` not `datetime('now')` for DEFAULT values (Turso gotcha).

**Update** `src/lib/schema.ts`:
- Rename table `campaigns` → `action_initiatives` with all new column names/constraints
- Rename `campaign_id` → `action_initiative_id` in `wallet_transactions`
- Change `'contribute'` → `'payment'` in CHECK constraint
- Update index names
- In `dropTables()`: add `DROP VIEW IF EXISTS campaigns;` BEFORE `DROP TABLE IF EXISTS action_initiatives;`

**Commit + push** (tests won't pass yet — that's OK for this phase only since schema is foundational)

## Phase 2: Types + Query Files + Their Tests

**Update** `src/types/index.ts`:
- `CampaignStatus` → `ActionInitiativeStatus` with `'active' | 'goal_reached' | 'delivered' | 'cancelled'`
- `WalletTransactionType`: `'contribute'` → `'payment'`
- `WalletTransaction.campaign_id` → `action_initiative_id`
- `Campaign` → `ActionInitiative` with all field renames

**Rename + update** `src/lib/queries/campaigns.ts` → `src/lib/queries/action-initiatives.ts`:
- All function names, SQL, types, column references

**Update** `src/lib/queries/wallet.ts`:
- `createContribution()` → `createPayment()`
- All SQL column refs, status values, return types
- Keep parameter name `actionInitiativeId` (was `campaignId`)

**Update** `src/lib/queries/translate.ts`:
- `translateCampaigns()` → `translateActionInitiatives()`
- Entity type `'campaign'` → `'action_initiative'`

**Update** `src/lib/queries/generate-translations.ts`:
- Entity type reference

**Update test files:**
- `campaigns.test.ts` → `action-initiatives.test.ts`
- `wallet.test.ts` — function names, assertions, column refs
- `translate.test.ts` — function name
- `generate-translations.test.ts` — entity type
- `ai.test.ts` — campaign references

**Update** `src/test/seed-test-data.ts`:
- Table names, column names, status values, transaction types in INSERT statements

**Run `npm test` — MUST pass**
**Commit + push**

## Phase 3: API Routes + Their Tests

**Rename** `src/app/api/campaigns/` → `src/app/api/action-initiatives/`
- Update all imports, function calls, variable names, error messages, Zod schemas
- `platform_fee_pct` → `service_fee_pct` in create schema

**Rename** `src/app/api/wallet/contribute/` → `src/app/api/wallet/pay/`
- Update imports, schema name (`contributeSchema` → `paySchema`), rate limit key

**Update** `src/app/api/bot/route.ts`:
- Update imports to new query file paths/names
- Internal variable names: `campaign` → `actionInitiative`
- **Keep bot action names `contribute` and `get_campaigns` for SKILL.md compatibility**
- Update error messages

**Update test files:**
- `campaigns-api.test.ts` → `action-initiatives-api.test.ts` (rename + update)
- `wallet-api.test.ts` — API path `/api/wallet/contribute` → `/api/wallet/pay`
- `bot-api.test.ts` — response field names, error messages (keep action names)

**Run `npm test` — MUST pass**
**Commit + push**

## Phase 4: Pages + Components + Their Tests

**Rename page directories:**
- `src/app/[locale]/campaigns/` → `src/app/[locale]/action-initiatives/`
- Update all imports, variable names, hrefs, translation namespaces

**Rename component files:**
- `campaign-card.tsx` → `action-initiative-card.tsx`
- `campaign-progress.tsx` → `action-initiative-progress.tsx`
- `contribute-form.tsx` → `pay-form.tsx`

**Update component internals:**
- All props: `campaign` → `actionInitiative`, `campaignId` → `actionInitiativeId`
- All field accesses: `raised_pence` → `committed_pence`, `contributor_count` → `supporter_count`, etc.
- `status-filter.tsx`: type refs `CampaignStatus` → `ActionInitiativeStatus`, status values
- `transaction-list.tsx`: `'contribute'` → `'payment'`
- `wallet-balance.tsx`: `campaigns_supported` prop name (keep for now, it's internal)
- `pay-form.tsx`: `fetch('/api/wallet/pay')`, keep `trackEvent('campaign_contributed')` (out of scope)

**Update pages that import these:**
- `src/app/[locale]/wallet/page.tsx` — imports, variables, hrefs `/campaigns` → `/action-initiatives`
- `src/app/[locale]/issues/[id]/page.tsx` — imports, variables

**Update all hrefs:**
- `/campaigns` → `/action-initiatives` everywhere
- `/campaigns/${id}` → `/action-initiatives/${id}`

**Update component test files:**
- `data.test.tsx` — field names in test data, transaction types
- `cards.test.tsx` — field names in test data
- `interactive.test.tsx` — component names, API paths, transaction types

**Update** `src/test/integration.test.ts` — campaign references

**Run `npm test` — MUST pass**
**Commit + push**

## Phase 5: Seed Data

**Update** `src/lib/seed.ts`:
- `INSERT INTO campaigns` → `INSERT INTO action_initiatives`
- Column renames in all INSERT statements
- Status values: `'funded'` → `'goal_reached'`, `'disbursed'` → `'delivered'`
- Transaction type: `'contribute'` → `'payment'`

**Run `npm test` — MUST pass**
**Commit + push**

## Phase 6: SEO Redirects

**Update** `next.config.ts` — add permanent redirects:
```ts
async redirects() {
  return [
    { source: '/:locale/campaigns', destination: '/:locale/action-initiatives', permanent: true },
    { source: '/:locale/campaigns/:id', destination: '/:locale/action-initiatives/:id', permanent: true },
  ];
}
```

**Commit + push**

## Phase 7: i18n (messages/*.json)

**Update** `messages/en.json`:
- `"Campaigns"` → `"ActionInitiatives"` (namespace)
- `"CampaignDetail"` → `"ActionInitiativeDetail"` (namespace)
- `"CampaignProgress"` → `"ActionInitiativeProgress"` (namespace)
- `"Contribute"` → `"Pay"` (namespace)
- Interpolation vars: `{campaign}` → `{actionInitiative}` in success messages
- Check all `getTranslations()` calls match new namespace names

**Update** `src/i18n/messages.test.ts` — expect new namespace names

**Launch 6 parallel sub-agents** for 44 non-English locales (standard batches):
- Rename namespace keys (structure-only change, translation values stay the same)
- Rename interpolation variables `{campaign}` → `{actionInitiative}`

**Validate:** `for f in messages/*.json; do node -e "require('./$f')" || echo "BROKEN: $f"; done`

**Run `npm test` — MUST pass**
**Commit + push**

## Phase 8: Documentation + Scripts

**Update** `ARCHITECTURE.md`:
- All route paths, table names, component names, query file names

**Update** `CLAUDE.md`:
- All references to campaigns, campaign routes, campaign table

**Update** `scripts/seed-translations.ts`:
- Entity type `'campaign'` → `'action_initiative'`

**Add notes:**
- `notification_preferences.campaign_updates` intentionally not renamed (separate PR)
- Bot action names `contribute`/`get_campaigns` intentionally kept (separate PR, requires SKILL.md update)
- Future cleanup: `DROP VIEW IF EXISTS campaigns;` after confirming no old code references it

**Commit + push**

## Phase 9: Final Verification + PR

1. `npm test` — all tests pass
2. `npm run build` — clean TypeScript build
3. Grep for any remaining `campaign` references (excluding session-logs, node_modules, .git):
   ```bash
   grep -r "campaign" src/ scripts/ messages/en.json migrations/ --include="*.ts" --include="*.tsx" --include="*.json" --include="*.sql" | grep -v node_modules | grep -v "campaign_updates" | grep -v "campaign_contributed" | grep -v session-logs
   ```
4. Create PR
5. Wait for CI

## Phase 10: Deployment

Execute in this exact order:
1. Run migration on staging → verify reads + writes work
2. Run migration on production → backwards-compatible VIEW keeps old code working
3. Merge PR → Vercel auto-deploys new code (~60s)
4. Run post-merge checklist (health check, etc.)
5. Verify `/action-initiatives` page loads, `/campaigns` redirects work
6. **Future PR:** Drop the `campaigns` VIEW
7. **Future PR:** Rename bot actions + update SKILL.md/TOOLS.md + clear OpenClaw sessions

## Security Considerations

- **No auth/authz changes** — session handling, cookie auth, bot API key auth all unchanged
- **Rate limit keys change** (`contribute:` → `payment:`) — in-memory limiter resets on Vercel cold start anyway, no security gap
- **No new attack surface** — same endpoints, just renamed paths
- **SEO redirects** prevent URL enumeration of old paths returning 404s
- **Backwards-compatible VIEW** is read-only — no risk of writes through VIEW bypassing constraints
- **Bot action names preserved** — no risk of breaking SKILL.md auth flow

## Rollback Strategy

If migration breaks production:
1. The VIEW means old code can still READ from `campaigns`
2. For full rollback: create reverse migration (rename back, rebuild with old columns/values)
3. The migration is idempotent-safe: running twice on a migrated DB will fail (campaigns table doesn't exist), not corrupt data

## Files to Modify (~85 files)

**Migration:** 1 new file (`025_rename_campaigns_to_action_initiatives.sql`)
**Schema:** `src/lib/schema.ts`
**Types:** `src/types/index.ts`
**Queries:** `action-initiatives.ts` (renamed), `wallet.ts`, `translate.ts`, `generate-translations.ts`
**API routes:** `action-initiatives/route.ts`, `action-initiatives/[id]/route.ts`, `wallet/pay/route.ts` (renamed), `bot/route.ts`
**Pages:** `action-initiatives/page.tsx`, `action-initiatives/[id]/page.tsx` (renamed), `wallet/page.tsx`, `issues/[id]/page.tsx`
**Components:** `action-initiative-card.tsx`, `action-initiative-progress.tsx`, `pay-form.tsx` (renamed), `status-filter.tsx`, `transaction-list.tsx`, `wallet-balance.tsx`
**Tests:** `action-initiatives.test.ts`, `wallet.test.ts`, `translate.test.ts`, `generate-translations.test.ts`, `ai.test.ts`, `action-initiatives-api.test.ts`, `wallet-api.test.ts`, `bot-api.test.ts`, `data.test.tsx`, `cards.test.tsx`, `interactive.test.tsx`, `integration.test.ts`, `messages.test.ts`, `seed-test-data.ts`
**Seed:** `seed.ts`
**Translations:** 45 locale files
**Docs:** `ARCHITECTURE.md`, `CLAUDE.md`
**Scripts:** `seed-translations.ts`
**Config:** `next.config.ts` (redirects)

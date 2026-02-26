# Quiet Riots Global Share Scheme — Implementation Plan

## Context

Every Quiet Rioter worldwide (249 countries) gets offered **one share** in Quiet Riots (a UK limited company). This creates a share lifecycle with 4 personas (User, Share Guide, Compliance Guide, Senior Compliance) and a multi-step workflow: eligibility → offer → 10p payment → apply → identity verification → compliance review → certificate issuance. The feature works on both web and WhatsApp, in all 45 locales.

The share section is password-protected and accessed via the Profile dropdown or by asking the WhatsApp bot. The Share page is the hub of information; the bot is a spoke that makes it accessible conversationally.

---

## Security Design (from senior developer audit)

### Principles applied throughout

1. **Atomic state transitions** — all status changes use `UPDATE ... WHERE status = '<expected>'` and check `rowsAffected > 0`. If 0, another request won the race. No duplicate notifications.
2. **Self-review prevention** — every review/compliance/senior endpoint explicitly checks `application.user_id !== actorId`.
3. **Role-scoped data access** — Share Guides never see identity data. Compliance Guides see identity but not share_guide notes. Users never see guide IDs or internal notes. Messages filtered by role visibility.
4. **PII protection** — `share_identities` gets application-level field encryption (AES-256-GCM, key from `SHARE_IDENTITY_KEY` env var). PII access logged from day 1 via `share_audit_log`.
5. **Password gate hardened** — password stored in `SHARE_ACCESS_PASSWORD` env var (not in source code). Cookie bound to userId via HMAC. Rate-limited POST endpoint. Path-scoped cookie (`/share`).
6. **Wallet payment atomic** — 10p debit + status transition in same `db.batch()`. Balance checked before batch. Refund on rejection.
7. **Input sanitization** — all user-supplied text through `sanitizeText()`. All Zod schemas with explicit length limits. Country code validated against countries table.

---

## Eligibility Requirements

A Quiet Rioter qualifies for the share offer **only after meeting all three criteria**:

1. **Verified real-name user** — completed identity verification (name, email confirmed or phone verified)
2. **Joined 3 Quiet Riots** — member of at least 3 issues
3. **Completed 10 actions** — any combination of: commenting on a post, submitting evidence, taking an action, liking a post, joining an issue, submitting a suggestion, etc.

The share application status starts as `not_eligible` until these thresholds are met, at which point it auto-promotes to `available`. Eligibility checks are async (fire-and-forget after join/action) and short-circuit if the user already has status ≠ `not_eligible`.

---

## WhatsApp Onboarding — Share Mention

The bot introduces the share scheme early in the onboarding flow (within the first 3 messages). This is a **mention, not a hard sell** — it plants the seed:

**Message pattern (during or after first issue search):**
> "By the way, every Quiet Rioter who joins 3 Riots and takes 10 actions qualifies for a real share in Quiet Riots — the company itself. You can find out more any time by asking me about 'my share' or visiting your profile on the website."

The bot uses `user_memory` to track:
- `share_mentioned: true` — so it doesn't repeat the intro on subsequent sessions
- `share_eligible: true/false` — updated when thresholds are met
- `share_status: <status>` — mirrors the DB status for quick bot reference

When a user asks about shares via WhatsApp, the bot explains the basics conversationally and links them to the full Share page for detailed information (consideration explanation, valuation table, legal disclaimers).

---

## Profile Page — Share Section

A new **"Your Quiet Riots Share"** section is added to the profile page, positioned after the stats grid and before Connected Accounts:

- **Share status badge** with progress towards eligibility if not yet eligible
- **Link to the full Share info page**: "Learn more about your Quiet Riots share →"
- If `issued`: certificate number and issue date

This is always visible on the profile — no password gate needed here.

---

## 10p Share Consideration Payment

### Why 10p?

Under UK company law (Companies Act 2006), shares cannot be issued for free. A nominal payment is required for the share to be legally valid. The consideration is **10 pence** (or the equivalent in the user's local currency using live exchange rates from the existing wallet system).

### User Flow

When a user clicks "Proceed with Issue" on the Share info page:

1. **Check wallet balance** — does the user have ≥10p (or local equivalent) in their Quiet Riots wallet?
2. **If sufficient:** Show confirmation: *"To complete your share application, a nominal payment of 10p (or [local equivalent]) will be deducted from your wallet. This is a legal requirement for the share to be valid."* User confirms → 10p deducted → status moves to `under_review`.
3. **If insufficient:** Show message: *"You need 10p in your wallet to proceed. Would you like to top up now?"* with a link to the wallet top-up page. After topping up, they return to proceed.

### Treasury

The 10p goes to a **Quiet Riots Treasury wallet** — a special system wallet (not tied to a user) that holds all share consideration payments. A new `treasury_guide` role can view all treasury transactions. The Super Administrator always has access.

### Refund Policy

If a share application is **rejected**, the 10p is automatically refunded to the user's wallet with a notification: *"Your share application was not approved. Your 10p consideration has been refunded to your wallet."*

If the user **declines** (before proceeding), no payment is taken.

---

## Share Consideration — How It Works at Different Valuations

### Legal Background (UK Company Law)

Under the Companies Act 2006, shares in a UK limited company cannot be issued for free — some form of consideration must be given. However, shares can be issued at **nominal value** (the par value set when the company was formed), which can be as low as £0.001.

The key mechanism is **growth shares** — a special class of shares that only become valuable above a certain company valuation (the "hurdle"). Because they have minimal current value at the time of issue, they can be issued at or near nominal value with reduced tax implications. Growth shares are taxed as capital gains (not income), which is significantly more favourable.

### What This Means at Each Valuation Stage

| Stage | Valuation | Share Nominal Value | What Happens |
|-------|----------|-------------------|-------------|
| **Pre-Seed** | $10m | £0.001 | Shares issued at nominal value. You pay 10p consideration. No meaningful tax event. |
| **Seed** | $100m | £0.001 | Same nominal value. Difference goes to share premium account. Growth share hurdle set above current valuation. |
| **Series A** | $1bn | £0.001 | Pre-emption rights waived for user share pool (agreed at Seed). HMRC may assign "hope value" but growth share structure minimises this. |
| **Series B** | $10bn | £0.001 | Growth share hurdle ensures limited current value despite high company valuation. Investor anti-dilution already accounts for user pool. |
| **Series C** | $100bn | £0.001 | User share pool is a defined cap table percentage. New shares issued from reserved pool, not new dilutive issuances. |
| **IPO** | $1tn | — | No new shares issued. User shares convert to ordinary tradeable shares. Capital gains tax may apply on sale. |

### Important Disclaimers

- This is a simplified explanation — not legal, tax, or investment advice
- Each user's tax obligations depend on their country of residence
- There is no guarantee the company will reach any valuation
- The share structure may be modified as the company grows
- Users should consult qualified advisors in their own country

---

## Team Permissions Module

### Extended roles system

The existing `user_roles` table is extended with new roles. A user can have multiple roles but **`share_guide` and `compliance_guide` are mutually exclusive** (enforced in `assignRole()`). Only administrators can assign roles.

| Role | Access |
|------|--------|
| `setup_guide` | Issue suggestion review dashboard |
| `administrator` | Full access to everything (Super Admin) |
| `share_guide` | Share application review, user Q&A |
| `compliance_guide` | Identity verification review, compliance decisions |
| `treasury_guide` | Treasury transaction log, payment reporting |

The `administrator` role implicitly has all other role permissions. Simon Darling (Super Administrator) always has access to all dashboards.

### Team management page (`/[locale]/admin/team`)

Role-gated to `administrator` only. Shows:
- All users with assigned roles
- Add/remove role buttons
- Mutual exclusivity enforcement (can't give someone both `share_guide` and `compliance_guide`)
- Audit trail of role changes (who assigned, when)

---

## Phase 1: Database + Types

**Migration:** `migrations/022_share_scheme.sql`

### New tables

**`share_applications`** — core state machine (one per user):
- `id`, `user_id` (UNIQUE FK)
- `status` CHECK IN (`not_eligible`, `available`, `under_review`, `approved`, `identity_submitted`, `forwarded_senior`, `issued`, `declined`, `rejected`, `withdrawn`)
- Eligibility: `riots_joined_at_offer`, `actions_at_offer`, `eligible_at`
- Payment: `payment_transaction_id` (FK to wallet_transactions), `payment_amount_pence`
- Guide review: `share_guide_id`, `share_guide_decision_at`, `share_guide_notes`
- Compliance: `compliance_guide_id`, `compliance_decision_at`, `compliance_notes`
- Senior: `senior_compliance_id`, `senior_decision_at`, `senior_notes`
- `rejection_reason`, `reapply_count` CHECK(≥0), `certificate_number` (UNIQUE), `issued_at`
- `last_notification_at`, `created_at`, `updated_at`
- Indexes: `status`, `user_id` (via UNIQUE), `share_guide_id`

**`share_identities`** — identity verification details (encrypted PII):
- `id`, `application_id` (UNIQUE FK), `user_id` (UNIQUE FK)
- Personal: `legal_first_name`, `legal_middle_name`, `legal_last_name`, `date_of_birth`, `gender` CHECK IN values
- Address: `address_line_1`, `address_line_2`, `city`, `state_province`, `postal_code`, `country_code`
- `phone`, `id_document_type` CHECK IN values, `id_document_country`
- `digital_verification_available` (0/1)
- `submitted_at`, `updated_at`
- All personal fields encrypted at application level (AES-256-GCM, key from `SHARE_IDENTITY_KEY` env var)

**`share_messages`** — bidirectional conversation threads:
- `id`, `application_id` (FK), `sender_id` (FK), `sender_role` CHECK IN (`applicant`, `share_guide`, `compliance_guide`, `senior_compliance`)
- `content` CHECK(length ≤ 5000), `created_at`
- Indexes: `(application_id, created_at)`, `sender_id`

**`share_audit_log`** — PII access and action logging:
- `id`, `application_id`, `actor_id`, `action` (e.g. `viewed_identity`, `approved`, `rejected`, `forwarded`), `detail`, `created_at`
- Index: `(application_id, created_at)`

**`share_status_history`** — complete transition trail:
- `id`, `application_id`, `from_status`, `to_status`, `actor_id`, `notes`, `created_at`
- Index: `(application_id, created_at)`

**`share_certificate_counter`** — monotonic counter for certificate numbers:
- `id` (always 1), `next_number` INTEGER DEFAULT 1
- Certificate format: `QR-{YYYYMM}-{SEQ}` (e.g. `QR-202603-00001`)

**Treasury wallet:** A special row in `wallets` table with `user_id = 'treasury'` (system wallet).

### Schema modifications (temp table + copy + rename)

1. **`user_roles`** — extend CHECK: add `'share_guide'`, `'compliance_guide'`, `'treasury_guide'`
2. **`messages`** — extend `type` CHECK: add `'share_available'`, `'share_approved'`, `'share_identity_needed'`, `'share_issued'`, `'share_rejected'`, `'share_question'`, `'share_payment_received'`, `'share_refunded'`
3. **`messages`** — extend `entity_type` CHECK: add `'share_application'`

### Type updates (`src/types/index.ts`)

- New types: `ShareStatus` (10 values including `not_eligible`, `withdrawn`), `ShareApplication`, `ShareIdentity`, `ShareMessage`, `ShareAuditEntry`, `ShareStatusHistory`, `ShareGender`, `IdDocumentType`
- Extend: `RoleType` (+3 new), `MessageType` (+8 new), `MessageEntityType` (+1)

### Schema updates (`src/lib/schema.ts`)

- Add 6 new tables to `createTables()` and `dropTables()`

### Files
| File | Action |
|------|--------|
| `migrations/022_share_scheme.sql` | Create |
| `src/types/index.ts` | Modify |
| `src/lib/schema.ts` | Modify |

---

## Phase 2: Query Layer + Tests

**File:** `src/lib/queries/shares.ts`

### Eligibility (single optimised query)
```sql
SELECT
  (SELECT COUNT(*) FROM user_issues WHERE user_id = ?) as riots_joined,
  (SELECT COUNT(*) FROM feed WHERE user_id = ?) +
  (SELECT COUNT(*) FROM actions WHERE ... ) as actions_taken,
  u.email_verified, u.phone_verified, u.name
FROM users u WHERE u.id = ?
```
- `checkShareEligibility(userId)` — returns `{ eligible, riotsJoined, actionsTaken, isVerified }`
- `getOrCreateShareApplication(userId)` — lazy-create with correct initial status
- `promoteToEligible(userId)` — `not_eligible` → `available` using `WHERE status = 'not_eligible'` + `rowsAffected` guard. Async, fire-and-forget.

### Core lifecycle (all using `rowsAffected` idempotency)
- `getShareApplication(userId)` / `getShareApplicationById(id)`
- `proceedWithShare(userId, walletId)` — atomic `db.batch()`: debit wallet 10p + credit treasury + insert wallet_transaction + update status `available` → `under_review`
- `declineShare(userId)` — `available` → `declined` (permanent, no payment taken)
- `withdrawShare(userId)` — user-initiated cancellation from `under_review` or `approved` → `withdrawn` (10p refunded)
- `reapplyForShare(userId, walletId)` — `rejected` → `under_review` (another 10p payment, bump reapply_count)

### Share Guide functions
- `getApplicationsForReview(guideRole)` — filtered by status relevant to each role
- `approveShareApplication(id, guideId, notes?)` — `under_review` → `approved` + self-review guard
- `rejectShareApplication(id, guideId, reason)` — → `rejected` + auto-refund 10p

### Identity functions
- `submitIdentity(data)` — `approved` → `identity_submitted` + encrypt PII fields before INSERT
- `getShareIdentity(applicationId, requesterId)` — decrypt + log access to `share_audit_log`
- `updateIdentity(applicationId, data)` — allow re-submission when more info requested

### Compliance functions
- `approveCompliance(id, guideId, notes?)` — → `issued` (generate certificate_number atomically via counter)
- `rejectCompliance(id, guideId, reason)` — → `rejected` + auto-refund
- `requestMoreInfoCompliance(id, guideId, notes)` — keeps status as `identity_submitted`, sends message
- `forwardToSenior(id, guideId, notes)` — → `forwarded_senior`
- `approveSenior` / `rejectSenior` — same patterns

### Shared helpers
- `logShareAudit(applicationId, actorId, action, detail?)` — append to audit log
- `recordStatusHistory(applicationId, fromStatus, toStatus, actorId, notes?)` — append to history
- `getIdVerificationTier(countryCode)` — static map
- `getShareStats()` — counts by status
- `getTreasuryTransactions(limit, offset)` — for treasury dashboard
- `createShareMessage(...)` / `getShareMessages(applicationId, visibleToRole)` — role-filtered

### PII encryption helpers (`src/lib/share-crypto.ts`)
- `encryptField(plaintext, key)` → `{iv}:{ciphertext}` (AES-256-GCM)
- `decryptField(encrypted, key)` → plaintext
- Key from `SHARE_IDENTITY_KEY` env var

### Test file: `src/lib/queries/shares.test.ts` — 40+ test cases

**Eligibility:** below threshold, exactly at threshold, above, unverified user fails
**State machine exhaustive:** from each of 10 statuses, attempt every transition → only valid ones succeed
**Race conditions:** concurrent proceed (only one wins), concurrent proceed+decline (one wins), duplicate promotion (one notification)
**Self-review:** guide cannot approve own application
**Payment:** wallet with exactly 10p succeeds, 9p fails, 0p fails, no wallet fails gracefully
**Refund:** rejection triggers refund, withdrawal triggers refund
**PII:** identity fields encrypted on write, decrypted on read, access logged
**Messages:** role-filtered visibility (share guide can't see compliance messages)
**Reapply:** count increments, requires fresh 10p payment

### Files
| File | Action |
|------|--------|
| `src/lib/queries/shares.ts` | Create |
| `src/lib/queries/shares.test.ts` | Create |
| `src/lib/share-crypto.ts` | Create |

---

## Phase 3: API Routes + Tests

### Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/shares` | GET | Cookie | User's share status + eligibility (strips guide IDs/notes) |
| `/api/shares/proceed` | POST | Cookie + rate limit | Pay 10p + apply (`available` → `under_review`) |
| `/api/shares/decline` | POST | Cookie + rate limit | Decline (permanent, no payment) |
| `/api/shares/withdraw` | POST | Cookie + rate limit | Cancel application (refund 10p) |
| `/api/shares/identity` | POST | Cookie + rate limit | Submit/update identity form |
| `/api/shares/reapply` | POST | Cookie + rate limit | Reapply after rejection (another 10p) |
| `/api/shares/access` | POST | Rate limit only | Password gate (env var, user-bound cookie, HMAC) |
| `/api/shares/[id]/review` | POST | Cookie + `share_guide`/`administrator` | Share Guide decision + self-review guard |
| `/api/shares/[id]/compliance` | POST | Cookie + `compliance_guide`/`administrator` | Compliance decision + self-review guard |
| `/api/shares/[id]/senior` | POST | Cookie + `administrator` | Senior Compliance decision |
| `/api/shares/[id]/messages` | GET/POST | Cookie + role check | Role-filtered conversation thread |
| `/api/shares/queue` | GET | Cookie + any guide role | Guide inbox (filtered by role) |
| `/api/shares/treasury` | GET | Cookie + `treasury_guide`/`administrator` | Treasury transaction log |
| `/api/roles/team` | GET/POST/DELETE | Cookie + `administrator` | Team permissions management |

### `GET /api/shares` response (user-facing — no guide internals)
```json
{
  "application": { "id": "...", "status": "not_eligible", "certificate_number": null },
  "eligibility": {
    "eligible": false,
    "riotsJoined": 1, "riotsRequired": 3,
    "actionsTaken": 4, "actionsRequired": 10,
    "isVerified": true
  },
  "walletBalance": 0,
  "paymentRequired": 10
}
```

### Auto-promotion hook (async, fire-and-forget)
After `POST /api/issues/[id]/join`, feed post, evidence upload, etc. — check if user's share status is `not_eligible`, then call `promoteToEligible()` asynchronously. Uses `rowsAffected` guard to prevent duplicate notifications.

### Test file: `src/app/api/shares/shares-api.test.ts` — 35+ test cases

Auth, validation, full lifecycle, payment flow, refund flow, treasury logging, eligibility promotion, role gating, self-review prevention, rate limiting, concurrent requests.

### Files (~15 new)
| File | Action |
|------|--------|
| `src/app/api/shares/route.ts` | Create |
| `src/app/api/shares/proceed/route.ts` | Create |
| `src/app/api/shares/decline/route.ts` | Create |
| `src/app/api/shares/withdraw/route.ts` | Create |
| `src/app/api/shares/identity/route.ts` | Create |
| `src/app/api/shares/reapply/route.ts` | Create |
| `src/app/api/shares/access/route.ts` | Create |
| `src/app/api/shares/[id]/review/route.ts` | Create |
| `src/app/api/shares/[id]/compliance/route.ts` | Create |
| `src/app/api/shares/[id]/senior/route.ts` | Create |
| `src/app/api/shares/[id]/messages/route.ts` | Create |
| `src/app/api/shares/queue/route.ts` | Create |
| `src/app/api/shares/treasury/route.ts` | Create |
| `src/app/api/roles/team/route.ts` | Create |
| `src/app/api/shares/shares-api.test.ts` | Create |

---

## Phase 4: Web UI — Profile Section + Share Pages + Payment Flow

### Profile page — Share section (`share-profile-section.tsx`)
New section after stats grid, before Connected Accounts. Shows status badge, eligibility progress bar, link to Share info page, and certificate info if issued.

### Password gate (hardened)
- `POST /api/shares/access` — validates password from `SHARE_ACCESS_PASSWORD` env var. Sets `qr_share_access` cookie bound to userId via HMAC (`HMAC(userId, SHARE_ACCESS_PASSWORD)`). Cookie path `/share`, httpOnly, 7-day expiry. Rate limited.
- `src/app/[locale]/share/layout.tsx` — server component verifies cookie HMAC against session userId
- `src/components/interactive/share-password-gate.tsx` — client component

### Share info page (`src/app/[locale]/share/page.tsx`)
Server component, `force-dynamic`. Content:

1. **Hero:** "Your Quiet Riots Global Share"
2. **Ownership explanation** — what having a share means
3. **Share consideration section** (`share-consideration-explainer.tsx`) — explains nominal value, growth shares, the 10p payment requirement, what happens at each investment stage from $10m to $1tn, important disclaimers
4. **Value illustration table** (`share-value-table.tsx`)
5. **How investment rounds affect your share** — Seed/A/B/C, dilution, user pool protection
6. **Your responsibilities** — tax obligations, not advice, user's responsibility
7. **Eligibility + action section:**
   - If not eligible: progress towards 3 riots + 10 actions
   - If eligible: three choices with 10p payment flow:
     - **Proceed** → wallet balance check → confirm 10p deduction → status `under_review`
     - **Wait** → no action, come back any time
     - **Decline** → confirmation dialog (permanent) → status `declined`
8. **Country-specific tax guidance** (generic with disclaimer)

### Payment flow in Proceed
1. User clicks "Proceed with Issue"
2. Client checks wallet balance via `GET /api/wallet`
3. If balance ≥ 10p equivalent: show confirmation *"A nominal payment of 10p will be deducted from your wallet. This is a legal requirement."*
4. If balance < 10p: show *"You need at least 10p in your wallet. [Top up now →](/wallet)"* with return link
5. On confirm: `POST /api/shares/proceed` → atomic debit + status change
6. User receives payment confirmation notification + "application under review" notification

### Identity form (`src/app/[locale]/share/identity/page.tsx`)
Accessible when status = `approved`. All fields with Zod validation + `sanitizeText()`:
- Legal first name, middle name, last name (required except middle)
- Date of birth (locale-aware input, validated: in past, age ≥ 18)
- Gender toggle
- Address (line 1 required, line 2 optional, city required, state optional, postal code optional, country required — validated against countries table)
- Phone (E.164 via `normalizePhone()`)
- ID document type + country
- Digital verification tier indicator (computed from country)

### Status page (`src/app/[locale]/share/status/page.tsx`)
Visual timeline. Certificate details if issued. Withdrawal option if `under_review` or `approved`.

### Nav-bar integration
- "My Share" in profile dropdown (both desktop + mobile)
- "Share Guide" link if `share_guide` role
- "Compliance" link if `compliance_guide` role
- "Treasury" link if `treasury_guide` role
- Extend existing `fetchRoles()` to check all new roles

### i18n
Add `Share` namespace to `messages/en.json` with ~90 keys.

### Components
| Component | Path | Type |
|-----------|------|------|
| `share-password-gate.tsx` | `src/components/interactive/` | Client |
| `share-info-page.tsx` | `src/components/interactive/` | Client |
| `share-identity-form.tsx` | `src/components/interactive/` | Client |
| `share-value-table.tsx` | `src/components/data/` | Server |
| `share-status-tracker.tsx` | `src/components/data/` | Server |
| `share-profile-section.tsx` | `src/components/data/` | Client |
| `share-eligibility-progress.tsx` | `src/components/data/` | Server |
| `share-consideration-explainer.tsx` | `src/components/data/` | Server |
| `share-payment-flow.tsx` | `src/components/interactive/` | Client |

### Pages
| Page | Path |
|------|------|
| Share layout (password gate) | `src/app/[locale]/share/layout.tsx` |
| Share info | `src/app/[locale]/share/page.tsx` |
| Identity form | `src/app/[locale]/share/identity/page.tsx` |
| Status tracker | `src/app/[locale]/share/status/page.tsx` |

---

## Phase 5: Guide Dashboards + Treasury + Team Permissions

### Share Guide dashboard (`src/app/[locale]/share-guide/page.tsx`)
- Role-gated (`share_guide` or `administrator`)
- Tab bar: all, under_review, approved, identity_submitted, etc.
- Application cards (user name, country, date, status badge)
- Review form: Approve / Reject / Ask Question to User / Ask Question to Compliance
- Questions inbox: user-submitted questions, sorted by newest
- Message thread per application (only applicant ↔ share_guide messages visible)
- Stale applications view: `approved` for > 7 days without identity submission

### Compliance dashboard (`src/app/[locale]/compliance/page.tsx`)
- Role-gated (`compliance_guide` or `administrator`)
- Shows `identity_submitted` and `forwarded_senior` applications
- Identity detail view with PII access logging — masked in list view, full on expand
- Actions: Approve / Reject / Ask for More Info / Forward to Senior Compliance
- Comment text box
- Message thread (only applicant ↔ compliance messages visible)

### Treasury dashboard (`src/app/[locale]/treasury/page.tsx`)
- Role-gated (`treasury_guide` or `administrator`)
- Treasury wallet balance
- Transaction log: all 10p payments, refunds, with user name, date, application status
- Summary stats: total collected, total refunded, net

### Team permissions page (`src/app/[locale]/admin/team/page.tsx`)
- Role-gated (`administrator` only)
- Lists all users with roles
- Add/remove role buttons with mutual exclusivity enforcement
- Role assignment audit trail

### Components
| Component | Path | Type |
|-----------|------|------|
| `share-guide-dashboard.tsx` | `src/components/interactive/` | Client |
| `compliance-dashboard.tsx` | `src/components/interactive/` | Client |
| `treasury-dashboard.tsx` | `src/components/interactive/` | Client |
| `team-permissions.tsx` | `src/components/interactive/` | Client |
| `share-application-card.tsx` | `src/components/cards/` | Client |
| `share-review-form.tsx` | `src/components/interactive/` | Client |
| `share-identity-detail.tsx` | `src/components/data/` | Server |
| `share-message-thread.tsx` | `src/components/interactive/` | Client |

---

## Phase 6: Bot Surface (WhatsApp)

### Early onboarding mention (first 3 messages)
SKILL.md updated: after first issue search result, bot mentions the share scheme naturally. Saves `share_mentioned: true` to memory. On eligibility met, proactively notifies.

### New bot actions (7)
- `get_share_status` — eligibility + status + link to web page
- `get_share_eligibility` — progress towards thresholds
- `apply_for_share` — pay 10p + apply (validates phone → user_id match)
- `decline_share` — permanent decline
- `submit_share_identity` — conversational identity collection
- `ask_share_question` — sends to Share Guide
- `reapply_share` — after rejection (another 10p)

All bot actions validate `phone → user_id` match (existing pattern) to prevent cross-user manipulation.

### Files
| File | Action |
|------|--------|
| `src/app/api/bot/route.ts` | Modify — add 7 actions |
| `src/app/api/bot/bot-api.test.ts` | Modify — add 15+ tests |
| `~/.openclaw/skills/quiet-riots/SKILL.md` | Modify |

---

## Phase 7: Translations (all 44 non-English locales)

Generate translations for `Share`, `ShareGuide`, `Compliance`, `Treasury`, `Team` namespaces using Claude sub-agents (session 26 pattern). ~90 keys per namespace × 44 locales.

---

## Phase 8: Polish

- PDF certificate generation (pdf-lib → Vercel Blob) — UK share certificate with London address
- Country-specific tax guidance (JSON map per country)
- In-person verification office directory
- PII data retention policy (auto-delete identity data N days after issuance)
- Advanced admin stats dashboard

---

## Commit Plan

```
1. PLAN.md → commit + push
2. Phase 1 (migration + types + schema + crypto) → commit + push
3. Phase 2 (query layer + 40+ tests) → commit + push
4. Phase 3 (API routes + 35+ tests) → commit + push
5. Phase 4 (profile section + share pages + payment flow + nav + i18n) → commit + push
6. Phase 5 (guide dashboards + treasury + team permissions) → commit + push
7. Create PR → CI → merge → post-merge checklist
8. Phase 6 (bot surface) → separate PR
9. Phase 7 (translations for all 44 locales) → separate PR
10. Notify Simon Darling via WhatsApp + email when live on staging + production
```

## Verification

1. `npm test` passes after each phase
2. `npm run build` passes after Phase 4+
3. Profile page shows eligibility progress
4. After 3 issues + 10 actions → status = `available`, user notified
5. `/en/share` → password gate → share info page with consideration explainer
6. Proceed → 10p deducted → `under_review` → payment confirmation notification
7. Share Guide approves → user notified → identity form accessible
8. Identity submitted → Compliance Guide sees it → approves → share issued → certificate notification
9. Rejection → 10p refunded → user can reapply
10. Treasury dashboard shows all payments/refunds
11. Team permissions page shows all roles
12. WhatsApp bot mentions share in first 3 messages
13. All pages work in all 45 locales
14. Simon Darling notified when live

## New env vars needed

| Var | Purpose | Where |
|-----|---------|-------|
| `SHARE_ACCESS_PASSWORD` | Password gate for /share pages | Vercel prod + preview |
| `SHARE_IDENTITY_KEY` | AES-256-GCM key for PII encryption | Vercel prod + preview |

## Key patterns to reuse

| Pattern | Source file |
|---------|------------|
| Role-gated page | `src/app/[locale]/setup/page.tsx` |
| Review dashboard | `src/components/interactive/setup-dashboard.tsx` |
| Review API route | `src/app/api/suggestions/[id]/review/route.ts` |
| Multi-channel notify | `src/lib/queries/messages.ts` → `sendNotification()` |
| Lifecycle queries | `src/lib/queries/suggestions.ts` |
| Atomic wallet debit | `src/app/api/wallet/contribute/route.ts` |
| Zod validation | All POST API routes |
| Rate limiting | `src/lib/rate-limit.ts` |
| Profile dropdown | `src/components/layout/nav-bar.tsx` |
| ID generation | `src/lib/uuid.ts` → `generateId()` |
| Input sanitization | `src/lib/sanitize.ts` |
| User memory (bot) | `src/lib/queries/users.ts` → memory functions |
| Bot onboarding | `~/.openclaw/skills/quiet-riots/SKILL.md` |

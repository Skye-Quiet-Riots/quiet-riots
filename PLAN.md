# Plan: Website Redesign + Hero Images + Follow + Activity Feed + Issue:Org Pages + Nav Search

## Context

Quiet Riots needs a major visual upgrade, new features, and new page types. This plan covers:

1. **Full website redesign** — logo-exact colour palette, hero images, sidebar layout
2. **Follow feature** — users can follow issues without joining (lighter engagement)
3. **Activity newsfeed** — personalised homepage feed of actions/evidence from followed/joined riots
4. **Issue:Organisation intersection pages** — e.g. "Train Cancellations at Northern Rail"
5. **Organisation page redesign** — same layout as issue pages
6. **Global nav search** — search issues, orgs, synonyms from any page
7. **OpenAI hero image pipeline** — DALL-E generation, guide review, backfill
8. **WhatsApp bot integration** — all new features work on both surfaces

---

## Logo Colours (EXACT — extracted from `public/logo-192.png`)

| Colour | Hex | RGB | Usage |
|--------|-----|-----|-------|
| **Logo Blue** | `#188BFF` | (24, 139, 255) | Primary brand accent — links, buttons, logotype, active states |
| **Logo Red** | `#FB0202` | (251, 2, 2) | Secondary accent — notifications, alerts, logo dot |
| **Pivot Blue** | `#2563eb` | (37, 99, 235) | Feature colour — pivot/Pareto tables (replaces purple, same blue family as brand) |

These are NOT standard Tailwind colours. We'll define custom CSS properties and use Tailwind's arbitrary value syntax or extend the theme.

**Use the actual logo file** — `public/logo-192.png` — in the nav bar. Do NOT recreate or approximate it.

**Logotype:** "Quiet Riots" text in nav bar uses `#188BFF` (Logo Blue), `text-xl font-extrabold tracking-tight`.

---

## Nav Bar Design

### Desktop Nav (always visible):
- Logo (`logo-192.png`) + **"Quiet Riots" in blue** (xl, extrabold)
- **Issues** | **Organisations** (only 2 links — Assistants moved to profile dropdown)
- **Search input** — always expanded (`w-56`), not collapsible
- **Language selector** — `<LanguageSelector />` dropdown (shows global reach)
- **Wallet balance** — e.g. `£10.00` — clickable, links to `/wallet`. Currency formatted per user's country using `formatCurrency()` from `src/lib/format.ts`
- **Inbox** icon with red badge count
- **Profile avatar** — dropdown contains: Profile, Wallet (with balance), Assistants, Sign out

### Mobile Nav:
- Logo + logotype (blue)
- Language (compact: "EN"), wallet balance, inbox badge, hamburger menu
- **Search input always visible below** the nav row (full width)
- Hamburger menu contains: Issues, Organisations, Assistants, Profile, Wallet, Sign out

### Mobile Footer Nav (Fixed Bottom Bar)
- Fixed bottom bar on mobile web — always visible, 5 icons
- **Home** (house icon) — homepage with user's activity newsfeed
- **Search** (magnifying glass) — opens search overlay for issues/orgs
- **Take Action** (large central QR logo button) — primary CTA, activates action flow:
  - User selects an issue and/or organisation
  - Options: gather evidence (photo, web link, video), or choose from dropdown list of actions
  - Evidence gathering uses camera/file upload
- **Inbox** (envelope icon with red badge count) — messages/notifications
- **Profile** (user avatar) — profile page
- Central logo button is larger and raised (floating action button style)
- Uses `safe-area-inset-bottom` for iOS notch devices
- Hides on scroll down, shows on scroll up (optional UX improvement)
- Component: `src/components/layout/mobile-footer-nav.tsx`

### Wallet Balance Display
- Uses `formatCurrency(balance_pence, currencyCode, locale)` from `src/lib/format.ts`
- Currency determined by user's `country_code` → `countries.currency_code` lookup
- Examples: 🇬🇧 £10.00 | 🇺🇸 $10.00 | 🇫🇷 10,00 € | 🇯🇵 ¥1,000 | 🇮🇳 ₹850.00 | 🇧🇷 R$ 55,00
- Handles zero-decimal currencies (JPY, KRW, VND) and three-decimal currencies (BHD, KWD, OMR)

### Pivot/Pareto Table Colour
- **Replace purple with blue** across all pivot/Pareto components
- Purple felt dated and clashed with blue brand; blue creates a cohesive single-brand-colour experience
- Blue shades: border `blue-200`, bg `blue-50/30`, heading text `blue-700`, progress bars `blue-500/blue-100`
- Uses slightly different blue shade (`blue-600` / `#2563eb`) from logo blue (`#188BFF`) so pivot tables have subtle distinction while staying in the same family
- Files: `src/components/interactive/pivot-toggle.tsx`, `src/components/data/pivot-table.tsx`

---

## New Feature: Follow

### Database

New table `user_follows`:
```sql
CREATE TABLE IF NOT EXISTS user_follows (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  followed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, issue_id)
);
```

Add to `issues` table:
```sql
ALTER TABLE issues ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0 CHECK(follower_count >= 0);
```

### Behaviour

- **Follow** = lightweight — user gets the issue in their newsfeed but isn't counted as a rioter
- **Join** = full commitment — user is counted as a rioter AND automatically followed
- When a user **Joins**, the follow button animates to show "Following ✓" (auto-follow)
- When a user **Unfollows**, they are NOT removed from joined — those are independent actions
- When a user **Leaves** (un-joins), they stay as a follower unless they explicitly unfollow
- Follower count shown separately from rioter count in stats

### UI (Issue Detail Page)

Two buttons side by side:
```
[ ✊ Join This Quiet Riot ]  [ 👁 Follow ]
```

When user clicks **Join**:
1. Join button changes to "✊ Joined ✓" (filled brand blue)
2. Follow button animates: briefly shows "Auto-followed! ✓" then settles to "👁 Following ✓"
3. Both stay in "active" state

When user clicks **Follow** (without joining):
1. Follow button changes to "👁 Following ✓"
2. Join button stays as "Join This Quiet Riot" (unchanged)

### API

- `POST /api/issues/[id]/follow` — follow/unfollow toggle (session auth)
- `POST /api/issues/[id]/join` — existing endpoint, now also auto-follows
- New queries: `followIssue()`, `unfollowIssue()`, `hasFollowedIssue()`, `getUserFollowedIssues()`

### WhatsApp Bot

- New action: `follow_issue` — follow without joining
- Modified `join_issue` — auto-follows when joining
- New action: `get_followed_issues` — list followed issues
- Activity feed accessible via `get_my_feed` action

---

## New Feature: Activity Newsfeed (Homepage)

### Concept

When a logged-in user visits the homepage, below the hero and trending section, they see a **personalised activity feed** of everything happening in their followed/joined riots.

### Feed Items (from existing tables)

Each feed item shows: **who** did **what** about **which issue** at **which org** (if applicable), **when**, with the actual content (text, photos, videos), and comment/like/share actions.

Sources:
1. **Evidence** — "James Smith gathered evidence about Cancelled Flights at American Airlines" + photos/videos/text
2. **Feed posts** — "Sarah Jones posted in Cancelled Flights community" + content
3. **Reel submissions** — "Anna Kjovik added a Riot Reel about Train Cancellations at Southern Rail in the 🇬🇧 United Kingdom" + YouTube video preview embed (thumbnail, play button, duration badge, "🎬 Riot Reel" tag)
4. **Joins** — "12 people joined Cancelled Flights this week" (aggregated)

### Database

New table `activity_feed` (materialised view pattern):
```sql
CREATE TABLE IF NOT EXISTS activity_feed (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  activity_type TEXT NOT NULL CHECK(activity_type IN ('evidence', 'feed_post', 'reel', 'join_milestone')),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  org_id TEXT REFERENCES organisations(id),
  user_id TEXT REFERENCES users(id),
  source_id TEXT NOT NULL,
  summary TEXT NOT NULL CHECK(length(summary) <= 500),
  content TEXT CHECK(length(content) <= 5000),
  media_type TEXT DEFAULT 'text' CHECK(media_type IN ('text','photo','video','link')),
  photo_urls TEXT DEFAULT '[]',
  video_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_activity_feed_issue ON activity_feed(issue_id, created_at DESC);
CREATE INDEX idx_activity_feed_created ON activity_feed(created_at DESC);
```

### Query Pattern

```sql
SELECT af.*, i.name as issue_name, i.category, o.name as org_name, u.name as user_name
FROM activity_feed af
JOIN issues i ON af.issue_id = i.id
LEFT JOIN organisations o ON af.org_id = o.id
LEFT JOIN users u ON af.user_id = u.id
WHERE af.issue_id IN (
  SELECT issue_id FROM user_issues WHERE user_id = ?
  UNION
  SELECT issue_id FROM user_follows WHERE user_id = ?
)
ORDER BY af.created_at DESC
LIMIT ? OFFSET ?
```

### Writing to Activity Feed

When evidence/feed/reel is created, also INSERT into `activity_feed`.

### UI Component

`src/components/interactive/activity-feed.tsx` — client component with:
- Infinite scroll / "Load more" pagination
- Each card: user avatar + name + action verb + issue link + org link + timestamp
- Content (text, expandable), media (photos/video), engagement bar (like, comment, share)
- 1 comment expanded, "View N more" for rest

### Seed Data

Seed 30+ activity feed entries across multiple issues and users for all 56 locales.

### WhatsApp Bot

- New action: `get_my_feed` — returns latest 5 activity items

---

## New Feature: Issue:Organisation Intersection Pages

### Concept

New page at `/[locale]/issues/[issueId]/at/[orgId]` — intersection of issue and org.
Example: "Train Cancellations at Northern Rail"

### Page Layout (same as Issue page)

- Hero image (issue hero, org logo overlay)
- Title: "{Issue Name} at {Org Name}"
- Stats (filtered): intersection-specific rioter count
- Section nav pills
- Main content: only evidence/feed/actions related to this specific org+issue
- Sidebar: org details, community health, experts

### Database Changes

Add optional `org_id` to feed table:
```sql
ALTER TABLE feed ADD COLUMN org_id TEXT REFERENCES organisations(id) DEFAULT NULL;
```

### Navigation

- From issue pivot table: clicking org → intersection page
- From org page: clicking issue → intersection page
- Intersection page has links to both full issue and full org pages

### WhatsApp Bot

- New action: `get_issue_at_org`

---

## Redesigned Organisation Page

Same layout as issue page: hero, sidebar, section nav. Issues list replaces pivot toggle (clickable → intersection pages). Evidence section (org-wide). Community section.

---

## Redesigned Pivot Table

- **Issue pages:** Remove toggle. Show orgs only. Clickable rows → intersection pages.
- **Org pages:** Remove toggle. Show issues only. Clickable rows → intersection pages.
- Keep purple styling as feature identity.

---

## Global Nav Search

Search input in nav bar. Desktop: expandable. Mobile: overlay. Searches issues + orgs + synonyms. Dropdown results panel. New `GET /api/search` endpoint.

---

## Other UI Changes

- Use actual `logo-192.png` in nav (NOT a CSS approximation)
- "First Rioter" → **"Founding Quiet Rioter"**
- Community Health: clickable → Community section
- Countries "View all" → Community section
- Evidence feed at bottom of issue overview → "View more" → Evidence section
- **Logotype in blue** (`#188BFF`), larger (`text-xl font-extrabold`)
- **Assistants removed from nav** — moved to profile dropdown (Profile, Wallet, Assistants, Sign out)
- **Wallet balance in nav** — clickable → wallet page, formatted per user's country currency
- **Language selector in nav** — `<LanguageSelector />` (shows global reach)
- **Search always expanded** on desktop, always visible at top on mobile
- **Purple → Blue** for pivot/Pareto tables (`#2563eb` — cohesive single-brand-colour, same family as logo blue)
- **Riot Reels in activity feed** — YouTube video preview with play button, duration badge, "🎬 Riot Reel" tag

---

## Phase Plan

### Phase 0: Database Migrations + Types
### Phase 1: Colour Palette + Logo
### Phase 2: Nav Bar + Footer + Global Search
### Phase 3: Follow Feature
### Phase 4: Activity Newsfeed
### Phase 5: Hero Image Component + Issue Page Redesign
### Phase 6: Issue:Org Intersection Pages
### Phase 7: Organisation Page Redesign
### Phase 8: OpenAI Image Generation Pipeline
### Phase 9: Approval Flow Integration
### Phase 10: Backfill Existing Entities
### Phase 11: Browse Pages + Card Redesign
### Phase 12: Homepage + All Remaining Pages
### Phase 13: i18n for All New UI Text

---

## WhatsApp Bot New Actions

| Action | Description |
|--------|-------------|
| `follow_issue` | Follow an issue |
| `get_followed_issues` | List followed issues |
| `get_my_feed` | Personalised activity feed |
| `get_issue_at_org` | Intersection detail |
| `search_all` | Search issues + organisations |

Enhanced: `join_issue` (auto-follows), `get_organisation` (evidence/community)

---

## New Feature: Deploy a Chicken 🐔

### Concept

A paid action where users pay ~$50 (in their local currency) from their Quiet Riots wallet for a human in a chicken costume to physically deliver a personal handwritten note to the CEO/chief executive of the organisation they are quiet rioting about. The chicken deployment is filmed and uploaded as a Riot Reel.

**Example:** A chicken delivered a note to the chief executive of BT — see https://youtu.be/r1oZ_HZDOJ8

This is a premium action initiative that works on both web and WhatsApp.

### Database Schema

#### New table: `chicken_deployments`

```sql
CREATE TABLE IF NOT EXISTS chicken_deployments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Who ordered it
  user_id TEXT NOT NULL REFERENCES users(id),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  org_id TEXT NOT NULL REFERENCES organisations(id),

  -- Payment
  wallet_transaction_id TEXT REFERENCES wallet_transactions(id),
  amount_pence INTEGER NOT NULL CHECK(amount_pence > 0),
  currency_code TEXT NOT NULL DEFAULT 'GBP' CHECK(length(currency_code) = 3),
  service_fee_pence INTEGER NOT NULL DEFAULT 0 CHECK(service_fee_pence >= 0),

  -- The note
  note_to_ceo TEXT NOT NULL CHECK(length(note_to_ceo) >= 10 AND length(note_to_ceo) <= 1000),
  note_language TEXT NOT NULL DEFAULT 'en',

  -- Delivery details
  target_name TEXT CHECK(length(target_name) <= 200),
  target_title TEXT CHECK(length(target_title) <= 200),
  delivery_address TEXT CHECK(length(delivery_address) <= 500),
  delivery_country_code TEXT CHECK(length(delivery_country_code) = 2),

  -- Fulfilment status
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK(status IN (
    'pending_payment',
    'paid',
    'accepted',
    'in_progress',
    'delivered',
    'delivery_failed',
    'refunded',
    'cancelled'
  )),

  -- Fulfilment tracking
  accepted_at TEXT,
  accepted_by TEXT REFERENCES users(id),
  delivery_scheduled_at TEXT,
  delivered_at TEXT,
  delivery_notes TEXT CHECK(length(delivery_notes) <= 2000),
  delivery_photo_urls TEXT DEFAULT '[]',
  delivery_video_url TEXT,
  reel_id TEXT REFERENCES riot_reels(id),

  -- Failure/refund
  failure_reason TEXT CHECK(length(failure_reason) <= 500),
  refunded_at TEXT,
  refund_transaction_id TEXT REFERENCES wallet_transactions(id),

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_chicken_user ON chicken_deployments(user_id, created_at DESC);
CREATE INDEX idx_chicken_issue ON chicken_deployments(issue_id, status);
CREATE INDEX idx_chicken_org ON chicken_deployments(org_id, status);
CREATE INDEX idx_chicken_status ON chicken_deployments(status, created_at DESC);
CREATE INDEX idx_chicken_fulfilment ON chicken_deployments(status, delivery_country_code)
  WHERE status IN ('paid', 'accepted', 'in_progress');
```

#### New table: `chicken_pricing`

```sql
CREATE TABLE IF NOT EXISTS chicken_pricing (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  country_code TEXT NOT NULL CHECK(length(country_code) = 2),
  currency_code TEXT NOT NULL CHECK(length(currency_code) = 3),
  price_pence INTEGER NOT NULL CHECK(price_pence > 0),
  service_fee_pct INTEGER NOT NULL DEFAULT 15 CHECK(service_fee_pct >= 0 AND service_fee_pct <= 50),
  is_available INTEGER NOT NULL DEFAULT 1,
  min_lead_days INTEGER NOT NULL DEFAULT 7 CHECK(min_lead_days >= 1),
  max_lead_days INTEGER NOT NULL DEFAULT 30 CHECK(max_lead_days >= min_lead_days),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(country_code)
);

CREATE INDEX idx_chicken_pricing_available ON chicken_pricing(is_available, country_code);
```

#### New table: `chicken_fulfillers`

```sql
CREATE TABLE IF NOT EXISTS chicken_fulfillers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  country_code TEXT NOT NULL CHECK(length(country_code) = 2),
  city TEXT CHECK(length(city) <= 100),
  max_travel_km INTEGER NOT NULL DEFAULT 50 CHECK(max_travel_km > 0),
  is_active INTEGER NOT NULL DEFAULT 1,
  completed_count INTEGER NOT NULL DEFAULT 0 CHECK(completed_count >= 0),
  rating_sum INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  bio TEXT CHECK(length(bio) <= 500),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX idx_chicken_fulfillers_active ON chicken_fulfillers(is_active, country_code);
```

### Pricing Architecture

- **Base price:** ~$50 USD equivalent per country in local currency
- **Stored in `chicken_pricing` table** — one row per country with local currency price
- **Service fee:** 15% default (configurable per country via `service_fee_pct`)
- **Seed all 249 countries** from `countries` table with appropriate local currency prices
- **Price calculation:** Use `countries.currency_code` to look up `chicken_pricing.price_pence`
- **Zero-decimal currencies** (JPY, KRW, VND): price stored as whole units (e.g., ¥7500)
- **Three-decimal currencies** (BHD, KWD, OMR): price stored in millis (e.g., 19.000 BHD = 19000)
- **Availability flag:** `is_available` — markets can be turned on/off as fulfillers are recruited
- **Display:** Uses existing `formatCurrency(price_pence, currency_code, locale)` from `src/lib/format.ts`

### Status Flow

```
pending_payment → paid → accepted → in_progress → delivered
                    ↘ cancelled       ↘ delivery_failed → refunded
                                       ↘ refunded
```

- **pending_payment** — Order created, awaiting wallet payment
- **paid** — Payment taken from wallet, awaiting fulfiller acceptance
- **accepted** — A fulfiller has claimed the order
- **in_progress** — Fulfiller is preparing/en route to deliver
- **delivered** — Note delivered, photo/video evidence uploaded
- **delivery_failed** — Fulfiller couldn't deliver (CEO unavailable, security, etc.)
- **refunded** — Payment returned to user's wallet (after failure or cancellation)
- **cancelled** — User cancelled before acceptance

### Refund Policy

- **Before acceptance:** Full refund, instant (minus no fee)
- **After acceptance, before delivery:** 85% refund (15% retained as admin fee)
- **After delivery_failed:** Full refund
- **After delivered:** No refund

### API Endpoints

#### `POST /api/chicken/order` — Create a chicken deployment order
```typescript
// Auth: session cookie (web) or bot auth (WhatsApp)
// Body: { issue_id, org_id, note_to_ceo, target_name?, target_title? }
// Returns: { order, pricing }
// Rate limit: 1 per minute per user
```

#### `POST /api/chicken/order/[id]/pay` — Pay for the order
```typescript
// Auth: session cookie
// Uses existing createPayment() wallet infrastructure
// Atomically: debit wallet + record transaction + update order status to 'paid'
// Returns: { order, transaction, wallet_balance_pence }
```

#### `GET /api/chicken/order/[id]` — Get order details
```typescript
// Auth: session cookie (must be order owner or admin)
// Returns: { order, issue, org, pricing }
```

#### `GET /api/chicken/orders` — List user's chicken orders
```typescript
// Auth: session cookie
// Query: ?status=paid&limit=20&offset=0
// Returns: { orders[], total }
```

#### `POST /api/chicken/order/[id]/accept` — Fulfiller accepts order
```typescript
// Auth: session cookie (must be active fulfiller)
// Body: { delivery_scheduled_at }
// Returns: { order }
```

#### `POST /api/chicken/order/[id]/deliver` — Mark as delivered
```typescript
// Auth: session cookie (must be assigned fulfiller)
// Body: { delivery_notes, delivery_photo_urls, delivery_video_url?, reel_id? }
// Returns: { order }
```

#### `POST /api/chicken/order/[id]/cancel` — Cancel order
```typescript
// Auth: session cookie (order owner)
// Only allowed in: pending_payment, paid (before acceptance)
// Auto-refunds if paid
```

#### `GET /api/chicken/pricing` — Get pricing for user's country
```typescript
// Auth: none (public, cached)
// Query: ?country_code=GB
// Returns: { price_pence, currency_code, is_available, min_lead_days, max_lead_days }
```

### Web UI

#### Issue Detail Page — New Action Card
- Appears in the Actions section alongside existing actions
- Card design:
  ```
  🐔 Deploy a Chicken
  Have a message hand-delivered to [Org CEO] by someone in a chicken costume.
  [Example video thumbnail with play button]
  Price: £38.50 (or local currency)
  [Deploy a Chicken →]
  ```
- Clicking opens a modal/page with:
  1. Example video embed (YouTube: r1oZ_HZDOJ8)
  2. "Write your note" textarea (10-1000 chars)
  3. Optional: CEO name, title (pre-filled from org data if available)
  4. Price display in user's currency
  5. Wallet balance display
  6. "Pay & Deploy 🐔" button
  7. "Not enough funds? Top up your wallet →" link

#### Wallet Transaction History
- Shows chicken deployments as: "🐔 Deploy a Chicken — [Issue] at [Org]"

#### New Page: `/[locale]/chicken/[id]` — Order Tracking
- Status timeline (like a delivery tracker)
- Note preview
- Delivery photo/video when available
- Link to Riot Reel once uploaded

### WhatsApp Bot

#### New action: `deploy_chicken`
```json
{
  "action": "deploy_chicken",
  "params": {
    "phone": "+441234567890",
    "issue_id": "...",
    "org_id": "...",
    "note_to_ceo": "Dear CEO, ..."
  }
}
```
- Response includes: order details, price in user's currency, payment confirmation
- Sends chicken costume photo (from Vercel Blob) + example YouTube link
- After delivery: sends delivery photo + video link via WhatsApp notification

#### New action: `get_chicken_orders`
- Lists user's chicken deployment orders with status

#### New action: `get_chicken_pricing`
- Returns price for user's country

#### Enhanced: `pay` action
- Can now pay for chicken deployments via `wallet_transaction_id` linking

### Seed Data

#### `chicken_pricing` — seed all countries
```typescript
// For each of the 249 countries in the countries table:
// 1. Look up currency_code from countries table
// 2. Convert $50 USD equivalent to local currency
// 3. Round to a "nice" price point (e.g., £38.50, €45.00, ¥7,500)
// 4. Set is_available = 1 for major markets (US, UK, EU, AU, etc.)
// 5. Set is_available = 0 for markets without fulfillers yet
// 6. Set min_lead_days based on market maturity
```

#### `chicken_deployments` — seed example orders
- 5 example deployments across different countries/statuses for demo
- 1 completed with delivery photo/video (the BT example)
- 1 in_progress
- 1 paid (awaiting acceptance)
- 1 delivered with Riot Reel linked
- 1 refunded (delivery_failed)

### i18n

All user-facing strings through `messages/*.json`:
- "Deploy a Chicken"
- "Have a message hand-delivered to the CEO by someone in a chicken costume"
- "Write your note to the CEO"
- "Pay & Deploy"
- "Your chicken is on its way!"
- "Delivery scheduled for {date}"
- "Your note was delivered!"
- Status labels: "Pending Payment", "Paid", "Accepted", "In Progress", "Delivered", etc.
- Error messages: "Insufficient funds", "Not available in your country", etc.

### Security

- **Note content moderation:** Basic profanity/threat filter before submission
- **Rate limiting:** 1 order per minute per user, 5 orders per day per user
- **Payment validation:** Atomic wallet debit (existing `db.batch()` pattern)
- **Fulfiller verification:** Only approved fulfillers can accept orders
- **Photo/video validation:** Same upload pipeline as evidence (4MB limit, Vercel Blob)
- **Privacy:** CEO name/address only visible to fulfiller after acceptance
- **Refund atomicity:** Refund uses same `db.batch()` pattern (credit wallet + update order status)

### Files

| File | Purpose |
|------|---------|
| `migrations/030_chicken_deployments.sql` | Create tables + indexes |
| `src/types/index.ts` | ChickenDeployment, ChickenPricing, ChickenFulfiller types |
| `src/lib/queries/chicken.ts` | All chicken queries |
| `src/lib/queries/chicken.test.ts` | Tests |
| `src/app/api/chicken/order/route.ts` | Create order |
| `src/app/api/chicken/order/[id]/route.ts` | Get order |
| `src/app/api/chicken/order/[id]/pay/route.ts` | Pay for order |
| `src/app/api/chicken/order/[id]/accept/route.ts` | Fulfiller accept |
| `src/app/api/chicken/order/[id]/deliver/route.ts` | Mark delivered |
| `src/app/api/chicken/order/[id]/cancel/route.ts` | Cancel/refund |
| `src/app/api/chicken/orders/route.ts` | List user orders |
| `src/app/api/chicken/pricing/route.ts` | Get pricing |
| `src/app/[locale]/chicken/[id]/page.tsx` | Order tracking page |
| `src/components/interactive/chicken-order-form.tsx` | Order form component |
| `src/components/cards/chicken-order-card.tsx` | Order status card |
| `src/components/cards/chicken-action-card.tsx` | Action card on issue page |
| `src/lib/seed-chicken-pricing.ts` | Seed pricing for all countries |
| `src/lib/seed.ts` | Add example deployments |
| `scripts/seed-chicken-pricing.ts` | Pricing seed script |

---

## Deploy a Chicken — Senior Reviews & Mitigations

### Senior Engineer Review — Key Findings

1. **Merge order+pay into one atomic call (HIGH):** Two-step create→pay leaves orphaned `pending_payment` rows. **Fix:** Single `POST /api/chicken/order` that atomically validates, debits wallet, creates order in `paid` status via `db.batch()`. Remove `pending_payment` status.

2. **Add timeout/SLA enforcement (CRITICAL):** No mechanism to prevent orders sitting indefinitely with money locked. **Fix:** Add `expires_at` column (set to `NOW + max_lead_days`). Polling script (matching OTP/message delivery pattern) auto-cancels expired orders with full refund. Add `delivery_deadline_at` set on acceptance.

3. **Fulfiller verification (HIGH):** No verification mechanism — anyone could accept orders and see delivery PII. **Fix:** Add `verified_at`/`verified_by` columns. Only verified fulfillers can accept. Require delivery photo proof before `deliver` transition. Add `POST /api/chicken/order/{id}/rate` for user ratings.

4. **Content moderation on notes (HIGH):** Legal liability for physically delivering threatening/hateful messages. **Fix:** AI moderation check at order creation. Add `moderation_status` (approved/rejected/flagged_for_review). Hold flagged orders in `pending_review` until human approves.

5. **Race condition on fulfiller acceptance (MEDIUM):** Two fulfillers accepting simultaneously. **Fix:** Atomic `UPDATE ... WHERE status = 'paid' RETURNING id` — check `rowsAffected === 1`, return 409 if 0.

6. **Missing fulfiller bot actions (MEDIUM):** Plan is demand-side only. **Fix:** Add `get_available_chicken_orders`, `accept_chicken_order`, `complete_chicken_delivery` bot actions + web fulfiller dashboard.

7. **Dispute resolution (MEDIUM):** Binary delivered/failed insufficient. **Fix:** Add `disputed` status reachable from `delivered`, `dispute_reason` column, `POST /api/chicken/order/{id}/dispute` endpoint. Manual admin resolution.

8. **Delivery address is PII (HIGH):** Plaintext address storage. **Fix:** Application-level encryption, only decrypt for accepted fulfiller. Redact in API responses. Auto-null after delivery.

### Senior Database Engineer Review — Key Findings

1. **Remove DEFAULT 'GBP' on currency_code (MEDIUM):** Silent corruption for non-UK deployments. **Fix:** Make column required with no default.

2. **Add FK references on country codes (MEDIUM):** Freeform 2-char TEXT allows invalid codes. **Fix:** `REFERENCES countries(code)` on all country_code columns.

3. **price_pence naming convention (HIGH):** Misleading for non-GBP currencies (JPY has no minor units). **Fix:** Keep as `price_pence` for codebase consistency (existing convention), document clearly.

4. **JSON validation on photo URLs (MEDIUM):** No CHECK prevents invalid JSON. **Fix:** Add `CHECK(json_valid(delivery_photo_urls))`.

5. **No updated_at trigger (MEDIUM):** SQLite has no `ON UPDATE CURRENT_TIMESTAMP`. **Fix:** Application-level, matching existing codebase pattern.

6. **Add fulfiller_id FK (MEDIUM):** `accepted_by` references users, not fulfillers. **Fix:** Add `fulfiller_id TEXT REFERENCES chicken_fulfillers(id)` for direct FK.

7. **Add cancellation columns (LOW):** Missing `cancelled_at`, `cancellation_reason`. **Fix:** Add to schema.

8. **Cross-column CHECK on ratings (LOW):** `rating_sum > 0, rating_count = 0` is possible. **Fix:** Add `CHECK(rating_count > 0 OR rating_sum = 0)`.

### Senior Designer Review — Key Findings

1. **Trust gap at payment (CRITICAL):** $50 for a stranger in a chicken costume needs massive trust scaffolding. **Fix:** Add "How it works" accordion, delivery guarantee with refund policy visible above Pay button, delivery count ("47 chickens deployed"), testimonials, local courier photo.

2. **Price shock without anchoring (CRITICAL):** Free actions alongside $50 creates sticker shock. **Fix:** Visually separate Deploy a Chicken from free actions (own section, different card style). Frame price as package. Consider group-funding split.

3. **Order flow cold start (HIGH):** Video-first flow adds friction. **Fix:** Lead with emotional hook + note textarea. Video as optional "See a real delivery" thumbnail. Single scrollable page, not multi-step.

4. **Passive post-purchase (HIGH):** Static tracking page is emotionally flat. **Fix:** Celebratory confirmation with share card. Countdown timer. WhatsApp push at each status change. Delivery reveal as centrepiece moment. Prompt user reaction to feed.

5. **WhatsApp ordering friction (HIGH):** Form-filling via numbered choices is poor fit. **Fix:** Use WhatsApp for discovery + handoff via deep link to web order page. Bot handles reveal after delivery.

6. **Geographic availability (HIGH):** Users in uncovered cities hit dead end after writing note. **Fix:** Show availability upfront on action card. "Not yet available" with waitlist. Organisation HQ location is the delivery target, not user location.

7. **Social proof (MEDIUM):** No "Chicken Hall of Fame" for past deliveries. **Fix:** Past deployment cards showing org, photo, views. "Chicken Deployer" profile badge. Organisation-level counter. Shareable cards for social media.

8. **Don't add to global footer nav (LOW):** Paid feature shouldn't have equal weight with core actions. **Fix:** Keep in issue detail page Actions section only. Promotional banner on home for launch.

### Consolidated Action Items (Incorporated Into Plan)

All HIGH/CRITICAL items from all three reviews are incorporated:
- Single atomic order+pay call (no `pending_payment` status)
- Timeout/SLA with `expires_at` + `delivery_deadline_at`
- Content moderation with `moderation_status`
- Fulfiller verification with `verified_at`
- Fulfiller bot actions and dashboard
- Trust scaffolding in UI (How it works, guarantee, social proof)
- Visual separation from free actions
- Note-first order flow (not video-first)
- Geographic availability checking upfront
- Dispute resolution flow

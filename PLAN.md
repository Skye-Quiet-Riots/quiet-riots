# Plan: Website Redesign + Deploy a Chicken

## Overview

Two major features being implemented across multiple PRs:

### Feature 1: Website Redesign (10 phases) — COMPLETE

Full visual upgrade: purple→blue colour palette, hero images with DALL-E generation, modernised nav/footer, card thumbnails, and homepage redesign.

- [x] Phase 0: DB migration + types (PR #163)
- [x] Phase 1: Colour palette (PR #164)
- [x] Phase 2: Nav + footer (PR #165)
- [x] Phase 6: OpenAI pipeline (PR #166)
- [x] Phase 3: Hero component + detail pages (PR #167)
- [x] Phase 4: Browse pages + cards (PR #168)
- [x] Phase 7: Approval flow + image generation (PR #169)
- [x] Phase 5: Homepage + remaining pages (PR #170)
- [ ] Phase 8: Backfill existing entities — see details below
- [x] Phase 9: i18n (all keys translated during each phase, no separate PR needed)

### Phase 8: Hero Image Backfill (IN PROGRESS)

**Problem:** Existing entities created before Phase 7 have no hero images — they show fallback placeholder styling.

**Script:** `scripts/backfill-hero-images.ts`
- Query `issues` and `organisations` where `hero_image_url IS NULL` and `status = 'active'`
- For each entity, call `generateHeroImage()` from `src/lib/image-generation.ts`
- Handle OpenAI rate limits with delays between requests
- Support flags: `--dry-run`, `--limit N`, `--entity-type issue|organisation`, `--delay-ms N`
- Use `printDbBanner()` from `scripts/db-safety.ts`
- Log progress: entity name, success/fail, running totals
- Print summary at end: total processed, succeeded, failed, skipped

**Cost:** ~49 issues + ~18 orgs = ~67 entities × $0.19/image ≈ $13

**Dependencies:** `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`

**Execution order:**
1. Write script + tests → commit + push → PR → merge
2. Run against staging (via `with-staging-env.sh`) — verify images appear
3. Run against production — verify on production site

### Feature 2: Deploy a Chicken

Paid action: ~£50 for a chicken-costumed person to deliver a handwritten note to a CEO.

#### Database Schema

**`chicken_pricing`** — Regional pricing tiers
- id, country_code, currency, base_price_pence, distance_surcharge_pence, express_surcharge_pence, description, active, created_at

**`chicken_deployments`** — Individual chicken deployments
- id, user_id, issue_id, organisation_id
- target_name, target_role, target_address, target_city, target_country
- message_text (handwritten note content, max 500 chars)
- status: paid → accepted → in_progress → delivered (or cancelled/refunded/disputed)
- pricing_id, amount_paid_pence, currency
- express_delivery (boolean), estimated_delivery_date
- fulfiller_id, fulfiller_notes, proof_photo_url
- wallet_transaction_id (links to wallet payment)
- created_at, updated_at, delivered_at, cancelled_at

**`chicken_fulfillers`** — People in chicken costumes
- id, name, email, phone, city, country_code, radius_km, active, rating, deployments_completed, created_at

#### Status Flow
```
paid → accepted → in_progress → delivered
  ↓                    ↓
cancelled          disputed → refunded
```

#### API Endpoints
- `GET /api/chicken/pricing` — Get pricing for user's country
- `POST /api/chicken/deploy` — Create deployment (authenticated, pays from wallet)
- `GET /api/chicken/deployments` — User's deployments
- `GET /api/chicken/deployments/[id]` — Deployment detail + status
- `POST /api/chicken/deployments/[id]/cancel` — Cancel (if still pending)
- `POST /api/chicken/deployments/[id]/status` — Update status (bot auth, fulfiller)
- `POST /api/chicken/deployments/[id]/proof` — Upload proof photo (bot auth)

#### Web UI
- `/issues/[id]` — "Deploy a Chicken" action card in actions section
- `/chicken/order?issue=X&org=Y` — Order form (target details, message, pricing)
- `/chicken/[id]` — Tracking page (status timeline, proof photo)
- `/wallet` — Shows chicken deployments in transaction history

#### WhatsApp Bot Actions
- `deploy_chicken` — Start deployment flow
- `check_chicken_status` — Check deployment status
- `cancel_chicken` — Cancel pending deployment

#### Seed Data
- UK pricing: £50 base, £10 distance surcharge, £25 express
- US pricing: $65 base, $15 distance, $30 express
- EU pricing: €55 base, €12 distance, €28 express
- 3 demo fulfillers (London, NYC, Berlin)
- 2 demo deployments (one delivered, one in progress)

#### Implementation Order
1. Database migration + types
2. API endpoints (pricing, deploy, status)
3. Web UI (order form, tracking page, action card)
4. WhatsApp bot actions
5. Seed data + pricing
6. i18n translations (55 locales)

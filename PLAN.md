# Plan: Stripe Display Text Compliance — "support" → "commission/participant"

## Problem

Session 53 renamed i18n **key names** for Stripe compliance, but the **display text values** still use Stripe-prohibited "support/supporter" language. Additionally, production DB has stale action initiative descriptions with "Crowdfund" (seed was fixed in session 50, but production was never updated).

## Two Categories of Non-Compliant Content

### 1. i18n display text values (messages/*.json + pay-form.tsx)

| Key | Current Value | New Value |
|-----|--------------|-----------|
| `Pay.supportProject` | "Support This Project" | "Commission This Service" |
| `Pay.toKeepSupporting` | "to keep supporting action projects." | "to keep commissioning services." |
| `Pay.toSupport` | "to support projects." | "to commission services." |
| `ActionInitiativeDetail.wantToSupport` | "Want to support this project?" | "Want to commission this service?" |
| `ActionInitiativeDetail.completedMessage` | "...supporters!" | "...participants!" |
| `ActionInitiativeDetail.backers` | "supporter(s)" | "participant(s)" |
| `Cards.backers` | "supporter(s)" | "participant(s)" |
| `ActionInitiativeProgress.backers` | "supporter(s)" | "participant(s)" |
| `pay-form.tsx` AuthGate | "support this action project" | "commission this service" |

### 2. Production DB action_initiatives.description

| Title | Old Description | New Description |
|-------|----------------|-----------------|
| (water testing) | "Crowdfund portable water testing kits..." | "Purchase portable water testing kits..." |
| (broadband) | "Fund development of a community broadband..." | "Commission development of a community broadband..." |
| (FOI requests) | "Crowdfund Freedom of Information requests..." | "Commission Freedom of Information requests..." |

## Phases

### Phase 1: PLAN.md → commit + push
Save this plan, commit, push.

### Phase 2: Fix English source (messages/en.json + pay-form.tsx)
- Update all 8 keys in `messages/en.json`
- Update AuthGate action text in `pay-form.tsx`
- Commit + push

### Phase 3: Create SQL migration 027
- `migrations/027_fix_stripe_descriptions.sql`
- UPDATE action_initiatives SET description = ... WHERE title LIKE '%...'
- DELETE stale translations for these descriptions (they'll fall back to English until regenerated)
- Commit + push

### Phase 4: Update test assertions
- Any test that asserts on "supporter" text → "participant"
- Commit + push

### Phase 5: Translate 44 locales (6 parallel agents)
- Batch 1: ar, bg, bn, ca, cs, da, de, el
- Batch 2: es, eu, fa, fi, fr, gl, he, hi
- Batch 3: hr, hu, id, it, ja, ko, ml, ms
- Batch 4: nl, no, pl, pt, pt-BR, ro, ru, sk
- Batch 5: sl, sv, sw, ta, te, th, tl, tr
- Batch 6: uk, vi, zh-CN, zh-TW
- Commit + push

### Phase 6: Validate + test + build
- Validate all 45 JSON files
- `npm test`
- `npm run build`

### Phase 7: Create PR + merge + post-merge checklist
- Run migration on staging + production
- Verify health check
- Commit session docs

## Files Changed (~50)
- `CLAUDE.md` (mandatory plan rule)
- `PLAN.md` (this file)
- `messages/en.json` (8 key values)
- `messages/*.json` (44 locale files, same 8 keys)
- `src/components/interactive/pay-form.tsx` (AuthGate text)
- `migrations/027_fix_stripe_descriptions.sql` (new)
- Test files with "supporter" assertions

## Rollback
- i18n changes: revert the commit (values-only change, no structural impact)
- DB migration: reversible — UPDATE descriptions back to old values

# Platform Enhancement Plan — Phone Auth + Setup Dashboard

## Overview

5 phases + Phase 0 (Italian translation investigation). Each phase gets committed immediately after tests pass. Total: ~100 new tests.

## Phase 0: Italian Translation Investigation

**Status:** The code is correctly wired. Most likely cause: translations not applied to production DB, or user's language_code not set. Will verify during deployment.

## Phase 1: Phone Verification Backend (38 tests)

### Migration: `019_phone_verification_codes.sql`
- `phone_verification_codes` table: id, phone, user_id, code_hash (SHA-256, NOT plaintext), attempts, max_attempts, expires_at, created_at, verified_at
- `phone_rate_limits` table: phone, action, count, window_start, locked_until
- Indexes on phone and expires_at

### Query layer: `src/lib/queries/phone-verification.ts`
- `createVerificationCode(phone, userId?)` — generates 6-digit code, SHA-256 hashes it, stores in DB, invalidates prior codes, returns plaintext code for sending
- `verifyCode(phone, code)` — checks hash, handles attempts, expiry, lockout
- `getRecentCodeCount(phone)` — for rate limiting (cooldown check)
- `cleanExpiredCodes()` — cleanup utility

### DB rate limiter: `src/lib/db-rate-limit.ts`
- `checkDbRateLimit(phone, action, maxRequests, windowMs)` — DB-backed rate limiting for serverless (in-memory resets on cold start)
- `resetDbRateLimit(phone, action)` — test helper

### API routes:
- `POST /api/auth/phone/send-code` — validate phone (E.164), rate limit, create code, send via WhatsApp bot API, return success (anti-enumeration: same response for known/unknown phones)
- `POST /api/auth/phone/verify-code` — validate phone+code, mark user phone_verified=1, return verification token
- `POST /api/auth/phone/signin` — verify phone+code, find/create user, start session, send email notification (SIM swap protection)

### Security:
- SHA-256 hashed codes in DB
- 5-minute expiry
- Max 5 attempts per code
- 60-second cooldown between send requests
- Escalating lockout (5min → 15min → 1hr)
- Anti-enumeration (identical responses for known/unknown phones)
- Email notification on phone-based signin

### Tests: `phone-verification.test.ts`, `db-rate-limit.test.ts`, `phone-auth.test.ts`

## Phase 2: Auth UI (25 tests)

### Components:
- `CountryCodeSelector` — searchable dropdown, 249 countries from DB, locale-aware defaults
- `PhoneVerification` — phone input + OTP code entry + verification status
- Update `SigninForm` — add phone tab alongside email tab
- Update `SignupForm` — add phone input (required) with country code
- Update Profile page — show phone with verification badge

### i18n keys added to `messages/en.json`:
- Auth.phoneNumber, Auth.countryCode, Auth.sendCode, Auth.verifyCode, Auth.codeExpired, etc.
- Profile.phoneVerified, Profile.phoneNotVerified, etc.

### Tests: Component rendering + form validation

## Phase 3: Setup Dashboard Enhancements (24 tests)

### New pages:
- `/[locale]/info/first-rioter/page.tsx` — explains First Quiet Rioter role (multi-language)
- `/[locale]/admin/page.tsx` — admin dashboard with user search + role management

### New API routes:
- `GET /api/admin/users?search=` — search users by name/email/phone (admin only)
- `POST /api/admin/roles` — assign/remove roles (admin only)

### Bot actions:
- `get_pending_suggestions` — list pending suggestions for Setup Guides via WhatsApp

### Enhancements to setup page:
- Additional columns: avatar, other riots joined, close matches, approval status, first rioter preference

### Tests: admin queries, user search API, bot pending suggestions

## Phase 4: End-to-End Flows (22 tests)

### New API routes:
- `POST /api/suggestions/[id]/recognition` — set public/anonymous preference for First Rioter

### Bot actions:
- `set_first_rioter_preference` — set public/anonymous via WhatsApp

### Already built (no changes needed):
- FirstRioterBadge component with locale-aware date
- "Looks Good" badge on approved issues
- Suggestion approval/rejection pipeline
- Multi-channel notifications (WhatsApp + email + inbox)

### Tests: recognition API, bot action

## Phase 5: Translations (8 tests)

### Add all new i18n keys to 44 locale files:
- Auth namespace (phone-related keys)
- Profile namespace (phone display keys)
- FirstRioterInfo namespace (info page content)
- Admin namespace (dashboard labels)

### Method: Script to extract missing keys from en.json and add English fallbacks to all locale files, then translate via sub-agents.

## Commit Strategy (NEW PROTOCOL)

**Commit after every phase.** Don't batch. If the session dies, the last committed phase survives.

```
Phase 1 done → commit "feat: phone verification backend (Phase 1)"
Phase 2 done → commit "feat: phone auth UI (Phase 2)"
Phase 3 done → commit "feat: setup dashboard enhancements (Phase 3)"
Phase 4 done → commit "feat: end-to-end flows (Phase 4)"
Phase 5 done → commit "feat: translations for phone auth + setup (Phase 5)"
```

Push after each commit. Create PR after Phase 5 (or after last completed phase if session ends early).

## Files to Create/Modify

### New files:
- `migrations/019_phone_verification_codes.sql`
- `src/lib/queries/phone-verification.ts`
- `src/lib/db-rate-limit.ts`
- `src/lib/queries/phone-verification.test.ts`
- `src/lib/db-rate-limit.test.ts`
- `src/app/api/auth/phone/send-code/route.ts`
- `src/app/api/auth/phone/verify-code/route.ts`
- `src/app/api/auth/phone/signin/route.ts`
- `src/app/api/auth/phone/phone-auth.test.ts`
- `src/components/interactive/phone-verification.tsx`
- `src/components/interactive/country-code-selector.tsx`
- `src/app/[locale]/info/first-rioter/page.tsx`
- `src/app/[locale]/admin/page.tsx`
- `src/components/interactive/admin-dashboard.tsx`
- `src/lib/queries/admin.ts`
- `src/lib/queries/admin.test.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/roles/route.ts`
- `src/app/api/admin/admin-api.test.ts`
- `src/app/api/suggestions/[id]/recognition/route.ts`
- `src/app/api/suggestions/recognition.test.ts`

### Modified files:
- `src/lib/schema.ts` — add new tables to drop list
- `src/test/seed-test-data.ts` — add phone_verification_codes + phone_rate_limits tables
- `src/app/api/bot/route.ts` — add get_pending_suggestions + set_first_rioter_preference actions
- `messages/en.json` — add Auth/Profile phone keys + FirstRioterInfo + Admin keys
- `messages/*.json` (44 files) — add translated keys
- `src/components/interactive/signin-form.tsx` — add phone tab
- `src/components/interactive/signup-form.tsx` — add phone input
- `src/app/[locale]/profile/page.tsx` — show phone + verification badge

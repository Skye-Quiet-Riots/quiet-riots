# Plan: Comprehensive Auth Upgrade

## Context

Users who signed up via email/OAuth can't link their phone. WhatsApp-only users can't sign in on the web. There's no password login. Simon has two separate accounts that need merging. The current dual-session system (Auth.js JWT + legacy qr_user_id cookie) has security gaps. This plan fixes all of it.

## Critical Architectural Fixes (from security audit)

### A. Unify Sessions

The legacy `qr_user_id` cookie (src/lib/session.ts) has NO session_version validation — a user who resets their password or changes their phone still has a valid legacy cookie for 1 year. **Fix:** Add session_version check to the legacy cookie path in `getSession()` — query the DB to verify the cookie's user exists and session_version matches.

### B. Fix countUserAuthMethods()

Currently only counts `accounts` table rows. Phone auth and password auth don't create accounts rows. **Fix:** Rewrite to check: `accounts` rows + `phone_verified = 1` + `password_hash IS NOT NULL`.

### C. Generalise DB Rate Limiter

`db-rate-limit.ts` is phone-only (column named `phone`). **Fix:** Rename to generic `identifier` via migration, or create a new `rate_limits` table. Use DB-backed rate limiting for all password auth routes (not in-memory which resets on cold starts).

### D. UNIQUE Constraint Handling for Merge

Soft-deleting a user leaves their email/phone in the table, blocking reassignment. **Fix:** On merge, set source email to `merged-{id}@deleted.quietriots.com` and phone to NULL.

---

## Phases (12 phases, each committed separately)

### Phase 1: DB Migration + Password Utilities

**Files created:**

- `migrations/020_auth_upgrade.sql` — ADD `password_hash TEXT`, ADD `password_changed_at TEXT`, ADD `merged_into_user_id TEXT` to users; rename `phone_rate_limits` to `rate_limits` with `identifier` column; ADD `type TEXT DEFAULT 'magic_link'` to `verification_tokens`; ADD INDEX on `verification_tokens(identifier)`
- `src/lib/password.ts` — `hashPassword()` (bcryptjs, 12 rounds, pre-hash with SHA-256 for >72 byte support), `verifyPassword()`, `validatePassword()` (min 10 chars, no composition rules, HIBP breached-password check via k-anonymity API)
- `src/lib/password.test.ts` — ~10 tests

**Files modified:**

- `src/lib/schema.ts` — add columns to CREATE TABLE statements
- `src/lib/queries/users.ts` — add `getUserByEmailWithPassword()`, `setUserPasswordHash()`, rewrite `countUserAuthMethods()` to check accounts + phone_verified + password_hash
- `src/lib/db-rate-limit.ts` — generalise from `phone` to `identifier` parameter
- `src/lib/db-rate-limit.test.ts` — update tests for new parameter name

**Dependency:** `npm install bcryptjs @types/bcryptjs`

### Phase 2: Unify Session System

**Files modified:**

- `src/lib/session.ts` — add session_version validation to legacy cookie path: query DB for user, check `session_version` matches a value stored in the cookie (or just check user exists + is active). Also store session_version in the cookie value as `userId:version`.
- `src/app/api/auth/phone/signin/route.ts` — update `setSession()` call to include session_version in cookie value
- `src/lib/session.test.ts` (if exists) — update tests

### Phase 3: Password Signup + Signin

**Files created:**

- `src/app/api/auth/password/signup/route.ts` — email + password signup, Zod validation, DB-backed rate limiting, HIBP check, sends verification email
- `src/app/api/auth/password/signup/signup.test.ts` — ~12 tests
- `src/app/api/auth/password/signin/route.ts` — email + password signin, DB-backed rate limiting (5/15min per email, escalating lockout), logs to login_events
- `src/app/api/auth/password/signin/signin.test.ts` — ~10 tests

**Files modified:**

- `src/lib/auth.ts` — add Credentials provider for email+password
- `src/app/[locale]/auth/signin/signin-form.tsx` — add password field when email entered
- `src/app/[locale]/auth/signup/signup-form.tsx` — add password + confirm password fields

**New i18n keys (~12):** passwordLabel, confirmPasswordLabel, signInWithPassword, signUpWithPassword, passwordTooShort, passwordRequirements, passwordsDoNotMatch, wrongPassword, emailAlreadyExists, noPasswordSet, verifyEmailSent, passwordStrengthWeak

### Phase 4: Forgot/Reset Password

**Files created:**

- `src/app/api/auth/forgot-password/route.ts` — send reset email via Resend, anti-enumeration, DB rate limited (3/hour/email)
- `src/app/api/auth/reset-password/route.ts` — validate token, hash new password, bump session_version, delete token
- `src/app/[locale]/auth/forgot-password/page.tsx` + `forgot-password-form.tsx` (force-dynamic)
- `src/app/[locale]/auth/reset-password/page.tsx` + `reset-password-form.tsx` (force-dynamic)
- `src/lib/reset-password-email.ts` — branded, locale-aware email template (same pattern as magic-link-email.ts)
- `src/app/api/auth/forgot-password/forgot-password.test.ts` — ~8 tests
- `src/app/api/auth/reset-password/reset-password.test.ts` — ~8 tests

**Files modified:**

- signin-form.tsx — add "Forgot password?" link

**New i18n keys (~12):** forgotPassword, forgotPasswordTitle, forgotPasswordSubtitle, resetPasswordTitle, resetPasswordSubtitle, resetPasswordButton, resetPasswordSuccess, resetEmailSubject, resetEmailHeading, resetEmailBody, resetEmailButton, resetEmailIgnore

### Phase 5: Combined Login Input

**Files modified:**

- `src/app/[locale]/auth/signin/signin-form.tsx` — replace email/phone tabs with single input field
  - Detection: contains `@` → email; starts with `+` followed by digits → phone; all digits ≥7 → phone prompt; else → show hint
  - Priority: `@` always wins (handles `user+tag@gmail.com`)
  - Email mode → password field + "Use magic link instead" link
  - Phone mode → OTP flow (existing)
  - Placeholder: "Email or phone number (+44...)" translated

**New i18n keys (~2):** emailOrPhone, useMagicLink

### Phase 6: Link/Change/Unlink Phone on Profile

**Files created:**

- `src/app/api/users/me/phone/route.ts` — POST (link/change phone, verify OTP), DELETE (unlink, requires other auth method)
- `src/components/interactive/phone-management.tsx` — phone entry + OTP + unlink with confirmation dialog
- `src/app/api/users/me/phone/phone.test.ts` — ~12 tests

**Security:** Changing phone requires re-authentication if user already has a verified phone (step-up auth: must have logged in within last 5 minutes, checked via login_events).

**Files modified:**

- `src/app/[locale]/profile/page.tsx` — render PhoneManagement, show verified badges for both email and phone

**New i18n keys (~12):** linkPhone, changePhone, unlinkPhone, unlinkPhoneConfirm, cannotUnlinkPhone, phoneLinked, phoneChanged, phoneUnlinked, emailVerifiedBadge, emailNotVerifiedBadge, verifyEmail, verifyEmailSent

### Phase 7: Change/Set Password on Profile

**Files created:**

- `src/app/api/users/me/password/route.ts` — POST (set/change password), requires current password if one exists, bump session_version, send notification email
- `src/components/interactive/password-management.tsx` — set/change password form
- `src/app/api/users/me/password/password.test.ts` — ~8 tests

**Files modified:**

- `src/app/[locale]/profile/page.tsx` — render PasswordManagement component

**New i18n keys (~8):** changePassword, setPassword, currentPassword, newPassword, confirmNewPassword, passwordChanged, passwordSet, wrongCurrentPassword

### Phase 8: User Merge Script

**Files created:**

- `scripts/merge-users.ts` — CLI: `--source <email-or-phone> --target <email-or-phone> [--dry-run] [--execute]`
  - Resolves users by email or phone
  - Shows preview: both users' data side by side
  - Migrates all ~30 FK references in a db.batch() transaction
  - Handles UNIQUE conflicts: user_issues, user_memory, etc. use INSERT OR IGNORE
  - Merges wallet balances
  - Updates target email (from wa-\* to real), sets source email to `merged-{id}@deleted.quietriots.com`, NULLs source phone
  - Sets source `status='deleted'`, `merged_into_user_id=target.id`
  - `requireRemoteDb()` guard, database banner

**Execute Simon's merge:**

1. Dry run on staging first
2. Execute on staging, verify
3. Execute on production
4. Assign admin + setup_guide roles to merged user

### Phase 9: Bot Actions for Email Linking

**Files modified:**

- `src/app/api/bot/route.ts` — add `link_email` action (provide real email → replace wa-\* → send verification) and `verify_email_status` action
- `src/app/api/bot/bot-api.test.ts` — ~4 new tests

### Phase 10: i18n Translations

- ~48 new English keys across Auth, Profile namespaces
- Translate into all 44 non-English locales using parallel sub-agents (batches of 5-6 locales per agent)
- Validate all locale files for key parity with en.json

### Phase 11: Seed Data + Test Hardening

- Add `user-with-password` to `src/test/seed-test-data.ts` (pre-hashed bcrypt password)
- Ensure all tests pass, build succeeds
- Expected: ~80+ new tests, total ~1780+

### Phase 12: Deploy

- Run migration 020 on staging + production
- Execute Simon's merge (staging first, then production)
- Verify production health
- Test all flows end-to-end on production

## Key Design Decisions

| Decision              | Choice                                                    | Rationale                                                               |
| --------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Password hashing      | bcryptjs 12 rounds + SHA-256 pre-hash                     | Pure JS (serverless), pre-hash handles >72 byte passwords               |
| Password policy       | Min 10 chars + HIBP breach check                          | NIST 800-63B compliant, no arbitrary composition rules                  |
| Session unification   | Add version check to legacy cookie                        | Minimal change, fixes the security gap without rewriting phone auth     |
| Rate limiting         | DB-backed for all password routes                         | In-memory resets on Vercel cold starts — unsafe for password auth       |
| Combined input        | Keep but with strict priority: @ → email, +digits → phone | User's explicit request; @ always wins to handle edge cases             |
| Phone change security | Step-up auth required (recent login check)                | Prevents account takeover from compromised sessions                     |
| User merge            | CLI script with dry-run                                   | Admin-only, rare operation, needs human review                          |
| Merge direction       | Keep WhatsApp user, soft-delete email user                | WhatsApp user has bot history; source email/phone NULLed to free UNIQUE |
| Password reset tokens | Reuse verification_tokens with type column                | Avoids new table; type column disambiguates                             |

## Verification

1. `npm test` — all ~1780+ tests pass
2. `npm run build` — clean build
3. Migration 020 on staging + production
4. Simon's merge on staging → verify → production
5. Production health: `curl https://www.quietriots.com/api/health`
6. Test: email+password signup/signin, forgot/reset password, phone+OTP login
7. Test: link/change/unlink phone on profile, set/change password
8. Test: combined login input detection (email, phone, edge cases)
9. Test: bot link_email action

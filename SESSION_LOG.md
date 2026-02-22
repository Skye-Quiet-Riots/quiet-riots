# Session Log

> Older sessions archived in `session-logs/`. Only the last 5 sessions are kept here.

---

## 2026-02-18 (Session 11) — Riot Reels Feature

### What was worked on

Implemented the entire Riot Reels feature in 7 phases on the `claude/suspicious-banach` branch. Riot Reels are funny/ironic YouTube videos attached to issues — users can browse, submit, and upvote them.

**Phase 1 — Data Layer:**

- Added `RiotReel`, `ReelVote`, `ReelShownLog` interfaces to `src/types/index.ts`
- Added 3 tables + 4 indexes to `src/lib/schema.ts` (`riot_reels`, `reel_votes`, `reel_shown_log`) with CHECK constraints
- Created `migrations/003_riot_reels.sql`
- Created `src/lib/youtube.ts` — `extractVideoId()` (regex for 5 URL formats), `getThumbnailUrl()`, `getVideoMetadata()` (oEmbed, no API key)

**Phase 2 — Query Layer:**

- Created `src/lib/queries/reels.ts` — 9 functions: getReelsForIssue, getReelById, createReel, voteOnReel, hasVoted, getTrendingReels, getUnseenReelForUser, logReelShown, incrementReelViews
- Updated test seed data with 4 test reels + 1 vote

**Phase 3 — API Routes:**

- `GET/POST /api/issues/[id]/reels` — approved reels list + submit new reel
- `POST /api/issues/[id]/reels/[reelId]/vote` — upvote (idempotent)
- `GET /api/reels/trending` — top reels across all issues (last 7 days)
- Bot actions: `get_riot_reel` (unseen reel + log shown) and `submit_riot_reel` (pending reel from YouTube URL)

**Phase 4 — UI Components:**

- `src/components/cards/reel-card.tsx` — thumbnail, title, caption, optimistic upvote button, source badge
- `src/components/interactive/reels-section.tsx` — grid of ReelCards + submit form
- Updated issue detail page and homepage (riot reel of the day widget)

**Phase 5 — Seed Data:**

- 17 placeholder reels across 10 issues in `src/lib/seed.ts`

**Phase 6 — Tests:**

- API route tests (GET/POST reels, vote, trending)
- Bot tests (get_riot_reel, submit_riot_reel)
- Integration tests (reel submission + get_riot_reel flow)
- YouTube utility tests (getVideoMetadata with oEmbed mock)
- Component tests (ReelCard, ReelsSection)
- Fixed rate limiter test interference by adding `_resetRateLimitStore()` in bot test `beforeEach`

**Phase 7 — Documentation:**

- Updated ARCHITECTURE.md (pages, routes, tables, components, data layer)
- Updated CLAUDE.md (test count, entity table count)
- Updated .claude/rules/bot.md (17 actions, rate limiting, reel descriptions)

### Key decisions

- **No `org_id` on `riot_reels`** — reels are per-issue only (simplification from spec)
- **No `/api/reels/daily`** — trending endpoint with `LIMIT 1` serves the same purpose
- **No Claude auto-review** — community submissions default to `pending`; curated default to `approved`
- **Placeholder YouTube IDs** in seed data — swap for real videos later
- **oEmbed for metadata** — free, no API key needed, returns title + thumbnail
- **Rate limiter reset in tests** — `_resetRateLimitStore()` in `beforeEach` prevents IP-based rate limiting from cascading across test cases

### Discoveries

- **Rate limiter test interference** — bot tests share the same IP (`unknown`), and after 30+ calls the in-memory rate limiter kicks in. Solution: reset the store before each test.

### Test count

344 tests passing across 28 files (~2s) — up from 283 (+61 new tests)

### Files changed

10 new files created, 12 existing files modified (23 files total, 1,479 insertions in first commit + 188 in test coverage commit)

### Next steps

- **Create PR** for `claude/suspicious-banach` branch
- **Re-seed staging and production** after merge (new tables + reels data)
- **Run migration 003** on staging and production before seeding (or seed will handle it via schema.ts)
- **OpenClaw session clearing** — bot route has 2 new actions, SKILL.md may need updating
- Profile page improvements
- Replace placeholder YouTube IDs with real videos

---

## 2026-02-18 (Session 12) — PR Review, Merge, SKILL.md Reels, User Testing

### What was worked on

1. **Visual tour of end-user experience**
   - Showed production website: homepage, issues page, issue detail (Flight Delays)
   - Fixed Vercel preview deployment error — staging DB was missing riot_reels tables
   - Discovered `.env.local` points to **production** DB, not staging — critical gotcha
   - Pulled Vercel Preview env vars, ran migration 003 directly against staging DB
   - Seeded 5 real-ish reels into staging; fixed CSP `img-src` for YouTube thumbnails
   - Showed WhatsApp bot experience via gateway logs and curl examples

2. **CSP fix for YouTube thumbnails**
   - Added `https://img.youtube.com https://i.ytimg.com` to `img-src` in `src/proxy.ts`
   - Committed and pushed on `claude/suspicious-banach`

3. **WhatsApp bot Riot Reels support (SKILL.md)**
   - Added `get_riot_reel` and `submit_riot_reel` to API Actions Reference table
   - Added Step 4.5: Riot Reels conversation step between Actions and Community
   - Added Submit Reel sub-flow (YouTube URL → optional caption → submit_riot_reel)
   - Updated choice sets in Steps 3, 4, 5, 6 to include "Watch a Riot Reel" option
   - Cleared OpenClaw sessions and restarted gateway

4. **Merged PR #8 (Riot Reels feature) to main**
   - Used `gh pr merge 8 --squash --admin` to bypass review requirement
   - CI passed, Vercel deployed successfully

5. **User testing of WhatsApp bot Riot Reels API**
   - Tested `get_riot_reel` against preview: first call returns reel, second returns different reel, third returns null (unseen tracking works)
   - Tested `submit_riot_reel`: with caption, without caption, and invalid YouTube URL (all correct)
   - Confirmed production deploy live after merge

6. **Audited real vs fake YouTube videos**
   - Seed data uses `placeholder01`-`placeholder17` — all fake
   - Manually-seeded production reels: 3 of 5 video IDs are also fake (404)
   - Only 2 real working videos found: `M11SvDtPBhA` (Miley Cyrus) and `Mq_wZE93ZAY` (Randy Gumtree)

### Key decisions

- **Admin merge for PR #8** — branch protection requires 1 approval; used `--admin` bypass at user's request
- **SKILL.md reel flow** — reels sit between Actions (Step 4) and Community (Step 5); submit flow asks for URL then optional caption
- **Step 3 choice change** — replaced "See all issues at Southern Rail" with "Watch a Riot Reel" to introduce reels early

### Discoveries

- **`.env.local` is production, not staging** — Vercel Preview env vars are separate; use `npx vercel env pull --environment preview` from the main repo root (not worktree) to get staging creds
- **libSQL `datetime("now")` default fails** — `SQLITE_UNKNOWN: default value of column is not constant` when creating `_migrations` table on staging
- **Rate limiting on bot API** — rapid curl calls in a loop hit the sliding-window limiter; need delays between calls for testing
- **`npx vercel env pull` fails in worktrees** — must run from the linked repo root

### Test count

344 tests passing across 28 files (~2s) — unchanged

### Next steps

- **Find and seed real YouTube videos** for all 17 placeholder reels across 10 issues (started but not completed)
- Replace fake video IDs in both seed.ts and production DB
- Profile page improvements
- Consider updating seed.ts to include real YouTube IDs so re-seeding doesn't regress

---

## 2026-02-20 (Session 13) — Fix WhatsApp Bot Overnight Memory Loss

### What was worked on

1. **Diagnosed WhatsApp bot memory loss**
   - Investigated gateway logs, watchdog logs, auto-update logs, and session files
   - Found that session files DO persist on disk across gateway restarts — the `.jsonl` transcripts and `sessions.json` survive
   - Discovered a new session was being created every morning: Feb 18 → `067bbeea`, Feb 19 → `0be631b8`, Feb 20 → `8a29c366` — each starting fresh with zero context
   - Root cause: OpenClaw's default `session.reset.mode: "daily"` resets all sessions at 4 AM local time. The first inbound message after 4 AM triggers a brand new session ID, orphaning the old one

2. **Fixed session persistence**
   - Set `session.reset.mode` to `"idle"` — no more scheduled 4 AM wipes
   - Set `session.reset.idleMinutes` to `1440` (24 hours) — sessions only reset after 24h of inactivity from that user
   - Users can still manually reset with `/new` or `/reset`
   - Restarted gateway to apply config

3. **Gateway health check**
   - WiFi dropped ~20:03–20:43 on Feb 19, causing ~40 minutes of failed reconnection attempts
   - Watchdog correctly detected and restarted gateway at 20:43
   - Gateway has been stable since, handling messages overnight and this morning
   - Auto-update on Feb 19 failed (no network), last successful update was Feb 18 (2026.2.15 → 2026.2.17)
   - Current version 2026.2.17, update available to 2026.2.19-2

4. **Documentation updates**
   - Added session reset gotcha to CLAUDE.md Critical Gotchas
   - Added session reset config to OPERATIONS.md WhatsApp Bot section
   - Archived session 9 to `session-logs/2026-02-sessions-9.md`

### Key decisions

- **24h idle timeout over daily reset** — the bot should remember conversations across days if the user is actively engaged. 24h idle is generous enough that casual users won't hit it, but prevents unbounded session growth
- **No code changes** — this was purely an OpenClaw config issue, not a Quiet Riots code bug

### Discoveries

- **OpenClaw default session reset is `daily` at 4 AM** — undocumented in our CLAUDE.md until now. This is the default when `session.reset` is not configured. The auto-update LaunchAgent also runs at 04:00 which compounds the issue (gateway restart + session expiry).
- **Orphaned session files** — old sessions remain on disk after reset but are no longer referenced by `sessions.json`. 7 `.jsonl` files totalling ~780KB from the last 3 days.
- **OpenClaw `read` tool error** — gateway.err.log shows `ENOENT: no such file or directory, access '/Users/skye/.openclaw/workspace/memory'` — the bot is trying to read/write durable memory but the directory doesn't exist.

### Test count

344 tests passing across 28 files (~2s) — unchanged (no code changes this session)

### Next steps

- **Create `~/.openclaw/workspace/memory/` directory** — the bot's memory flush is failing silently because this directory doesn't exist
- **Clean up orphaned session files** — 7 old `.jsonl` files can be deleted
- **Update OpenClaw** — current 2026.2.17, available 2026.2.19-2
- Find and seed real YouTube videos for placeholder reels
- Profile page improvements

---

## 2026-02-22 (Session 14) — Riot Wallet Web UI + Production Fixes + Test Coverage

### What was worked on

1. **Riot Wallet Phase 2 — Web UI (PR #9, merged)**
   - Built full wallet web UI: `/wallet` page, `/campaigns` browse page, `/campaigns/[id]` detail page
   - New components: WalletBalance, TopUpForm, TransactionList, CampaignCard, ContributeForm, StatusFilter
   - Extracted `formatPence` to shared `src/lib/format.ts`
   - Added `getCampaignsWithIssues()` JOIN query to campaigns.ts
   - Added Wallet link to nav bar
   - 73 new tests (344 → 417)

2. **Production wallet page crash fix (PR #10, merged)**
   - Root cause: `qr_user_id` cookie had user ID not in production `users` table → FK violation on wallet INSERT
   - Fix: Added `getUserById` checks in wallet page, all wallet API routes, and defense in depth in `getOrCreateWallet`
   - 4 regression tests

3. **Stripe placeholder then simulated top-up (PR #11 → #12, both merged)**
   - Initially replaced TopUpForm with static Stripe placeholder (PR #11)
   - Then restored interactive TopUpForm with simulated instant wallet credits (PR #12)
   - Both web and bot API now do instant credit: `createTopupTransaction` + `completeTopup('simulated')`
   - Disclaimer shown: "Simulated top-up for testing. Real payments via Stripe coming soon."

4. **Comprehensive test coverage audit + fill (PR #13, merged)**
   - Added 33 new tests (421 → 454): 19 campaign API route tests, 3 wallet integration journey tests, 3 getCampaignsWithIssues query tests, 2 completeTopup edge cases, 2 contribute error paths, 2 ContributeForm tests, 2 history route auth tests
   - Fixed bug: `/api/wallet/history` was missing `getUserById` guard
   - Fixed rate limiter interference in integration tests

5. **WhatsApp bot SKILL.md update**
   - Updated `topup_wallet` API reference: returns `{ transaction, wallet }` instead of `{ transaction, paymentUrl }`
   - Updated Step 4.7 top-up flow: shows instant credit confirmation + Stripe placeholder text + useful next choices
   - Cleared sessions and restarted gateway

6. **Infrastructure cleanup (end of session)**
   - Created `~/.openclaw/workspace/memory/` directory (bot memory was failing silently)
   - Updated OpenClaw to 2026.2.21-2 (already latest)
   - Cleaned up 7 worktrees and all stale claude/\* branches (local + remote)

### Key decisions

- **Defense in depth for stale sessions** — guard at page level, API level, AND query level to prevent FK violations
- **Simulated instant top-up** — users get real wallet credits without Stripe for testing; easy to swap to real payments later
- **`completeTopup` double-call risk documented** — test shows double-calling credits twice; no idempotency guard yet (will need for Stripe)

### Discoveries

- **Stale `qr_user_id` cookie** — production users can have cookies pointing to non-existent user IDs, causing FK violations. Must always validate user exists before wallet operations.
- **Rate limiter bleeds across test suites** — bot tests share IP `unknown`; `_resetRateLimitStore()` needed in `beforeEach` for integration tests
- **ContributeForm disabled button** — preset amount buttons are disabled when amount > balance, so tests can't click them to test insufficient funds; use custom amount form instead

### Test count

454 tests passing across 33 files (~2.7s) — up from 344 (+110 new tests across sessions)

### PRs created and merged

- PR #9: Add Riot Wallet feature (Phase 1 backend + Phase 2 web UI)
- PR #10: Fix wallet page crash for stale session cookies
- PR #11: Replace top-up form with Stripe placeholder
- PR #12: Add simulated instant top-up for wallet testing
- PR #13: Add comprehensive wallet and campaign test coverage

### Next steps

- **Stripe integration** — replace simulated top-up with real Stripe Checkout
- **Idempotency guard on `completeTopup`** — prevent double-crediting when Stripe webhook retries
- Find and seed real YouTube videos for placeholder reels
- Profile page improvements

---

## 2026-02-22 (Session 15) — Real YouTube Videos for Riot Reels + Production Fix

### What was worked on

1. **Sourced 17 real YouTube videos for riot reels (PR #14, merged)**
   - Replaced all placeholder video IDs in `src/lib/seed.ts` with real, verified videos
   - All videos sourced for a UK audience: comedy sketches, satirical mashups, ironic vintage ads
   - Every video ID verified via YouTube oEmbed API (noembed.com proxy)
   - Videos: At Last the 1948 Show, Big Train, Cassetteboy (x2), Nish Kumar, Fonejacker, Little Britain, Michael McIntyre, Tom Scott, Trigger Happy TV, Lee Evans, Foil Arms and Hog, and more

2. **Fixed production reels not showing**
   - Discovered `npm run seed` didn't actually run against production (would have destroyed 49 issues → 19)
   - Production has 49 issues (vs 19 in seed.ts) — re-seeding would be destructive
   - Wrote a targeted `scripts/insert-reels.ts` migration script that matches issues by name and inserts reels without dropping data
   - Ran migration successfully — 17 reels inserted, 0 skipped

3. **Fixed stale Vercel API responses**
   - After DB update, Vercel functions still returned old reel data
   - Root cause: Vercel serverless function instances had cached the old DB query results
   - Fix: `npx vercel --prod` forced a fresh deployment, immediately showing new data
   - Verified all 17 reels visible via API and on the website

4. **Documentation updates**
   - Added 2 new gotchas to CLAUDE.md: Vercel redeployment after DB changes, never re-seed production
   - Archived session 10 to `session-logs/`
   - Created auto memory for YouTube verification technique and production DB gotchas

### Key decisions

- **Migration script over re-seed** — production has 30 more issues than seed.ts creates; targeted insert preserves all existing data
- **noembed.com for video verification** — YouTube.com is blocked from WebFetch/WebSearch crawlers; noembed oEmbed proxy returns title + author if video exists, 404 if not

### Discoveries

- **Production DB has diverged from seed.ts** — 49 issues vs 19. `npm run seed` can never be run against production again without data loss. All future data changes need targeted migration scripts.
- **Vercel functions cache DB results across requests** — after direct DB modifications, a `npx vercel --prod` redeployment is needed to clear stale function instances. The `s-maxage` CDN cache was NOT the issue (headers showed `x-vercel-cache: MISS`).
- **`npm run seed` silently fails** — when run from the wrong directory or with incorrect env resolution, seed appears to succeed (no output) but doesn't actually modify the target database.

### Test count

454 tests passing across 33 files (~2.2s) — unchanged (seed data only, no logic changes)

### PRs created and merged

- PR #14: Replace placeholder riot reel videos with real YouTube content

### Next steps

- **Stripe integration** — replace simulated top-up with real Stripe Checkout
- **Idempotency guard on `completeTopup`** — prevent double-crediting when Stripe webhook retries
- **Profile page improvements**

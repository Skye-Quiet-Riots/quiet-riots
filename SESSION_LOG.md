# Session Log

> Older sessions archived in `session-logs/`. Only the last 5 sessions are kept here.

---

## 2026-02-17 (Session 9) — Merge, Seed, and Deploy 50-Issue Expansion

### What was worked on

1. **Vercel preview deployment fixes**
   - Disabled Deployment Protection (SSO auth) so preview URLs are publicly accessible
   - Fixed `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` Preview env vars that had trailing newline characters (`%0A`), causing `TypeError: Invalid URL`
   - Redeployed preview — confirmed it loads correctly with staging data

2. **Merged PR #2 (50-issue expansion) to main**
   - Resolved 10 merge conflicts between the expanded data branch and the UUID migration from `intelligent-brown`
   - Fixed `seasonal_patterns` and `issue_relations` tables in `schema.ts` — still had `INTEGER PRIMARY KEY AUTOINCREMENT` instead of TEXT UUIDs (missed during merge)
   - Updated `seasonal-patterns.ts` and `issue-relations.ts` query files: `number` params → `string`
   - Updated both test files: integer IDs → string IDs (`'issue-rail'`, `'issue-broadband'`, `'issue-flights'`)
   - All 241 tests passing, build clean

3. **Seeded production and staging databases**
   - Both now have 49 issues, 50 organisations across 16 categories (Insurance: Aviva, Admiral, Direct Line etc.)
   - Discovered `tsx` doesn't load `.env.local` — seed silently went to local `file:quiet-riots.db` instead of remote Turso. Must pass env vars explicitly.
   - Removed "Plastic Waste" issue from both databases per user request

4. **Added missing test assertions (PR #3)**
   - `GET /api/issues/[id]` and `POST /api/bot` `get_issue` responses include `seasonalPattern` and `relatedIssues` but tests didn't assert on them
   - Added assertions, merged to main

### Key decisions

- **Schema fix committed directly to main** — the `seasonal_patterns`/`issue_relations` UUID fix was critical for seeding and couldn't wait for a PR
- **Env vars passed explicitly for seeding** — `source <(grep -E '^TURSO_' .env.local | sed 's/^/export /')` pattern for reliable remote seeding

### Test count

241 tests passing across 20 files (~1.7s)

### Next steps

- Remove "Plastic Waste" from `src/lib/seed.ts` so re-seeding doesn't bring it back
- Profile page improvements
- Consider `create_issue` bot action
- Tighten CSP with nonce-based approach

---

## 2026-02-18 (Session 10) — Developer Best Practices (9 Items, 3 Phases)

### What was worked on

Implemented 9 developer best practices across 3 phases, all on the `best-practices` branch (PR #4):

**Phase 1 — Quick Wins:**

1. **Coverage thresholds** — Added to `vitest.config.ts`: 75% statements, 69% branches, 74% functions, 76% lines (based on current coverage so CI enforces it going forward)
2. **Dependabot** — Created `.github/dependabot.yml` for weekly npm updates, grouped minor/patch, max 5 open PRs
3. **Branch protection** — Configured via `gh api`: 1 approval required, `test` status check must pass, branch must be up-to-date, stale reviews dismissed

**Phase 2 — Reliability & Data Integrity:** 4. **DB query timeouts** — `withTimeout()` wrapper in `src/lib/db.ts` using `Promise.race` with 5s default. Also added `concurrency: 10` to libSQL client config. 5. **Structured logging** — pino (`src/lib/logger.ts`) with `createRequestLogger()` for per-request context (requestId, action, IP, timing). Added to bot route — logs request entry, completion, errors with duration. 6. **Schema constraints** — CHECK constraints on all 13 entity tables: non-negative counters (`rioter_count >= 0`, `likes >= 0`, `rank >= 0`), health metrics (`0-100`), enum validation (`time_available`, `time_required`), length limits on text fields (`name <= 255`, `content <= 5000`, `description <= 2000`). Fixed `create_issue` Zod schema (had only 6 of 16 categories). Added `time_available` enum validation to `update_user` Zod schema.

**Phase 3 — Hardening:** 7. **Input sanitization** — `src/lib/sanitize.ts`: `normalizePhone()` (E.164 validation), `trimAndLimit()`, `sanitizeText()` (strips control chars, preserves newlines/tabs/emojis). 18 test cases. 8. **Error codes** — `apiError()` now includes `code` field auto-inferred from HTTP status: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `RATE_LIMITED`, `INTERNAL_ERROR`. New `apiValidationError()` returns field-level details. Bot route `err()` helper also includes codes. Updated users routes to use `apiValidationError` for Zod errors. 9. **Integration tests** — `src/test/integration.test.ts`: 4 test suites covering full user journeys (new user flow, feed flow, bot full cycle, edge cases including idempotent join, safe leave, unknown user errors, error code verification).

### Key decisions

- **Coverage thresholds set to current levels** — not aspirational. CI will enforce no regressions. Can raise them later.
- **pino over winston** — lighter, faster, JSON by default, Vercel-friendly (stdout → Vercel log drain)
- **Error codes auto-inferred from status** — backward compatible, no changes needed to existing apiError calls
- **Schema constraints on seed-managed tables** — since seed drops and recreates, no migration needed. Just re-seed after merge.
- **Promise.race for timeouts** — simpler than AbortSignal for libSQL, which doesn't natively support abort

### Test count

283 tests passing across 25 files (~2s) — up from 241 (+42 new tests)

### Next steps

- **Merge PR #4** (best-practices) after CI passes and user reviews
- **Re-seed staging and production** after merge to apply new schema constraints
- **Bot route change** — OpenClaw sessions may need clearing after merge since bot route error responses now include `code` field
- Profile page improvements
- Tighten CSP with nonce-based approach

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

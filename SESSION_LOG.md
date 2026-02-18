# Session Log

> Older sessions archived in `session-logs/`. Only the last 5 sessions are kept here.

---

## 2026-02-17 (Session 5) — Claude Code Permissions Fix

### What was worked on

1. **Fixed Claude Code permission prompts**
   - Updated `~/.claude/settings.json`: changed `defaultMode` from `"acceptEdits"` to `"bypassPermissions"`
   - Added missing tool permissions: `Read(*)`, `Write(*)`, `WebFetch(*)` to the allow list
   - Kept deny rules for sensitive files (`.env`, secrets, `.ssh`)
   - Takes effect in the next Claude Code session

2. **Verified production health**
   - Tests: 126/126 passing (~666ms)
   - WhatsApp watchdog: still running, has auto-recovered 3 times today
   - No code changes to commit — only local config update

### Key decisions

- **bypassPermissions over acceptEdits** — `acceptEdits` still prompts for Read/Write/WebFetch. `bypassPermissions` skips all prompts (with deny rules still enforced for sensitive files)

### Next steps

- Flesh out profile page
- Add rate limiting to bot API
- Consider `create_issue` bot action
- Set up GitHub Actions CI
- Add `.env.example`
- Consider upgrading OpenClaw (`v2026.2.15` available) — may fix the reconnection bug
- Monitor watchdog log to confirm it catches future WiFi drops automatically

---

## 2026-02-17 (Session 6) — Claude Code & OpenClaw Process Improvements

### What was worked on

1. **Populated auto memory (MEMORY.md)** — Extracted key learnings from 5 sessions into persistent memory: critical gotchas, database patterns, testing patterns, performance insights, user preferences

2. **Created `.env.example`** — Documents required environment variables without exposing secrets

3. **Added deny rules for destructive commands** — `~/.claude/settings.json` now blocks `rm -rf`, `git push --force`, `git reset --hard`, `git checkout .`, `git clean -f`

4. **Created `.claude/rules/` with path-specific rules** — 4 rule files that load contextually:
   - `api.md` — API route conventions (loaded for `src/app/api/**`)
   - `testing.md` — Test patterns (loaded for `*.test.ts` and `src/test/**`)
   - `bot.md` — Bot-specific rules (loaded for `src/app/api/bot/**`)
   - `components.md` — Component conventions (loaded for `*.tsx` files)

5. **Added PostToolUse formatting hook** — Auto-runs `eslint --fix` on `.ts/.tsx/.js/.jsx/.mjs` files after Edit/Write operations

6. **Split CLAUDE.md into focused files** — 203 lines down to ~65 lines:
   - `CLAUDE.md` — Concise actionable instructions with `@imports`
   - `ARCHITECTURE.md` — Full reference for pages, API, database, components
   - `OPERATIONS.md` — Deployment, OpenClaw, watchdog, sleep prevention

7. **Archived old sessions** — Sessions 1-4 moved to `session-logs/2026-02-sessions-1-4.md`. SESSION_LOG.md now keeps only the last 5 sessions.

### Key decisions

- **Split CLAUDE.md using `@imports`** — keeps the system prompt lean while making reference docs available on demand
- **Path-specific rules over monolithic instructions** — bot rules don't load when editing components, reducing context noise
- **eslint --fix as PostToolUse hook** — deterministic formatting that always runs, unlike advisory instructions
- **Deny rules for destructive git commands** — safety net even in bypassPermissions mode
- **Session archiving at 5 sessions** — keeps SESSION_LOG.md readable while preserving history

### Discoveries

- Claude Code auto memory was empty after 5 sessions — needs explicit population
- Project had no `.claude/settings.json` — needed for project-level hooks and rules
- No prettier configured — eslint is the only formatting tool
- `@import` syntax in CLAUDE.md lets you reference other files without duplicating content

### Next steps

- Flesh out profile page
- Add rate limiting to bot API
- Consider `create_issue` bot action
- Set up GitHub Actions CI
- Consider upgrading OpenClaw (`v2026.2.15` available)

---

## 2026-02-17 (Session 7) — Developer Best Practices & Sentry

### What was worked on

This was a large "hardening" session — implementing developer best practices across the entire codebase, then adding Sentry error monitoring.

**Round 1 — Developer best practices (implemented all at once):**

1. **Zod validation** on all API mutation routes — `users` (create/update), `feed` (post), `synonyms` (create). Schemas validate and trim inputs, return structured validation errors.

2. **Rate limiting** on all mutation endpoints — sliding-window in-memory limiter (`src/lib/rate-limit.ts`) applied to join, leave, feed post, like, synonym create, user create, user update. 10 requests/60s default.

3. **CSP header** in `src/middleware.ts` — `default-src 'self'`, allows `unsafe-inline`/`unsafe-eval` (required by Next.js), `frame-ancestors 'none'`.

4. **Cache headers** on GET API routes via middleware — `public, max-age=60, s-maxage=300, stale-while-revalidate=600` (excludes `/me`).

5. **npm audit** in GitHub Actions CI — `npm audit --audit-level=high` with `continue-on-error: true` (advisory, not blocking).

6. **Prettier** — `.prettierrc` config, `format`/`format:check` scripts, integrated with lint-staged pre-commit hooks.

7. **eslint-plugin-jsx-a11y** — promoted 6 key rules (alt-text, anchor-is-valid, aria-props, aria-role, heading-has-content, label-has-associated-control) to error level. Fixed 2 violations in `profile/page.tsx`.

8. **`.editorconfig`** — 2-space indent, LF, UTF-8, trim trailing whitespace (except .md).

9. **`.env.example` expansion** — added local dev hints and NODE_ENV reference.

10. **`CONTRIBUTING.md`** — branch naming, workflow, code style, testing guidelines.

11. **GitHub templates** — PR template, bug report template, feature request template in `.github/`.

**Round 2 — Sentry error monitoring:**

12. **Installed `@sentry/nextjs`** and created 3 config files: `sentry.client.config.ts` (with replay), `sentry.server.config.ts`, `sentry.edge.config.ts`.

13. **Error boundaries** — `src/app/global-error.tsx` (root boundary with inline styles), updated `src/app/error.tsx` to report to Sentry.

14. **Next.js integration** — wrapped `next.config.ts` with `withSentryConfig()` for source map uploads. Added `onRequestError` to `src/instrumentation.ts`.

15. **Sentry account setup** via browser — created project "javascript-nextjs" in org "quiet-riots", generated auth token "vercel-deploy" with org:ci scopes.

16. **Vercel env vars** — added `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` via CLI.

**Bug fixes found along the way:**

17. **`actions-section.tsx`** — fixed React hooks lint error (`set-state-in-effect`). Replaced `setActions(initialActions)` in useEffect with derived `displayActions` variable.

18. **`bot-api.test.ts`** — removed unused `request` variable.

### Key decisions

- **CSP allows `unsafe-inline`/`unsafe-eval`** — Next.js requires these for inline scripts and hot reload. Could tighten with nonce-based CSP later.
- **Rate limiting is in-memory** — resets on deploy. Fine for current scale; consider Redis/Upstash if traffic grows.
- **Cache headers only on GET, not `/me`** — user-specific data must not be cached by CDN.
- **Sentry replays at 1% session / 100% on error** — balances insight vs bandwidth. Free tier is 5K errors/month.
- **Source maps deleted after upload** — prevents users seeing source code via devtools, while Sentry gets full stack traces.
- **npm audit is advisory** — `continue-on-error: true` prevents blocking deploys on transitive dependency issues.

### Discoveries

- `eslint-config-next` already bundles `jsx-a11y` — adding it again causes `ConfigError: Cannot redefine plugin`. Solution: promote existing rules to error level instead.
- `@sentry/nextjs` deprecated `hideSourceMaps` and `disableLogger` in favour of `sourcemaps.deleteSourcemapsAfterUpload` — the old API causes TypeScript build failures.
- Edit tool read cache can expire between parallel reads and edits — need to re-read files if editing many in sequence.

### Test count

215 tests passing across 13 files (~1.3s). All new infrastructure (rate-limit, env validation, API response helpers) has tests.

### Next steps

- Flesh out profile page
- Consider `create_issue` bot action
- Tighten CSP with nonce-based approach when Next.js supports it better
- Consider Redis/Upstash rate limiting if traffic grows
- Consider upgrading OpenClaw (`v2026.2.15` available)
- Add database migration tooling (currently schema changes are manual)

---

## 2026-02-17 (Session 8) — UUID Migration + Scaling Architecture

### What was worked on

Complete migration of all database IDs from `INTEGER PRIMARY KEY AUTOINCREMENT` to `TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))`. This was a 10-phase change across 35+ files:

1. **`src/lib/uuid.ts`** (new) — Central UUID generation: `crypto.randomUUID().replace(/-/g, '')` → 32-char hex
2. **`src/types/index.ts`** — All 13 interfaces: `id: number` → `id: string`, all FK fields → `string`
3. **Schema + migration** — `src/lib/schema.ts`, `migrations/001_baseline.sql` updated; new `migrations/002_uuid_ids.sql` for existing databases (parents first, then 8 child tables)
4. **`src/lib/session.ts`** — Returns string directly, no parseInt
5. **Query layer** (6 files) — All ID params → string, creates use `generateId()` instead of `lastInsertRowid`
6. **API routes** (9 files) — Removed all `Number(id)` casts, bot Zod schemas → `z.string().min(1)`
7. **Page components** (3 files) — Removed `Number(id)` conversions
8. **Client components** (8 files) — All `issueId: number` → `string`, etc.
9. **`src/lib/seed.ts`** — `insertRow()` generates UUID, returns string. Fixed arithmetic on IDs → fixed rioter count map
10. **Test files** (15 files) — Readable string IDs (`'issue-rail'`, `'user-sarah'`), all assertions updated

Also created **`SCALING-ARCHITECTURE.md`** — comprehensive scaling document covering NOW (0-10k), SOON (Turso replicas), 10k+ (FTS5), 50k+ (PostgreSQL), 100k+ (counters), 500k+ (multi-region), bot scaling, and "What NOT to Build Yet" table.

### Thorough verification

- `npm run build` — Clean, no type errors
- `npm test` — 230/230 passing (1.4s)
- `npm run seed` — Seeds successfully (19 issues, 20 orgs, 8 users + all child data)
- `npm run lint` — 0 errors (2 pre-existing warnings in migrate.test.ts)
- `npm run format:check` — All files pass
- Grep audit: zero `Number(id)`, `parseInt(id)`, `z.number()` on ID fields, `lastInsertRowid`, or `issueId: number` remaining in `src/`
- Only `INTEGER PRIMARY KEY AUTOINCREMENT` remaining is in `_migrations` table (correct by design)

### Key decisions

- **32-char hex UUIDs** — `crypto.randomUUID().replace(/-/g, '')` matches SQLite's `lower(hex(randomblob(16)))` format. Valid UUIDs for future Postgres migration.
- **Readable test IDs** — `'issue-rail'` instead of random UUIDs for test determinism and readability
- **`_migrations` keeps AUTOINCREMENT** — internal tooling, no API surface, sequential IDs are fine
- **Seed data uses fixed rioter counts** — replaced arithmetic on integer IDs with a `basicCountryData` map

### Next steps

- Profile page improvements
- Consider `create_issue` bot action
- Tighten CSP with nonce-based approach
- Deploy UUID migration to production (run `npm run seed` to reset with UUID data)

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

### Discoveries

- **`tsx` doesn't load `.env.local`** — libSQL falls back to `file:quiet-riots.db` silently. The seed reported "50 issues" success but was writing to a local file, not Turso. Added as a gotcha to CLAUDE.md.
- **Vercel env vars can have trailing newlines** — copy-pasting tokens from Turso dashboard may include `\n`, causing `TypeError: Invalid URL` with `%0A` in the URL.
- **Vercel `.env.staging` wraps values in quotes** — `vercel env pull` produces `TURSO_DATABASE_URL="libsql://..."` which causes `URL_INVALID` if parsed with `cut -d= -f2`. Use `source` instead.

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

### Files created/modified

| File                                 | Action                                         |
| ------------------------------------ | ---------------------------------------------- |
| `vitest.config.ts`                   | Edit — coverage thresholds                     |
| `.github/dependabot.yml`             | Create                                         |
| `package.json` / `package-lock.json` | Edit — added pino dependency                   |
| `src/lib/db.ts`                      | Edit — withTimeout, concurrency                |
| `src/lib/db.test.ts`                 | Create — 4 tests                               |
| `src/lib/logger.ts`                  | Create                                         |
| `src/lib/logger.test.ts`             | Create — 3 tests                               |
| `src/lib/schema.ts`                  | Edit — CHECK constraints on all tables         |
| `src/lib/sanitize.ts`                | Create                                         |
| `src/lib/sanitize.test.ts`           | Create — 18 tests                              |
| `src/lib/api-response.ts`            | Edit — error codes, apiValidationError         |
| `src/lib/api-response.test.ts`       | Create — 10 tests                              |
| `src/app/api/bot/route.ts`           | Edit — logging, error codes, Zod fixes         |
| `src/app/api/users/route.ts`         | Edit — apiValidationError                      |
| `src/app/api/users/[id]/route.ts`    | Edit — apiValidationError                      |
| `src/test/integration.test.ts`       | Create — 7 tests                               |
| `CLAUDE.md`                          | Edit — updated test count, added new practices |

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

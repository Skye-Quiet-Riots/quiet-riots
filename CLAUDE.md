# Quiet Riots

Quiet Riots is a web app for collective action around shared issues. Based on the 2014 book by Simon Darling.

@ARCHITECTURE.md
@OPERATIONS.md

## Agent Identity

- **Name:** Simon Darling
- **Email:** simon@quietriots.com
- **GitHub:** Simon-Quiet-Riots

## Tech Stack

- Next.js 16, React 19, TypeScript (strict), Tailwind CSS 4, Turso (libSQL), Vercel
- Package manager: **npm** (not yarn/pnpm)

## Commands

| Command                  | Purpose                              |
| ------------------------ | ------------------------------------ |
| `npm run build`          | Build — ALWAYS run before committing |
| `npm test`               | Run 283 tests (~2s)                  |
| `npm run test:watch`     | Watch mode                           |
| `npm run test:coverage`  | With V8 coverage                     |
| `npm run seed`           | Reset database with sample data      |
| `npm run migrate`        | Run pending database migrations      |
| `npm run migrate:status` | Show applied & pending migrations    |
| `npm run dev`            | Local dev server                     |
| `npm run lint`           | ESLint                               |
| `npm run format`         | Prettier — format all files          |
| `npm run format:check`   | Prettier — check formatting (CI)     |

## Development Rules

- IMPORTANT: Always run `npm run build` before committing
- IMPORTANT: When fixing a bug, always add a regression test
- Write tests for business logic, data handling, and API endpoints
- Skip tests for one-off scripts, styling, and rapid prototypes unless asked
- Environment variables go in `.env.local` (see `.env.example` for shape)
- Use feature branches for new work; commit to `main` only when ready
- IMPORTANT: Never merge to main directly — always push the feature branch, create/update a PR, and let the user review and merge. Vercel auto-deploys a preview for every PR.

## Conventions

- Prefer async server components — only add `"use client"` for interactive parts
- Mobile-first CSS — design for small screens, scale up with breakpoints
- Follow existing code patterns before introducing new ones
- TypeScript strict mode — no `any` without justification

## Developer Best Practices (implemented)

- **CI:** GitHub Actions runs lint, tests, build, and `npm audit` on every push/PR
- **Pre-commit hooks:** Husky + lint-staged runs ESLint, Prettier on staged files
- **Linting:** ESLint with jsx-a11y rules promoted to error level
- **Formatting:** Prettier (`.prettierrc`) — semi, singleQuote, trailingComma all, printWidth 100
- **API validation:** Zod schemas on all mutation endpoints
- **Rate limiting:** Sliding-window in-memory limiter on all mutation endpoints (`src/lib/rate-limit.ts`)
- **Security headers:** Nonce-based CSP, X-Frame-Options, etc. in `src/proxy.ts`
- **Cache headers:** GET API routes get `Cache-Control: public, max-age=60, s-maxage=300`
- **Error monitoring:** Sentry (`@sentry/nextjs`) — client/server/edge configs, session replay, source maps
- **Error pages:** `error.tsx`, `global-error.tsx`, `not-found.tsx` all report to Sentry
- **Env validation:** `src/lib/env.ts` — validates required env vars at startup via `src/instrumentation.ts`
- **Health check:** `GET /api/health` — checks db connectivity
- **Standardised API responses:** `src/lib/api-response.ts` — `apiOk()`, `apiError()` (with error codes), `apiValidationError()` (field-level details)
- **Editor config:** `.editorconfig` for consistent whitespace across editors
- **Coverage thresholds:** Vitest enforces 75% statements, 69% branches, 74% functions, 76% lines
- **Dependabot:** Weekly npm dependency updates, grouped minor/patch, max 5 open PRs (`.github/dependabot.yml`)
- **Branch protection:** `main` requires 1 PR approval + `test` status check passing + branch up-to-date
- **DB query timeouts:** `withTimeout()` wrapper in `src/lib/db.ts` — 5s default via `Promise.race`
- **Structured logging:** pino JSON logger (`src/lib/logger.ts`) with `createRequestLogger()` for per-request context
- **Schema constraints:** CHECK constraints on all tables — non-negative counters, health 0-100, enum validation, length limits
- **Input sanitization:** `src/lib/sanitize.ts` — `normalizePhone()` (E.164), `trimAndLimit()`, `sanitizeText()`
- **Error codes:** All API errors include `code` field (`VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `RATE_LIMITED`, `INTERNAL_ERROR`)
- **Integration tests:** `src/test/integration.test.ts` — full user journey tests crossing multiple API routes

## Critical Gotchas

- **Bare domain breaks POST:** Always use `www.quietriots.com` for API URLs (307 redirect)
- **Turso queries are async:** All db queries must be awaited
- **OpenClaw BOOTSTRAP.md kills skills:** Must NOT exist in `~/.openclaw/workspace/`
- **OpenClaw session cache is sticky:** After changing SKILL.md, delete `~/.openclaw/agents/main/sessions/*.jsonl` and restart gateway
- **CSP uses nonces + strict-dynamic:** `unsafe-eval` only in dev mode; prod eliminates `unsafe-inline`
- **Bot API key in tests:** Test helper reads `BOT_API_KEY` env var with same fallback as route — CI sets it to `test-key`
- **`tsx` doesn't load `.env.local`:** When running `npm run seed` or `tsx scripts/*.ts`, env vars must be passed explicitly or sourced from `.env.local` — without them, libSQL falls back to `file:quiet-riots.db` (a local SQLite file) instead of the remote Turso database

## Database ID Convention

- All 13 entity tables use `TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))` — UUIDs generated in JS via `crypto.randomUUID()` and passed explicitly on INSERT (`src/lib/uuid.ts`)
- The `_migrations` table is the sole exception — keeps `INTEGER PRIMARY KEY AUTOINCREMENT` (internal tooling, no API surface)
- Tests use short readable string IDs (`'issue-rail'`, `'user-sarah'`) for determinism and clarity
- Session cookie (`qr_user_id`) stores the UUID string directly — no parseInt needed

## Known Issues

- None currently tracked

## Start of Session Protocol

At the start of every session (or when asked to "pick up where we left off"):

1. Read CLAUDE.md and SESSION_LOG.md
2. Summarise where we left off and what the priorities are
3. Run the test suite (`npm test`) and flag any issues
4. Check OpenClaw health and version:
   - `openclaw --version` — report current version
   - `launchctl list | grep ai.openclaw.gateway` — confirm gateway is running
   - `tail -5 ~/.openclaw/logs/watchdog.log` — check for recent auto-recoveries
   - `tail -3 ~/.openclaw/logs/auto-update.log` — check if auto-update ran recently
5. If the watchdog has been restarting frequently, flag it as a connectivity issue

## During Session

- Run tests after meaningful changes, not just at session end
- When adding or changing code, check if tests need updating — add tests for new logic
- Save debugging insights to auto memory as they happen
- If you discover a new gotcha, add it to CLAUDE.md immediately

## End of Session Protocol

At the end of every session (or when asked to "wrap up" / "good night"):

1. Run the full test suite and `npm run build` — report any failures
2. **Test coverage check:** Review all new/changed code in this session — if any logic, API routes, or components were added or modified without corresponding tests, write them now. Then re-run `npm test` to confirm the new tests pass.
3. If any bot-related files were changed (SKILL.md, bot API, OPERATIONS.md):
   - Flag that OpenClaw sessions may need clearing: `rm ~/.openclaw/agents/main/sessions/*.jsonl`
   - Flag that gateway may need restarting: `launchctl stop ai.openclaw.gateway && launchctl start ai.openclaw.gateway`
4. Update this file (CLAUDE.md) with any new decisions, gotchas, or known issues
5. Append a dated entry to SESSION_LOG.md with:
   - What was worked on
   - Decisions made and why
   - Anything discovered or surprising
   - Clear next steps
6. If SESSION_LOG.md has more than 5 entries, archive older ones to `session-logs/`
7. **Ensure all code is pushed:** Check `git status` and `git log origin/main..HEAD` — if there are unpushed commits, push to origin. If there are uncommitted changes, commit them first (run build/tests before committing).
8. **Run backup:** Execute `bash ~/.openclaw/scripts/backup.sh` to sync config/secrets to the private backup repo immediately (don't wait for the 03:00 scheduled run).
9. **Clean up worktrees:** If this session used a worktree branch that has been merged to main, flag it for cleanup: `git worktree remove <path>` and `git branch -d <branch>`.

Write everything as if briefing a new version of yourself that has zero context beyond these files.

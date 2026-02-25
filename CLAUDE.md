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

| Command                   | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| `npm run build`           | Build — ALWAYS run before committing        |
| `npm test`                | Run 1121 tests (~3.7s)                      |
| `npm run test:watch`      | Watch mode                                  |
| `npm run test:coverage`   | With V8 coverage                            |
| `npm run seed`            | Reset database (blocked on production)      |
| `npm run seed:production` | Reset production DB (requires confirmation) |
| `npm run migrate`         | Run pending database migrations             |
| `npm run migrate:status`  | Show applied & pending migrations           |
| `npm run dev`             | Local dev server                            |
| `npm run lint`            | ESLint                                      |
| `npm run format`          | Prettier — format all files                 |
| `npm run format:check`    | Prettier — check formatting (CI)            |

## Development Rules

- IMPORTANT: Always run `npm run build` before committing
- IMPORTANT: When fixing a bug, always add a regression test
- Write tests for business logic, data handling, and API endpoints
- Skip tests for one-off scripts, styling, and rapid prototypes unless asked
- Environment variables go in `.env.local` (see `.env.example` for shape)
- Use feature branches for new work; commit to `main` only when ready
- IMPORTANT: Never merge to main directly — always push the feature branch, create/update a PR, and let the user review and merge. Vercel auto-deploys a preview for every PR.

## Branching Workflow (IMPORTANT — follow exactly)

A merged branch is dead. Never push more commits to a branch after its PR has been merged.

**One PR = one branch. New work = new branch.**

```
# 1. Always start new work from latest main
git fetch origin main
git checkout -b claude/<descriptive-name> origin/main

# 2. Make changes, test, build, commit, push
npm test && npm run build
git add <files> && git commit -m "..."
git push -u origin claude/<descriptive-name>

# 3. Create PR
gh pr create --title "..." --body "..."

# 4. AFTER PR is merged — IMMEDIATELY switch to a fresh branch before any more work
git fetch origin main
git checkout -b claude/<next-task-name> origin/main
# The old branch is now dead. Never go back to it.
```

**Why this matters:** In a worktree, you can't checkout `main` directly (it's used by the main repo). If you stay on a merged branch and push more commits, those commits go to a dead branch that main will never see. Every new piece of work — even a one-line follow-up fix — needs a fresh branch from `origin/main`.

**Self-check before every commit:** Run `git log origin/main..HEAD --oneline` — if you see commits that were already part of a merged PR, you're on a stale branch. Stop. Create a fresh branch from `origin/main` and cherry-pick or re-apply your changes.

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
- **`BOT_API_KEY` is required in production:** The env validation now requires `BOT_API_KEY`. The dev fallback key (`qr-bot-dev-key-2026`) still works locally/in tests but is rejected in production. Vercel production env already has the real key set.
- **`tsx` doesn't load `.env.local`:** When running `npm run seed` or `tsx scripts/*.ts`, env vars must be passed explicitly or sourced from `.env.local` — without them, libSQL falls back to `file:quiet-riots.db` (a local SQLite file) instead of the remote Turso database
- **`.env.local` should point to staging:** For day-to-day development, `.env.local` should use the staging Turso DB. Vercel Preview deployments also use staging. To get staging creds: `npx vercel env pull /tmp/vercel-preview-env --environment preview` (must run from main repo root, not a worktree). To run scripts against production, pass env vars explicitly: `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/seed-assistants.ts`
- **`npm run seed` is blocked on production:** The seed script refuses to run against production unless the `--i-know-what-im-doing` flag is passed (via `npm run seed:production`). This prevents accidental data loss. All scripts show a database banner (LOCAL/STAGING/PRODUCTION) before running.
- **`npx vercel` commands fail in worktrees:** Vercel CLI doesn't recognise worktrees as linked projects — always run from `/Users/skye/Projects/quiet-riots`
- **libSQL `datetime("now")` as column default fails:** Use `CURRENT_TIMESTAMP` or omit and set in application code
- **OpenClaw default session reset wipes memory at 4 AM:** The default `session.reset.mode` is `"daily"` with `atHour: 4`. This creates a brand new session on the first inbound message after 4 AM, so the bot loses all conversational context overnight. Fixed by setting `session.reset.mode: "idle"` with `idleMinutes: 1440` (24h) — sessions now only reset after 24 hours of inactivity. The auto-update LaunchAgent also runs at 04:00 which compounds the issue.
- **DB changes need Vercel redeployment:** After modifying production DB data directly (scripts, manual inserts), Vercel serverless functions may serve stale data from their cached function instances. Run `cd /Users/skye/Projects/quiet-riots && npx vercel --prod` to force a fresh deployment. `npm run seed` is blocked on production by default — use `npm run seed:production` only if you truly need a full reset (drops all tables).
- **Production has more data than seed:** Production has 49 issues (vs 19 in seed.ts). Never re-seed production — use targeted migration scripts that match by name instead of relying on seed-generated IDs.
- **CSP `media-src` needed for video blob playback:** Without an explicit `media-src` directive in the CSP (`src/proxy.ts`), `default-src 'self'` blocks cross-origin `<video>` loading. The video element renders with controls but content is blocked — looks like a black box that isn't clickable. Must allowlist `https://*.public.blob.vercel-storage.com` in both `img-src` and `media-src`.
- **Merged branches are dead — never reuse them:** After a PR is merged, that branch is done. Pushing more commits to it won't reach main. Always `git fetch origin main && git checkout -b claude/<new-name> origin/main` before starting any new work, even a one-line fix. This is the #1 cause of "I pushed but it didn't deploy" bugs.
- **Worktree removal kills the shell:** If the worktree directory is removed (by `git worktree remove` or any other process) while a Claude Code session is running inside it, ALL Bash commands fail permanently — the persisted cwd no longer exists and cannot be recovered. This is why worktree cleanup must be the absolute last command of a session, using `nohup` with a delay so it runs after the session exits.

## Database ID Convention

- All 17 entity tables use `TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))` — UUIDs generated in JS via `crypto.randomUUID()` and passed explicitly on INSERT (`src/lib/uuid.ts`)
- The `_migrations` table is the sole exception — keeps `INTEGER PRIMARY KEY AUTOINCREMENT` (internal tooling, no API surface)
- Tests use short readable string IDs (`'issue-rail'`, `'user-sarah'`) for determinism and clarity
- Session cookie (`qr_user_id`) stores the UUID string directly — no parseInt needed

## Known Issues

- None currently tracked

## Start of Session Protocol

At the start of every session (or when asked to "pick up where we left off"):

1. Read CLAUDE.md → SESSION_LOG.md (lightweight index) → latest session file linked from it
2. Summarise where we left off and what the priorities are
3. Run the test suite (`npm test`) and flag any issues
4. **OpenClaw health check — only if bot work is planned or user mentions bot issues:**
   - `openclaw --version` — report current version
   - `launchctl list | grep ai.openclaw.gateway` — confirm gateway is running
   - `tail -5 ~/.openclaw/logs/watchdog.log` — check for recent auto-recoveries
   - `tail -3 ~/.openclaw/logs/auto-update.log` — check if auto-update ran recently
   - If the watchdog has been restarting frequently, flag it as a connectivity issue

**Continuation sessions:** If this session continues a previous one (context compacted or "pick up where we left off"), skip the full start-of-session — just read the latest session file and continue working.

## During Session

### Code quality

- Write tests alongside new code, not as a separate pass at session end
- Run `npm test` after meaningful changes — don't batch all testing to the end
- If you discover a new gotcha, add it to CLAUDE.md immediately

### Branching & PRs

- Follow the Branching Workflow exactly — fresh branch from `origin/main` for every piece of work
- After creating a PR: wait for CI → check if production DB needs migration/seed → merge → verify deployment
- After merging a PR, immediately create a fresh branch if more work follows
- **Merge PRs within the same session they're created.** A PR left open across sessions will go stale — main moves on, the branch conflicts, and it has to be rebased or recreated. If a PR can't be merged this session (e.g. needs user review), note it in "Next steps" of the session log so the next session deals with it immediately.

### Deployment verification

- After merging to main, verify production health: `curl -s https://www.quietriots.com/api/health`
- For UI changes, verify the change is visible on production (allow ~30s for Vercel propagation)
- For CSP or header changes, verify with: `curl -sI https://www.quietriots.com | grep -i <header>`

### PR lifecycle (within a session)

- Create PR → wait for CI (`gh pr checks <number> --watch`) → merge (`gh pr merge <number> --squash --admin`) → verify deployment
- Default: merge every PR in the same session it's created. Only leave open if user explicitly requests review.

## End of Session Protocol

At the end of every session (or when asked to "wrap up" / "good night"). Steps are ordered by priority — if context is running low, the most important things happen first:

1. **Don't lose work:** Check `git status` and `git log origin/main..HEAD` — commit and push any uncommitted or unpushed changes (run `npm test && npm run build` before committing)
2. **Verify green:** Run `npm test` and `npm run build` — report any failures. If any new logic was added without tests, write them now.
3. **Session docs (commit to the current feature branch before merging):**
   - Update this file (CLAUDE.md) with any new decisions, gotchas, or known issues
   - Create a new session file in `session-logs/` with: what was worked on, decisions made and why, anything discovered or surprising, test count, PRs created/merged, clear next steps
   - Update `SESSION_LOG.md` index: set "Latest Session" pointer and "Current Priorities", add a row to "All Sessions" table
   - Commit all three files to the current branch: `git add CLAUDE.md SESSION_LOG.md session-logs/<file>`
   - Push to origin
   - **If there is an open PR for this branch:** the docs are now included — done
   - **If the PR was already merged (stale branch):** create a fresh branch from `origin/main`, cherry-pick or re-apply the docs commit, push, and create a new PR. This is the fallback, not the normal path.
4. **Check CI passes** on the PR with the session docs. If it fails, fix and push again.
5. **Merge open PRs:** Run `gh pr list --state open`. Handle each:
   - **Our PRs** (`--author Simon-Quiet-Riots`): Wait for CI (`gh pr checks <number> --watch`), then merge: `gh pr merge <number> --squash --admin`. The `--admin` flag bypasses the 1-approval branch protection rule. If `gh pr merge` fails in a worktree ("`main` already used"), use: `gh api repos/Skye-Quiet-Riots/quiet-riots/pulls/<number>/merge -X PUT -f merge_method=squash`. Don't leave PRs open across sessions.
   - **Dependabot PRs:** Check CI with `gh pr checks <number>`. Minor/patch with passing CI → `gh pr merge <number> --squash --admin`. Major bumps → evaluate. If CI is still running, skip.
6. **Run backup:** `bash ~/.openclaw/scripts/backup.sh`
7. **If bot files changed** (SKILL.md, bot API, OPERATIONS.md): flag that OpenClaw sessions may need clearing (`rm ~/.openclaw/agents/main/sessions/*.jsonl`) and gateway may need restarting
8. **Worktree cleanup (MUST be the very last command):** If this session's branch has been merged to main, run a fire-and-forget background cleanup: `nohup bash -c 'sleep 5 && cd /Users/skye/Projects/quiet-riots && git worktree remove .claude/worktrees/<name> 2>/dev/null; git branch -d <branch-names> 2>/dev/null' &>/dev/null &`. The 5-second delay lets the session exit before the worktree directory is removed. **Do not run any other commands after this** — the shell will break once the cwd is deleted.

**Key rule:** Always do steps 1–3 _before_ the final PR of the session is merged. If the user asks to deploy/merge mid-protocol, finish the docs first, then merge. The session log commit is the last commit on the branch.

Write everything as if briefing a new version of yourself that has zero context beyond these files.

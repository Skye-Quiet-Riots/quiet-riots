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

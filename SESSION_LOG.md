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

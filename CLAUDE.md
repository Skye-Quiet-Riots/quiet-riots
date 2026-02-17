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

| Command | Purpose |
|---------|---------|
| `npm run build` | Build — ALWAYS run before committing |
| `npm test` | Run 210 tests (~1.3s) |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | With V8 coverage |
| `npm run seed` | Reset database with sample data |
| `npm run dev` | Local dev server |
| `npm run lint` | ESLint |

## Development Rules

- IMPORTANT: Always run `npm run build` before committing
- IMPORTANT: When fixing a bug, always add a regression test
- Write tests for business logic, data handling, and API endpoints
- Skip tests for one-off scripts, styling, and rapid prototypes unless asked
- Environment variables go in `.env.local` (see `.env.example` for shape)
- Use feature branches for new work; commit to `main` only when ready

## Conventions

- Prefer async server components — only add `"use client"` for interactive parts
- Mobile-first CSS — design for small screens, scale up with breakpoints
- Follow existing code patterns before introducing new ones
- TypeScript strict mode — no `any` without justification

## Critical Gotchas

- **Bare domain breaks POST:** Always use `www.quietriots.com` for API URLs (307 redirect)
- **Turso queries are async:** All db queries must be awaited
- **OpenClaw BOOTSTRAP.md kills skills:** Must NOT exist in `~/.openclaw/workspace/`
- **OpenClaw session cache is sticky:** After changing SKILL.md, delete `~/.openclaw/agents/main/sessions/*.jsonl` and restart gateway

## Known Issues

- Profile page is minimal (placeholder implementation)
- Bot API has no rate limiting
- No GitHub Actions CI yet

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
2. **Test coverage check:** Review all new/changed code in this session — if any logic, API routes, or components were added or modified without corresponding tests, write them now
3. If any bot-related files were changed (SKILL.md, bot API, OPERATIONS.md):
   - Flag that OpenClaw sessions may need clearing: `rm ~/.openclaw/agents/main/sessions/*.jsonl`
   - Flag that gateway may need restarting: `launchctl stop ai.openclaw.gateway && launchctl start ai.openclaw.gateway`
3. Update this file (CLAUDE.md) with any new decisions, gotchas, or known issues
4. Append a dated entry to SESSION_LOG.md with:
   - What was worked on
   - Decisions made and why
   - Anything discovered or surprising
   - Clear next steps
5. If SESSION_LOG.md has more than 5 entries, archive older ones to `session-logs/`
6. **Ensure all code is pushed:** Check `git status` and `git log origin/main..HEAD` — if there are unpushed commits, push to origin. If there are uncommitted changes, commit them first (run build/tests before committing).
7. **Run backup:** Execute `bash ~/.openclaw/scripts/backup.sh` to sync config/secrets to the private backup repo immediately (don't wait for the 03:00 scheduled run).
8. **Clean up worktrees:** If this session used a worktree branch that has been merged to main, flag it for cleanup: `git worktree remove <path>` and `git branch -d <branch>`.

Write everything as if briefing a new version of yourself that has zero context beyond these files.

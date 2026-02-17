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
| `npm test` | Run 126 tests (~550ms) |
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

## End of Session Protocol

At the end of every session (or when asked to "wrap up"):

1. Run the full test suite and report any failures
2. Update this file (CLAUDE.md) with any new decisions, gotchas, or known issues
3. Append a dated entry to SESSION_LOG.md with:
   - What was worked on
   - Decisions made and why
   - Anything discovered or surprising
   - Clear next steps

Write everything as if briefing a new version of yourself that has zero context beyond these files.

## Start of Session Protocol

At the start of every session (or when asked to "pick up where we left off"):

1. Read CLAUDE.md and SESSION_LOG.md
2. Summarise where we left off and what the priorities are
3. Run the test suite and flag any issues before starting new work

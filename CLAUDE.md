# Quiet Riots

## Project Overview

Quiet Riots is a web application bringing the 2014 book *Quiet Riots* to life. The book is about organising people around shared issues and enabling collective action. The app serves as a platform where people can discover shared concerns, connect with others, and coordinate meaningful collective action together.

## Agent Identity

- **Name:** Simon Darling
- **Email:** simon@quietriots.com
- **GitHub:** Simon-Quiet-Riots
- **Twitter:** @simondarling
- **Project Twitter:** @quietriots

## Tech Stack

- **Framework:** Next.js 16 with React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4 (mobile-first, responsive)
- **Database:** SQLite via better-sqlite3 (WAL mode, foreign keys enabled)
- **Package manager:** npm
- **Bot integration:** OpenClaw WhatsApp agent via `/api/bot` endpoint

## Architecture

### Pages (Next.js App Router)
- `/` — Homepage with hero, trending issues, how it works, mission statement
- `/issues` — Browse all issues with category filter and search
- `/issues/[id]` — Issue detail: stats, health meter, experts, countries, pivot table, actions, feed
- `/organisations` — Browse all organisations with category filter
- `/organisations/[id]` — Organisation detail: stats, Pareto ranking, pivot table
- `/profile` — User profile page

### API Routes
- `POST /api/bot` — Single multiplexed bot endpoint (Bearer token auth, 12+ actions)
- `GET/POST /api/issues` — List/search issues
- `GET /api/issues/[id]` — Issue detail with health, countries, pivots
- `POST /api/issues/[id]/join` — Join/leave an issue
- `GET/POST /api/issues/[id]/feed` — Community feed posts
- `POST /api/issues/[id]/feed/[postId]/like` — Like a post
- `GET /api/issues/[id]/actions` — Filterable actions (type, time, skills)
- `GET /api/issues/[id]/synonyms` — Issue synonyms
- `GET /api/organisations` — List organisations
- `GET /api/organisations/[id]` — Organisation detail
- `POST /api/users` — Create/get user (signup)
- `GET /api/users/me` — Current user + joined issues
- `GET /api/users/[id]` — User by ID

### Database (11 tables)
`issues`, `organisations`, `issue_organisation` (pivot/Pareto), `synonyms`, `users` (with phone column for WhatsApp), `user_issues`, `actions`, `feed`, `community_health`, `expert_profiles`, `country_breakdown`

### Key Patterns
- **Server Components** — async server components by default, `"use client"` only for interactive parts
- **Pivot/Crosstab** — view data from two perspectives: issue→orgs OR org→issues
- **Pareto Principle** — issue-organisation relationships ranked by rioter count
- **Cookie Sessions** — `qr_user_id` httpOnly cookie, 1-year expiry
- **Phone Identity** — WhatsApp users identified by E.164 phone, auto-email `wa-{digits}@whatsapp.quietriots.com`
- **Bot API** — single POST endpoint multiplexing all operations via `{ action, params }`

### Component Structure
```
src/components/
├── cards/          # issue-card, org-card, action-card, expert-card, feed-post-card
├── data/           # health-meter, pivot-table, stat-badge, trending-indicator, country-list, category-badge, synonym-list
├── interactive/    # join-button, search-bar, feed-composer, feed-section, actions-section, category-filter, pivot-toggle, time-skill-filter
└── layout/         # nav-bar, footer, page-header
```

### Data Layer
```
src/lib/
├── db.ts           # Singleton SQLite connection
├── schema.ts       # Table creation/drop
├── session.ts      # Cookie-based auth
├── seed.ts         # 19 issues, 18 orgs, actions, feed, experts, health, countries
└── queries/        # issues.ts, organisations.ts, users.ts, actions.ts, community.ts, synonyms.ts
```

## Conventions

- Use functional React components with hooks
- Prefer server components where possible (Next.js App Router)
- Mobile-first CSS — design for small screens, scale up with breakpoints
- Keep components small and focused
- Use TypeScript strict mode
- Follow existing code patterns before introducing new ones

## Development Rules

- Always run `npm run build` before committing to ensure no TypeScript or build errors
- Use `npm run seed` to reset the database with sample data
- Environment variables go in `.env.local` (git-ignored)
- The database file `quiet-riots.db` is git-ignored — it's created on first run
- Use feature branches for new work; commit to `main` only when ready
- Bot API key is set via `BOT_API_KEY` in `.env.local` (default: `qr-bot-dev-key-2026` for dev)
- Write tests for business logic, data handling, and API endpoints
- Skip tests for one-off scripts, styling, and rapid prototypes unless asked
- When fixing a bug, always add a regression test

## WhatsApp Bot (OpenClaw)

- **Config:** `~/.openclaw/openclaw.json`
- **Skills:** `~/.openclaw/skills/quiet-riots/SKILL.md`
- **Workspace:** `~/.openclaw/workspace/` (AGENTS.md, SOUL.md, IDENTITY.md, USER.md, TOOLS.md)
- **Gateway:** macOS LaunchAgent on port 18789
- **Binary:** `/opt/homebrew/bin/openclaw`
- **Key fix:** BOOTSTRAP.md must NOT exist in workspace (overrides skill loading)
- **Session scope:** `per-channel-peer` (each WhatsApp user gets own context)
- **PATH note:** In sandbox environments, use `/opt/homebrew/bin/node` and `/opt/homebrew/bin/npm` directly

## Known Issues

- No test suite exists yet — needs unit and integration tests
- Profile page is minimal (placeholder implementation)
- No production deployment configured (Vercel/.env.production)
- Bot API has no rate limiting

## End of Session Protocol

At the end of every session (or when asked to "wrap up"):

1. Run the full test suite and report any failures
2. Update this file (CLAUDE.md) with:
   - Current project status and architecture
   - Key decisions and their reasoning
   - Known issues and bugs
   - What needs to happen next
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

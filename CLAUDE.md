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
- **Database:** Turso (libSQL) — hosted at `quietriots-skye.turso.io` (region: aws-eu-west-1, Ireland)
- **Hosting:** Vercel — custom domain `quietriots.com`, functions in `lhr1` (London)
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
├── db.ts           # Singleton Turso/libSQL connection (was better-sqlite3)
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
- **Model:** `anthropic/claude-sonnet-4-20250514` (set in openclaw.json as `agents.defaults.model.primary`)
- **Key fix:** BOOTSTRAP.md must NOT exist in workspace (overrides skill loading)
- **Session scope:** `per-channel-peer` (each WhatsApp user gets own context)
- **PATH note:** In sandbox environments, use `/opt/homebrew/bin/node` and `/opt/homebrew/bin/npm` directly
- **URL note:** SKILL.md and TOOLS.md must use `https://www.quietriots.com` (with www) — bare domain 307 redirects break POST requests
- **Session cache:** If SKILL.md URLs or behaviour change significantly, delete `~/.openclaw/agents/main/sessions/*.jsonl` and restart gateway to clear stale context
- **Polls/buttons:** Do NOT use — Baileys doesn't support them. Use plain numbered text choices instead

## Deployment

- **Vercel project:** deployed from GitHub repo `Skye-Quiet-Riots/quiet-riots`
- **Auto-deploy:** Vercel GitHub App installed on `Skye-Quiet-Riots` org — pushes to `main` trigger automatic production deployments
- **Domain:** `quietriots.com` (DNS via GoDaddy → Vercel)
- **Function region:** `lhr1` (London) — set in `vercel.json` to minimise latency to Turso in Ireland
- **Database:** Turso at `quietriots-skye.turso.io` — env vars `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel
- **Bot API:** production URL is `https://www.quietriots.com/api/bot` (must use `www.` — bare domain redirects 307 and curl doesn't follow POST redirects)
- **Manual deploy fallback:** `npx vercel --prod` from project root (used before GitHub App was connected)

## WhatsApp Bot UX

- **Numbered choices:** Bot uses plain numbered text options (1, 2, 3) — NOT polls or buttons (Baileys doesn't support them reliably)
- **Always 3 choices:** Every message ends with exactly 3 numbered choices, preceded by "choose 1, 2 or 3:"
- **First message exception:** The welcome message has no choices — lets the user speak freely first
- **Terminology:** Always "Quiet Riot" (never "movement"), always "Quiet Rioters" (never "rioters" alone)
- **Conversation flow:** Welcome → Search/Match → Join/Pivot → Actions → Community → Experts → Mission
- **Model:** Claude Sonnet (changed from Opus for speed — ~10s vs ~67s response time)

## Testing

- **Framework:** Vitest 4 with `@vitest/coverage-v8`
- **Config:** `vitest.config.ts` — node environment, `@/*` path alias, coverage for `src/lib/**` and `src/app/api/**`
- **Test count:** 126 tests across 12 files (~550ms)
- **Database isolation:** In-memory libSQL (`file::memory:`) injected via `_setTestDb()` in `db.ts` — each test file gets its own clean database
- **Session mocking:** `vi.mock('next/headers')` with `mockLoggedIn(userId)` / `mockLoggedOut()` helpers for cookie-based auth routes
- **Test helpers:** `src/test/setup-db.ts` (create/teardown), `src/test/seed-test-data.ts` (minimal seed), `src/test/api-helpers.ts` (request builders)
- **Scripts:** `npm test` (run once), `npm run test:watch` (watch mode), `npm run test:coverage` (with V8 coverage)

## Branding & Social

- **Favicon:** Custom chicken icon with "QR" text (`src/app/favicon.ico`, multi-size .ico generated from `/Users/skye/Documents/Chicken QR logo.jpeg`)
- **Browser tab title:** "Quiet Riots — Change. Finally."
- **Open Graph tags:** `og:title`, `og:image` (1200×630 chicken on blue), `og:description`, `og:url`, `og:site_name`, Twitter card — all in `layout.tsx` metadata
- **OG image:** `public/og-image.jpg` — chicken filling full height on blue background, served at `https://www.quietriots.com/og-image.jpg`
- **Logo assets:** `public/logo-192.png`, `public/logo-512.png` — chicken icon at standard sizes
- **Apple touch icon:** `public/logo-192.png` (set via `metadata.icons.apple` in layout.tsx)

## Sleep Prevention (24/7 Operation)

- **LaunchAgent:** `~/Library/LaunchAgents/com.quietriots.nosleep.plist`
- **Command:** `caffeinate -s` (prevents system sleep including lid close)
- **Persistence:** `KeepAlive` + `RunAtLoad` — starts on boot, restarts if killed
- **Purpose:** Keeps laptop running 24/7 for WhatsApp bot (OpenClaw gateway)
- **Manage:** `launchctl load/unload ~/Library/LaunchAgents/com.quietriots.nosleep.plist`

## WhatsApp Watchdog (Auto-Recovery)

- **Problem:** When WiFi drops, the WhatsApp WebSocket dies (`ENOTFOUND web.whatsapp.com`) and the channel exits fatally — the gateway process stays running but the WhatsApp channel inside it is dead and never auto-reconnects
- **Script:** `~/.openclaw/scripts/watchdog.sh` — checks every 2 minutes if the WhatsApp channel has fatally exited and restarts the gateway once network is back
- **LaunchAgent:** `~/Library/LaunchAgents/com.quietriots.openclaw-watchdog.plist` — runs watchdog every 120s via `StartInterval`
- **Logic:** Compares timestamp of last `channel exited` in `gateway.err.log` vs last `Listening for personal WhatsApp` in `gateway.log` — if exit is more recent, restarts
- **Safety:** Skips restart if `web.whatsapp.com` is unresolvable (no point restarting without network)
- **Log:** `~/.openclaw/logs/watchdog.log`
- **Manage:** `launchctl load/unload ~/Library/LaunchAgents/com.quietriots.openclaw-watchdog.plist`

## Known Issues

- Profile page is minimal (placeholder implementation)
- Bot API has no rate limiting
- WhatsApp polls and interactive buttons don't work via Baileys — use numbered text choices instead

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

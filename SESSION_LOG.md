# Session Log

## 2026-02-15 — WhatsApp Bot Sync & Project Polish

### What was worked on
- **Fixed WhatsApp bot not using live data** — Root cause: `BOOTSTRAP.md` in the OpenClaw workspace was overriding the quiet-riots skill. Every new per-peer session ran the onboarding flow ("You just woke up. Time to figure out who you are.") instead of calling the API. Deleted BOOTSTRAP.md, rewrote SOUL.md/IDENTITY.md/USER.md with Quiet Riots identity, added strong skill instruction to AGENTS.md, cleared stale sessions, restarted gateway.
- **Verified end-to-end sync** — Bot API `identify`, `join_issue`, `post_feed` all working. Data flows both ways: WhatsApp actions appear in web app database, web app data is returned to WhatsApp users.
- **Disabled 🐔 ackReaction on WhatsApp DMs** — Set `ackReaction.direct: false` in openclaw.json.
- **Renamed "Southern Rail Cancellations" → "Rail Cancellations"** — Updated seed.ts, re-seeded database.
- **Updated founder identity** — Changed from "Skye" to "Simon Darling" across all CLAUDE.md files. Added Twitter handles @simondarling and @quietriots.
- **Added Development Rules, End/Start of Session Protocols to CLAUDE.md** — Full project documentation with architecture, component structure, data layer, known issues.
- **Committed and pushed** — 64 files, 4,299 insertions, pushed to origin/main (commit `122ea91`).

### Key decisions
- Single bot API endpoint (`/api/bot`) multiplexing all operations rather than teaching the bot 14 different routes
- Phone-based identity for WhatsApp users (E.164 format, auto-generated email)
- Cookie-based sessions for web app, Bearer token auth for bot API
- BOOTSTRAP.md must never exist in OpenClaw workspace — it overrides skill loading

### Discoveries
- OpenClaw skills need YAML frontmatter (`---\nname: ...\ndescription: ...\n---`) to be loaded
- `BOOTSTRAP.md` takes priority over skills in AGENTS.md — "If BOOTSTRAP.md exists, that's your birth certificate. Follow it"
- Session `skillsSnapshot` is captured at session creation time — if a skill is added later, old sessions won't have it (must clear sessions)
- In sandbox environments, `node`/`npm`/`openclaw` aren't on PATH — use `/opt/homebrew/bin/` full paths

### Next steps
- Add unit and integration tests (none exist yet)
- Flesh out profile page (currently minimal/placeholder)
- Set up production deployment (Vercel)
- Add rate limiting to bot API
- Consider adding authentication beyond cookie sessions (for sensitive operations)

---

## 2026-02-15 (Session 2) — Production Deployment & WhatsApp Bot UX

### What was worked on

1. **Database migration: better-sqlite3 → Turso (@libsql/client)**
   - Migrated all query files from synchronous better-sqlite3 to async Turso client
   - Database hosted at `quietriots-skye.turso.io` (aws-eu-west-1, Ireland)
   - Committed 32 files in migration commit `4dd32bb`

2. **Vercel deployment & custom domain**
   - Deployed to Vercel from GitHub repo
   - Set up `quietriots.com` domain via GoDaddy DNS (A record + CNAME pointing to Vercel)
   - Important: Vercel gave project-specific DNS values, not generic ones

3. **WhatsApp bot production URL fix**
   - SKILL.md and TOOLS.md were pointing at `localhost:3000` — bot said "service offline"
   - Updated to `https://www.quietriots.com/api/bot` (must use `www.` because bare domain 307 redirects break POST)
   - Had to delete cached sessions (`~/.openclaw/agents/main/sessions/*.jsonl`) because old URLs were baked into session context

4. **Bot model change: Opus → Sonnet**
   - Bot was taking ~67s per response on Opus
   - Changed to Sonnet via `openclaw config set agents.defaults.model.primary` — response time dropped to ~10s
   - Config requires object format (`agents.defaults.model.primary`), not string

5. **WhatsApp bot UX overhaul**
   - Tried polls first — don't work on Baileys (WhatsApp Web emulation)
   - Rewrote SKILL.md completely with plain numbered text choices (1, 2, 3)
   - Always exactly 3 choices, always preceded by "choose 1, 2 or 3:"
   - First welcome message is the exception — lets user vent freely, no choices
   - Full conversation flow: Welcome → Search/Match → Join/Pivot → Actions → Community → Experts → Mission
   - Terminology rules: "Quiet Riot" not "movement", "Quiet Rioters" not "rioters"
   - No emoji icons next to numbered choices

6. **API performance optimisation**
   - Parallelised database queries with `Promise.all` in bot route (get_issue: 5 queries, get_community: 4 queries, get_org_pivot: 2 queries)
   - Set Vercel function region to `lhr1` (London) via `vercel.json` to reduce cross-Atlantic latency to Turso in Ireland
   - get_issue: 665ms → 342ms, get_community: 350ms → 130ms

7. **Claude Code permissions**
   - Changed `~/.claude/settings.json` from individual command allowlist to `Bash(*)` to allow all commands

### Key decisions
- **Use `www.` for API URLs** — bare `quietriots.com` returns 307 redirect, and curl doesn't follow POST redirects automatically
- **Numbered choices over polls/buttons** — Baileys (WhatsApp Web protocol) doesn't support interactive buttons or polls reliably. Plain text is the most compatible
- **Sonnet over Opus for bot** — 7x faster response time, quality is sufficient for conversational bot
- **London region for Vercel functions** — closest to Turso in Ireland, halved query latency
- **Promise.all for independent queries** — simple win, no code complexity, significant latency reduction

### Discoveries
- Vercel `regions` in vercel.json controls where serverless functions run, not where static content is served
- OpenClaw model config must be set as an object path (`agents.defaults.model.primary`), not a flat string — validation rejects strings
- Cached OpenClaw sessions bake in the skill file content at session creation time — URL changes require clearing sessions
- GoDaddy `_domainconnect` CNAME record is for domain management features — leave it alone when adding Vercel records
- WhatsApp gateway restart (SIGTERM) kills in-flight message processing — messages received in the ~2s before restart are lost

### Next steps
- Add unit and integration tests (still none — this is the biggest gap)
- Flesh out profile page
- Add rate limiting to bot API
- Consider adding a `create_issue` action to the bot API (currently users can only join existing issues)
- Monitor Turso latency in production and consider read replicas if needed
- Test WhatsApp bot with real users beyond the developer

---

## 2026-02-15 (Session 3) — Tests, Branding, DevOps & Sleep Prevention

### What was worked on

1. **Comprehensive test suite (126 tests)**
   - Installed Vitest 4 + @vitest/coverage-v8
   - Created `vitest.config.ts` with `@/*` path alias and coverage config
   - Built test infrastructure: `src/test/setup-db.ts` (in-memory libSQL), `src/test/seed-test-data.ts` (minimal seed data), `src/test/api-helpers.ts` (request builders)
   - Added `_setTestDb()` / `_resetDb()` exports to `src/lib/db.ts` for test database injection
   - 6 query test files (70 tests): issues, organisations, users, actions, community, synonyms
   - 6 API route test files (56 tests): bot (24 tests covering all 13 actions + auth), issues, feed, join, organisations, users
   - Session-authenticated routes tested via `vi.mock('next/headers')` with `mockLoggedIn`/`mockLoggedOut` helpers
   - All 126 tests pass in ~550ms
   - Committed as `7f29de7`

2. **Branding overhaul**
   - Replaced default Next.js favicon with chicken icon (multi-size .ico from `Chicken QR logo.jpeg`)
   - Changed browser tab title: "Quiet Riots — Collective Action Starts Here" → "Quiet Riots — Change. Finally."
   - Added complete Open Graph meta tags (og:title, og:image, og:description, og:url, og:site_name, og:type)
   - Added Twitter card meta tags (summary_large_image)
   - Created `public/og-image.jpg` (1200×630, chicken on blue background, filling full height)
   - Created `public/logo-192.png` and `public/logo-512.png` for apple-touch-icon and PWA
   - Iterated OG image 3 times: dark background → blue with small chicken → blue with full-height chicken (per user feedback on WhatsApp preview appearance)
   - Committed across commits `8231048`, `cc3b697`, `0a33d50`

3. **Sleep prevention (24/7 operation)**
   - Created macOS LaunchAgent at `~/Library/LaunchAgents/com.quietriots.nosleep.plist`
   - Runs `caffeinate -s` (prevents system sleep including lid close)
   - `KeepAlive` + `RunAtLoad` ensures it starts on boot and restarts if killed
   - Loaded and verified running (PID confirmed via `launchctl list`)

4. **Vercel GitHub integration (auto-deploy)**
   - Discovered pushes to GitHub were NOT triggering Vercel deployments — no webhooks on the repo
   - Root cause: Vercel GitHub App was not installed on the `Skye-Quiet-Riots` GitHub account
   - Installed Vercel GitHub App via GitHub settings (granted access to all repositories)
   - Connected `Skye-Quiet-Riots/quiet-riots` repo to Vercel project via Git settings page
   - Verified auto-deploy: test push triggered build automatically ("Automatically created for pushes to Skye-Quiet-Riots/quiet-riots")
   - No more need for manual `npx vercel --prod`

5. **Developer experience fixes**
   - Fixed Claude Code permissions: project-level `settings.local.json` had an old granular allowlist overriding global `Bash(*)`
   - Recommended best practices: .env.example, GitHub Actions CI, pre-commit hooks, security headers, README, database migrations, error monitoring

### Key decisions
- **In-memory libSQL for test isolation** — each test file gets a fresh `file::memory:` database rather than using mocks. Tests run against real SQL, catching query bugs that mocks would miss
- **`_setTestDb()` injection pattern** — chosen over `vi.mock` (fragile across 6 query modules) and env vars (doesn't support parallel test files)
- **Full-height chicken OG image** — iterated 3 times based on WhatsApp preview feedback. WhatsApp shows a small square crop, so maximising the chicken in the frame makes it recognisable
- **caffeinate -s over pmset** — simpler, no sudo required, LaunchAgent pattern ensures persistence across reboots

### Discoveries
- **WhatsApp uses Open Graph tags for link previews**, not `<title>` or `favicon.ico`. Without `og:` meta tags, WhatsApp shows whatever it can scrape (often the old cached version)
- **WhatsApp aggressively caches link previews** — old previews in existing messages won't update. Must send link in a new message to see changes
- **Vercel GitHub App must be installed on the GitHub account** (not just having the repo connected). Without it, there are no webhooks and pushes are silently ignored
- **Vercel CDN caches static pages** — after deployment, pages can still serve stale HTML until the cache age expires. `x-vercel-cache: HIT` with high `age` header confirms this
- **Pillow `.save()` for .ico** — use `append_images` parameter with the largest image first to get proper multi-size favicon. The `sizes` parameter alone doesn't embed multiple sizes
- **Next.js 16 TypeScript strictness** — `RequestInit` type from standard lib is incompatible with Next.js `RequestInit` for `NextRequest` constructor. Must construct headers/body separately

### Next steps
- Flesh out profile page
- Add rate limiting to bot API
- Consider `create_issue` bot action (users can currently only join existing issues)
- Set up GitHub Actions CI (run tests on PR/push)
- Add `.env.example` for developer onboarding
- Monitor WhatsApp bot with real users
- Consider adding security headers (CSP, HSTS) to `next.config.ts`

---

## 2026-02-17 (Session 4) — WhatsApp Bot Reliability & Watchdog

### What was worked on

1. **Diagnosed WhatsApp bot not responding**
   - Bot was silent when a friend messaged it
   - Root cause: WiFi had dropped, causing `ENOTFOUND web.whatsapp.com` — the WhatsApp WebSocket channel exited fatally but the gateway process stayed running
   - OpenClaw's gateway doesn't auto-reconnect the WhatsApp channel after a DNS failure — the process looks alive (`launchctl list` shows it) but the channel is dead
   - Manually restarted gateway to fix immediately
   - This happened twice in one day (07:42 and 11:02)

2. **Built WhatsApp watchdog for auto-recovery**
   - Created `~/.openclaw/scripts/watchdog.sh` — a bash script that:
     - Checks if `web.whatsapp.com` is resolvable (skips if no network)
     - Compares timestamps of last fatal `channel exited` in `gateway.err.log` vs last `Listening for personal WhatsApp` in `gateway.log`
     - If exit is more recent than last listen → restarts gateway via `launchctl stop/start`
     - Logs all actions to `~/.openclaw/logs/watchdog.log`
   - Created LaunchAgent `~/Library/LaunchAgents/com.quietriots.openclaw-watchdog.plist` running every 120 seconds
   - Verified with debug trace: correctly identifies healthy vs dead state

3. **Verified production health**
   - Tests: 126/126 passing
   - Build: clean
   - Production site: `quietriots.com` live and serving correct OG tags
   - WhatsApp bot: responding to messages after restart
   - Two real users chatted with the bot during this session

### Key decisions
- **Watchdog over OpenClaw code fix** — the channel exit bug is in OpenClaw's Baileys integration, not our code. A watchdog is the pragmatic fix since we can't modify OpenClaw's source
- **2-minute interval** — frequent enough to recover quickly, infrequent enough not to waste resources. DNS check prevents pointless restarts while offline
- **Timestamp comparison over process monitoring** — checking the gateway PID alone isn't enough since the process stays running when the channel dies. Comparing log timestamps catches the specific failure mode

### Discoveries
- **OpenClaw doesn't auto-reconnect WhatsApp on DNS failure** — the 12-retry mechanism handles temporary WebSocket drops (status 408, 428, 499) but a DNS resolution failure (`ENOTFOUND`) is treated as fatal and the channel exits permanently
- **The gateway process survives channel death** — `launchctl list` shows the gateway running but WhatsApp is dead inside it. KeepAlive doesn't help because the process hasn't actually exited
- **Network interface changes cause mDNS crashes** — repeated `AssertionError: Reached illegal state! IPV4 address change from defined to undefined!` in OpenClaw's @homebridge/ciao dependency when WiFi toggles. These are unhandled but don't seem to cause the channel exit directly
- **Real users are chatting with the bot** — two different phone numbers (+880 and +44) actively conversed during this session

### Next steps
- Flesh out profile page
- Add rate limiting to bot API
- Consider `create_issue` bot action
- Set up GitHub Actions CI
- Add `.env.example`
- Consider upgrading OpenClaw (`v2026.2.15` available) — may fix the reconnection bug
- Monitor watchdog log to confirm it catches future WiFi drops automatically

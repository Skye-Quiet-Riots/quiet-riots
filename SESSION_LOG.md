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

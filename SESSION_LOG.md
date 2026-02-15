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

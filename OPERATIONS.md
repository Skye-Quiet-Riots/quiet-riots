# Quiet Riots — Operations & Infrastructure

## Deployment
- **Vercel project:** deployed from GitHub repo `Skye-Quiet-Riots/quiet-riots`
- **Auto-deploy:** Vercel GitHub App installed on `Skye-Quiet-Riots` org — pushes to `main` trigger automatic production deployments
- **Domain:** `quietriots.com` (DNS via GoDaddy → Vercel)
- **Function region:** `lhr1` (London) — set in `vercel.json` to minimise latency to Turso in Ireland
- **Database:** Turso at `quietriots-skye.turso.io` — env vars `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel
- **Bot API:** production URL is `https://www.quietriots.com/api/bot` (must use `www.` — bare domain redirects 307 and curl doesn't follow POST redirects)
- **Manual deploy fallback:** `npx vercel --prod` from project root

## WhatsApp Bot (OpenClaw)
- **Config:** `~/.openclaw/openclaw.json`
- **Skills:** `~/.openclaw/skills/quiet-riots/SKILL.md`
- **Workspace:** `~/.openclaw/workspace/` (AGENTS.md, SOUL.md, IDENTITY.md, USER.md, TOOLS.md)
- **Gateway:** macOS LaunchAgent on port 18789
- **Binary:** `/opt/homebrew/bin/openclaw`
- **Model:** `anthropic/claude-sonnet-4-20250514` (set in openclaw.json as `agents.defaults.model.primary`)
- **IMPORTANT:** BOOTSTRAP.md must NOT exist in workspace (overrides skill loading)
- **Session scope:** `per-channel-peer` (each WhatsApp user gets own context)
- **PATH note:** In sandbox environments, use `/opt/homebrew/bin/node` and `/opt/homebrew/bin/npm` directly
- **URL note:** SKILL.md and TOOLS.md must use `https://www.quietriots.com` (with www) — bare domain 307 redirects break POST requests
- **Session cache:** If SKILL.md URLs or behaviour change significantly, delete `~/.openclaw/agents/main/sessions/*.jsonl` and restart gateway to clear stale context
- **Polls/buttons:** Do NOT use — Baileys doesn't support them. Use plain numbered text choices instead

## WhatsApp Bot UX
- **Numbered choices:** Bot uses plain numbered text options (1, 2, 3) — NOT polls or buttons
- **Always 3 choices:** Every message ends with exactly 3 numbered choices, preceded by "choose 1, 2 or 3:"
- **First message exception:** The welcome message has no choices — lets the user speak freely first
- **Terminology:** Always "Quiet Riot" (never "movement"), always "Quiet Rioters" (never "rioters" alone)
- **Conversation flow:** Welcome → Search/Match → Join/Pivot → Actions → Community → Experts → Mission

## Sleep Prevention (24/7 Operation)
- **LaunchAgent:** `~/Library/LaunchAgents/com.quietriots.nosleep.plist`
- **Command:** `caffeinate -s` (prevents system sleep including lid close)
- **Persistence:** `KeepAlive` + `RunAtLoad` — starts on boot, restarts if killed
- **Manage:** `launchctl load/unload ~/Library/LaunchAgents/com.quietriots.nosleep.plist`

## WhatsApp Watchdog (Auto-Recovery)
- **Problem:** When WiFi drops, the WhatsApp WebSocket dies and the channel exits fatally — gateway stays running but WhatsApp is dead
- **Script:** `~/.openclaw/scripts/watchdog.sh` — checks every 2 minutes, restarts gateway once network is back
- **LaunchAgent:** `~/Library/LaunchAgents/com.quietriots.openclaw-watchdog.plist` (120s interval)
- **Logic:** Compares timestamp of last `channel exited` in `gateway.err.log` vs last `Listening for personal WhatsApp` in `gateway.log`
- **Log:** `~/.openclaw/logs/watchdog.log`
- **Manage:** `launchctl load/unload ~/Library/LaunchAgents/com.quietriots.openclaw-watchdog.plist`

## OpenClaw Auto-Update (Daily)
- **Script:** `~/.openclaw/scripts/auto-update.sh` — runs `openclaw update --yes` non-interactively
- **LaunchAgent:** `~/Library/LaunchAgents/com.quietriots.openclaw-update.plist` — daily at 04:00
- **Behaviour:** Checks network first, skips if npm registry unreachable. Logs current→new version. Auto-restarts gateway on successful update.
- **Log:** `~/.openclaw/logs/auto-update.log`
- **Manage:** `launchctl load/unload ~/Library/LaunchAgents/com.quietriots.openclaw-update.plist`
- **Manual update:** `openclaw update --yes` or `openclaw update wizard` for interactive

## Log Rotation (Daily)
- **Script:** `~/.openclaw/scripts/log-rotate.sh` — rotates logs over 10MB, keeps 3 copies (.1, .2, .3)
- **LaunchAgent:** `~/Library/LaunchAgents/com.quietriots.openclaw-logrotate.plist` — daily at 03:30
- **Covers:** gateway.log, gateway.err.log, watchdog.log, auto-update.log
- **Log:** `~/.openclaw/logs/log-rotate.log`
- **Manage:** `launchctl load/unload ~/Library/LaunchAgents/com.quietriots.openclaw-logrotate.plist`

## Daily Backup (Private GitHub Repo)
- **Repo:** `Skye-Quiet-Riots/quiet-riots-backup` (private)
- **Script:** `~/.openclaw/scripts/backup.sh` — copies config, encrypts secrets, pushes to GitHub
- **LaunchAgent:** `~/Library/LaunchAgents/com.quietriots.backup.plist` — daily at 03:00
- **Encryption:** AES-256-CBC via openssl, passphrase at `~/.openclaw/.backup-passphrase`
- **IMPORTANT:** Store the passphrase somewhere safe outside this laptop (password manager)
- **Log:** `~/.openclaw/logs/backup.log`
- **Manage:** `launchctl load/unload ~/Library/LaunchAgents/com.quietriots.backup.plist`
- **Manual backup:** `bash ~/.openclaw/scripts/backup.sh`
- **Restore guide:** See `RESTORE.md` in the backup repo

### What's backed up
| Directory | Contents | Encrypted? |
|-----------|----------|------------|
| `openclaw-config/` | openclaw.json (gateway auth token) | Yes |
| `openclaw-workspace/` | AGENTS.md, SOUL.md, IDENTITY.md, USER.md, TOOLS.md | No |
| `openclaw-skills/` | SKILL.md (bot conversation flows) | No |
| `openclaw-scripts/` | watchdog, auto-update, log-rotate, backup scripts | No |
| `launchagents/` | All 6 .plist files | No |
| `secrets/` | .env.local (Turso credentials, API keys) | Yes |
| `claude-settings/` | Claude Code settings.json | No |

### What's NOT backed up (and why)
- **WhatsApp credentials** — session-based, re-scan QR code to restore (~10 min)
- **OpenClaw sessions** — ephemeral user conversations, regenerated on use
- **Gateway logs** — operational, not worth preserving

## All LaunchAgents Summary

| Agent | Label | Schedule | Purpose |
|-------|-------|----------|---------|
| Sleep prevention | `com.quietriots.nosleep` | Always (KeepAlive) | `caffeinate -s` |
| OpenClaw gateway | `ai.openclaw.gateway` | Always (KeepAlive) | WhatsApp bot |
| Watchdog | `com.quietriots.openclaw-watchdog` | Every 120s | Restart gateway after WiFi drops |
| Backup | `com.quietriots.backup` | Daily 03:00 | Encrypted backup to GitHub |
| Log rotation | `com.quietriots.openclaw-logrotate` | Daily 03:30 | Rotate logs over 10MB |
| Auto-update | `com.quietriots.openclaw-update` | Daily 04:00 | Update OpenClaw + restart gateway |

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

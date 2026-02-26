#!/bin/bash
# ──────────────────────────────────────────────────────────
# WhatsApp Message Delivery via Polling
# Polls Vercel API for undelivered messages, sends via OpenClaw, marks delivered.
# Runs every 5s via LaunchAgent (com.quietriots.message-delivery).
# Same pattern as deliver-otp-codes.sh — see OPERATIONS.md.
# ──────────────────────────────────────────────────────────

set -euo pipefail

LOGFILE="$HOME/.openclaw/logs/message-delivery.log"
OPENCLAW="/opt/homebrew/bin/openclaw"
JQ="/opt/homebrew/bin/jq"
API_URL="https://www.quietriots.com/api/bot"

# Production bot API key — this script always talks to production Vercel.
# The .env.local key is the dev fallback which production rejects, so we
# hardcode the production key here. Same key as OTP delivery script,
# Vercel env vars, OpenClaw SKILL.md, and TOOLS.md.
BOT_API_KEY="qr-xx21iIL4s2cepF9WVzHwwlL7QslY4boQGJHEWFYNA1U"

log() { echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') $1" >> "$LOGFILE"; }

# Ensure log directory exists
mkdir -p "$(dirname "$LOGFILE")"

# Skip if OpenClaw gateway not running
if ! pgrep -f "openclaw.*gateway" > /dev/null 2>&1; then
  exit 0
fi

# Skip if jq not installed
if [ ! -x "$JQ" ]; then
  log "ERROR: jq not found at $JQ"
  exit 1
fi

# Fetch undelivered messages from production API
RESPONSE=$(curl -sf -m 10 \
  -H "Authorization: Bearer $BOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"get_undelivered_messages","params":{}}' \
  "$API_URL" 2>/dev/null) || exit 0  # Network error — silent, will retry in 5s

# Check if any messages to deliver
COUNT=$($JQ -r '.data.messages | length' <<< "$RESPONSE" 2>/dev/null)
if [ "$COUNT" = "0" ] || [ "$COUNT" = "null" ] || [ -z "$COUNT" ]; then
  exit 0
fi

# Deliver each message via WhatsApp
$JQ -c '.data.messages[]' <<< "$RESPONSE" 2>/dev/null | while read -r MSG_OBJ; do
  PHONE=$($JQ -r '.phone' <<< "$MSG_OBJ")
  MSG=$($JQ -r '.whatsapp_message' <<< "$MSG_OBJ")
  ID=$($JQ -r '.id' <<< "$MSG_OBJ")

  # Send via OpenClaw WhatsApp
  if "$OPENCLAW" message send --channel whatsapp --target "$PHONE" --message "$MSG" --json 2>/dev/null; then
    # Mark as delivered in production DB
    curl -sf -m 10 \
      -H "Authorization: Bearer $BOT_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"action\":\"mark_message_delivered\",\"params\":{\"message_id\":\"$ID\"}}" \
      "$API_URL" > /dev/null 2>&1
    log "DELIVERED message $ID to $PHONE"
  else
    log "FAILED message $ID to $PHONE (attempt will retry)"
  fi
done

---
paths:
  - 'src/app/api/bot/**'
---

# Bot API Rules

- Single multiplexed POST endpoint at `/api/bot`
- All operations dispatched via `{ action, params }` JSON body
- 17 actions: identify, search_issues, get_trending, get_issue, get_actions, get_community, join_issue, leave_issue, post_feed, get_org_pivot, get_orgs, add_synonym, update_user, create_issue, get_riot_reel, submit_riot_reel
- Phone identity: WhatsApp users identified by E.164 phone number
- Auto-generated email: `wa-{digits}@whatsapp.quietriots.com`
- Production URL must use `www.quietriots.com` (bare domain 307 redirects break POST)
- Rate limiting: sliding-window in-memory limiter (30 req/60s per IP)
- Riot Reels: `get_riot_reel` returns an unseen reel for the user (logs shown, increments views); `submit_riot_reel` creates a pending reel from a YouTube URL

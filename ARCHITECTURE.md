# Quiet Riots — Architecture Reference

## Pages (Next.js App Router)

- `/` — Homepage with hero, trending issues, riot reel of the day, how it works, mission statement
- `/issues` — Browse all issues with category filter and search
- `/issues/[id]` — Issue detail: stats, health meter, experts, countries, pivot table, actions, campaigns, riot reels, feed
- `/organisations` — Browse all organisations with category filter
- `/organisations/[id]` — Organisation detail: stats, Pareto ranking, pivot table
- `/wallet` — Wallet dashboard: balance, top-up, active campaigns, transaction history
- `/campaigns` — Browse all campaigns with status filter (active/funded/disbursed)
- `/campaigns/[id]` — Campaign detail: progress, stats, contribute form
- `/profile` — User profile page
- `/assistants` — Browse all 16 category assistant pairs (AI agent + human organiser)
- `/assistants/[category]` — Assistant pair profile: dual cards, activity feed, riots, claim form

## API Routes

- `POST /api/bot` — Single multiplexed bot endpoint (Bearer token auth, 20+ actions)
- `GET/POST /api/issues` — List/search issues
- `GET /api/issues/[id]` — Issue detail with health, countries, pivots
- `POST /api/issues/[id]/join` — Join/leave an issue
- `GET/POST /api/issues/[id]/feed` — Community feed posts
- `POST /api/issues/[id]/feed/[postId]/like` — Like a post
- `GET /api/issues/[id]/actions` — Filterable actions (type, time, skills)
- `GET /api/issues/[id]/synonyms` — Issue synonyms
- `GET/POST /api/issues/[id]/reels` — Riot reels for issue (GET approved, POST submit)
- `POST /api/issues/[id]/reels/[reelId]/vote` — Upvote a reel
- `GET /api/reels/trending` — Top reels across all issues (last 7 days)
- `GET /api/organisations` — List organisations
- `GET /api/organisations/[id]` — Organisation detail
- `POST /api/users` — Create/get user (signup)
- `GET /api/users/me` — Current user + joined issues
- `GET /api/users/[id]` — User by ID
- `GET /api/wallet` — Wallet balance (cookie auth)
- `GET /api/wallet/history` — Transaction history (cookie auth)
- `POST /api/wallet/topup` — Create topup (cookie auth, rate limited)
- `POST /api/wallet/contribute` — Contribute to campaign (cookie auth, rate limited)
- `GET/POST /api/campaigns` — List campaigns (public, cached) / Create campaign (bot auth)
- `GET /api/campaigns/[id]` — Campaign detail (public, cached)
- `GET /api/assistants` — All 16 assistant pairs with stats (public, cached)
- `GET /api/assistants/[category]` — Assistant pair detail (public, cached)
- `GET /api/assistants/[category]/activity` — Paginated activity feed (public, cached)
- `POST /api/assistants/[category]/claim` — Express interest in human role (cookie auth, rate limited)
- `GET/POST /api/users/[id]/met-assistants` — Track which assistants a user has met
- `POST /api/suggestions` — Submit suggestion (creates idea action + assistant activity)
- `GET /api/health` — Health check (db connectivity)

## Database (28 tables)

`issues` (with per-riot assistant copy fields), `organisations`, `issue_organisation` (pivot/Pareto), `synonyms`, `users` (with phone column for WhatsApp + profile/i18n/auth fields), `user_issues`, `actions`, `feed`, `community_health`, `expert_profiles`, `country_breakdown`, `riot_reels` (YouTube videos per issue), `reel_votes` (user upvotes), `reel_shown_log` (tracks which reels a user has seen), `wallets` (one per user, balance in pence), `wallet_transactions` (topup/contribute/refund), `campaigns` (per-issue funding targets), `category_assistants` (16 pairs, one per issue category), `user_assistant_introductions` (tracks which pairs a user has met), `assistant_activity` (log of assistant actions), `assistant_claims` (humans expressing interest in a role), `languages` (i18n reference with RTL support), `countries` (249 countries with currency/phone prefix), `translations` (generic entity translation), `accounts` (OAuth provider linking), `verification_tokens` (magic links), `legal_documents` (country-specific T&Cs), `user_consents` (consent tracking)

## Key Patterns

- **Server Components** — async server components by default, `"use client"` only for interactive parts
- **Pivot/Crosstab** — view data from two perspectives: issue→orgs OR org→issues
- **Pareto Principle** — issue-organisation relationships ranked by rioter count
- **Cookie Sessions** — `qr_user_id` httpOnly cookie, 1-year expiry
- **Phone Identity** — WhatsApp users identified by E.164 phone, auto-email `wa-{digits}@whatsapp.quietriots.com`
- **Bot API** — single POST endpoint multiplexing all operations via `{ action, params }`
- **Riot Wallet** — pre-loaded wallet for micropayments; atomic debit+credit via `db.batch()`
- **Category Assistants** — every issue category gets an AI agent + human organiser pair

## Component Structure

```
src/components/
├── cards/          # issue-card, org-card, action-card, expert-card, feed-post-card, reel-card, campaign-card, assistant-card
├── data/           # health-meter, pivot-table, stat-badge, trending-indicator, country-list, category-badge, synonym-list, campaign-progress, wallet-balance, transaction-list, assistant-profile, assistant-activity-list
├── interactive/    # join-button, search-bar, feed-composer, feed-section, actions-section, category-filter, pivot-toggle, time-skill-filter, reels-section, topup-form, contribute-form, status-filter, claim-form
└── layout/         # nav-bar, footer, page-header
```

## Data Layer

```
src/lib/
├── db.ts             # Singleton Turso/libSQL connection
├── schema.ts         # Table creation/drop
├── session.ts        # Cookie-based auth
├── seed.ts           # 19 issues, 18 orgs, actions, feed, experts, health, countries, riot reels, campaigns
├── youtube.ts        # YouTube URL parsing (extractVideoId) and oEmbed metadata fetching
├── env.ts            # Environment variable validation (runs at startup)
├── rate-limit.ts     # Sliding-window in-memory rate limiter
├── api-response.ts   # Standardised API response helpers (apiSuccess, apiError, apiValidationError)
├── format.ts         # Shared formatting utilities (formatPence)
└── queries/          # issues.ts, organisations.ts, users.ts, actions.ts, community.ts, synonyms.ts, reels.ts, wallet.ts, campaigns.ts, assistants.ts
```

## Infrastructure

```
src/proxy.ts            # Nonce-based CSP, security headers, cache headers for GET APIs
src/instrumentation.ts  # Env validation + Sentry server/edge init
sentry.client.config.ts # Sentry browser SDK (replay, performance)
sentry.server.config.ts # Sentry Node.js SDK
sentry.edge.config.ts   # Sentry edge runtime SDK
.github/workflows/ci.yml # GitHub Actions: lint, test, build, npm audit
```

## Branding

- **Favicon:** Circular Q logo — blue spiral with red dot (`src/app/favicon.ico`)
- **Browser tab title:** "Quiet Riots"
- **OG image:** `public/og-image.jpg` (1200x630, circular Q logo centred on white)
- **Logo assets:** `public/logo-192.png`, `public/logo-512.png`

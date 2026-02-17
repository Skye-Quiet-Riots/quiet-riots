# Quiet Riots — Scaling Architecture

Written against the actual codebase as of February 2026. Each tier describes what exists today, what to build next, and concrete triggers for when to move.

---

## NOW (0–10k users)

**Database:** Turso (libSQL) at `quietriots-skye.turso.io`. Single instance, Ireland region.

**Schema:** 11 entity tables + `_migrations` tracker. All primary keys are `TEXT DEFAULT (lower(hex(randomblob(16))))` — UUIDs generated in JS via `crypto.randomUUID()` and passed explicitly on INSERT (`src/lib/uuid.ts`). No AUTOINCREMENT anywhere except `_migrations`.

**Indexes:** Only implicit PK indexes + `UNIQUE(issue_id, organisation_id)` on `issue_organisation`. SQLite creates indexes automatically for PKs and UNIQUE constraints.

**Search:** `LIKE '%query%'` on `issues.name` + `issues.description`, with fallback to `synonyms.term` matching (`src/lib/queries/issues.ts:getAllIssues`). No FTS module.

**Rate limiting:** In-memory sliding window per IP (`src/lib/rate-limit.ts`). Resets on deploy. Applied to all mutation endpoints.

**Sessions:** Cookie-based (`qr_user_id` httpOnly, 1-year expiry). No server-side session store — the cookie holds the user's UUID directly (`src/lib/session.ts`).

**Bot:** Single OpenClaw gateway instance on macOS (`ai.openclaw.gateway` LaunchAgent). WhatsApp channel via Baileys. One POST endpoint multiplexing all operations via `{ action, params }` with Bearer token auth (`src/app/api/bot/route.ts`).

**Caching:** GET API routes return `Cache-Control: public, max-age=60, s-maxage=300`. No application-level cache.

**Security:** Nonce-based CSP via `src/proxy.ts`. Zod validation on all mutation endpoints. `npm audit` in CI.

### What works at this scale

- Single Turso instance handles reads/writes fine for <10k users
- LIKE search is acceptable for <20 issues and <100 synonyms
- In-memory rate limiting works because Vercel functions are short-lived
- Cookie sessions avoid server-side state entirely

---

## SOON (Turso scaling step, 5–10k users)

**Trigger:** p95 read latency >100ms on issue detail pages, or Vercel function cold starts becoming noticeable.

### Add embedded replicas

Turso supports embedded replicas that run libSQL locally in the Vercel function. Reads hit the local replica; writes go to the primary.

```ts
// src/lib/db.ts — change to:
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncUrl: process.env.TURSO_DATABASE_URL!, // primary for writes
  syncInterval: 60, // seconds
});
```

### Add explicit indexes

```sql
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_trending ON issues(trending_delta DESC);
CREATE INDEX IF NOT EXISTS idx_issue_org_issue ON issue_organisation(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_org_org ON issue_organisation(organisation_id);
CREATE INDEX IF NOT EXISTS idx_actions_issue ON actions(issue_id);
CREATE INDEX IF NOT EXISTS idx_feed_issue ON feed(issue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_user ON feed(user_id);
CREATE INDEX IF NOT EXISTS idx_user_issues_user ON user_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_user_issues_issue ON user_issues(issue_id);
CREATE INDEX IF NOT EXISTS idx_synonyms_issue ON synonyms(issue_id);
CREATE INDEX IF NOT EXISTS idx_country_issue ON country_breakdown(issue_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
```

### Persistent rate limiting

Replace in-memory `Map` with Turso-backed rate limit table, or use Vercel KV (Redis) for distributed rate limiting. The in-memory approach resets per function invocation, which becomes a problem with more traffic.

---

## 10k–50k users

**Trigger:** LIKE search taking >50ms, feed pages loading slowly, or synonyms table growing past 500 rows.

### FTS5 on libSQL

libSQL supports FTS5. Create a virtual table and keep it in sync:

```sql
CREATE VIRTUAL TABLE issues_fts USING fts5(name, description, content=issues, content_rowid=rowid);
-- Triggers to keep in sync on INSERT/UPDATE/DELETE
```

Replace `LIKE` queries in `getAllIssues` with `issues_fts MATCH ?`.

### Background jobs

Move expensive operations out of request handlers:

- **Trending delta calculation** — currently static seed data, but when real: compute weekly deltas in a cron job, not per-request
- **Community health scores** — aggregate periodically, not per-view
- **Country breakdown** — update from user signup data in batch

Options: Vercel Cron Functions, or a simple `setInterval` in the OpenClaw gateway process.

### CDN caching

Add `stale-while-revalidate` to issue list and org list endpoints. Consider ISR (Incremental Static Regeneration) for issue detail pages.

---

## 50k–100k users

**Trigger:** Turso free tier limits hit, need for complex queries (joins across >3 tables), or vector search requirements.

### Consider PostgreSQL migration

The UUID TEXT PKs were chosen to make this migration straightforward. Every ID is already a valid UUID string — just change the column type from `TEXT` to `UUID` in Postgres.

Migration path:

1. Set up PostgreSQL (Neon, Supabase, or self-hosted)
2. `pg_dump`-style export from Turso (custom script reading all tables)
3. Import with UUID type columns
4. Swap `@libsql/client` for `pg` or `postgres` in `src/lib/db.ts`
5. Update query syntax (minimal — SQLite and Postgres SQL overlap heavily)

Alternative: Turso Enterprise, which removes free tier limits and adds multi-region.

### Vector search

If the app needs semantic search (finding issues by meaning, not just keywords):

- **With Postgres:** pgvector extension
- **With Turso:** External vector DB (Pinecone, Qdrant) or compute embeddings client-side

### Redis cache layer

Add Redis (Vercel KV or Upstash) for:

- Hot issue data (the top 20 issues by rioter count)
- Rate limiting (persistent, distributed)
- Session data (if cookies become insufficient)
- Feed pagination cursors

---

## 100k+ users

**Trigger:** `rioter_count` updates becoming write bottlenecks, or feed table exceeding 1M rows.

### The counter problem

Currently `rioter_count` is a static column on `issues` and `issue_organisation`, set at seed time. With real users, joining/leaving an issue needs to update this count. At scale, concurrent `UPDATE issues SET rioter_count = rioter_count + 1` creates lock contention.

Solutions:

1. **Approximate counters** — increment in Redis, flush to DB periodically
2. **Materialised counts** — `SELECT COUNT(*) FROM user_issues WHERE issue_id = ?` with caching
3. **Counter table** — dedicated table with sharded counters (Facebook-style)

### Log table partitioning

The `feed` table will grow fastest. Partition by `created_at`:

- Active partition: last 90 days (hot, indexed)
- Archive partition: older posts (cold, compressed)

In Postgres: declarative partitioning. In SQLite/Turso: separate tables per time range with a UNION view.

---

## 500k+ users

**Trigger:** Single-region latency unacceptable, or WhatsApp user base spanning multiple continents.

### Multi-region deployment

- **Database:** Turso multi-region replicas (already supported) or Postgres with read replicas per region
- **Compute:** Vercel Edge Functions for reads, serverless functions for writes
- **Bot:** Multiple OpenClaw instances behind a load balancer, or move to a cloud-hosted solution

### Identity decoupling

Currently users are identified by:

1. Cookie (`qr_user_id`) for web
2. Phone number (E.164) for WhatsApp bot

At scale, decouple identity into a proper auth layer:

- OAuth2/OIDC provider (Auth0, Clerk, or NextAuth)
- Phone becomes one of many linked identities
- Support email login, social login, passkeys

---

## Bot / OpenClaw Scaling

### Current (single instance)

- One macOS machine running `openclaw` gateway
- WhatsApp via Baileys WebSocket
- Watchdog restarts on WiFi drops
- All bot actions go through `POST /api/bot`

### 10k+ WhatsApp users

- **Problem:** Single Baileys connection has message throughput limits
- **Solution:** Move from personal WhatsApp to WhatsApp Business API (Cloud API via Meta)
- **Impact:** No more Baileys, no more QR code auth, official API with higher rate limits

### 50k+ WhatsApp users

- **Multiple bot instances** behind a message queue (Redis, SQS)
- **Conversation state** moves from OpenClaw session files to a database
- **Bot API** may need its own microservice rather than sharing the Next.js app

---

## What NOT to Build Yet

| Feature                 | Trigger to build                                 | Why not now                            |
| ----------------------- | ------------------------------------------------ | -------------------------------------- |
| Full-text search (FTS5) | >50 issues or search latency >50ms               | LIKE works fine for 19 issues          |
| PostgreSQL migration    | Turso limits hit or need joins >3 tables         | Turso handles current load easily      |
| Redis cache             | p95 latency >200ms on hot paths                  | Direct DB queries are fast enough      |
| Background jobs         | Trending/health data needs real-time updates     | Currently static seed data             |
| Multi-region            | Users in >3 continents with latency complaints   | UK/EU focus for now                    |
| WhatsApp Business API   | >1000 daily WhatsApp conversations               | Personal account works for MVP         |
| Auth provider (OAuth)   | Need social login or multi-device support        | Cookie + phone auth covers MVP         |
| Counter sharding        | >100 concurrent join/leave operations per second | Static counts in seed data             |
| CDN/ISR                 | Issue detail page loads >500ms                   | Server renders in <100ms               |
| Rate limit persistence  | Abuse detected across function invocations       | In-memory is sufficient at low traffic |

---

## Architecture Diagram (Current)

```
User (Browser)
    │
    ├─── GET pages ──→ Vercel (Next.js SSR) ──→ Turso (Ireland)
    │                         │
    │                    src/proxy.ts (CSP, headers)
    │
    ├─── API calls ──→ /api/* routes ──→ Turso
    │
WhatsApp User
    │
    ├─── Message ──→ OpenClaw Gateway (macOS)
    │                    │
    │                    └──→ POST /api/bot ──→ Turso
    │
    └─── Response ←── OpenClaw ←── Bot API response
```

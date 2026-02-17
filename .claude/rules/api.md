---
paths:
  - "src/app/api/**/*.ts"
---

# API Route Rules

- All API routes use Next.js App Router route handlers (export GET, POST, etc.)
- Bot endpoint (`/api/bot`) uses Bearer token auth via `BOT_API_KEY` env var
- User-facing routes use cookie session auth via `getCurrentUserId()` from `@/lib/session`
- Return `NextResponse.json()` with consistent shape: `{ ok: true, data }` or `{ ok: false, error }`
- Parallelise independent database queries with `Promise.all`
- All Turso/libSQL queries are async — always await them

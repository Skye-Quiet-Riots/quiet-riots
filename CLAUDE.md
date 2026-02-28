# Quiet Riots

Quiet Riots is a web app for collective action around shared issues. Based on the 2014 book by Simon Darling.

@ARCHITECTURE.md
@OPERATIONS.md

## Agent Identity

- **Name:** Simon Darling
- **Email:** simon@quietriots.com
- **GitHub:** Simon-Quiet-Riots

## Tech Stack

- Next.js 16, React 19, TypeScript (strict), Tailwind CSS 4, Turso (libSQL), Vercel
- Package manager: **npm** (not yarn/pnpm)

## Commands

| Command                   | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| `npm run build`           | Build — ALWAYS run before committing        |
| `npm test`                | Run 2169 tests (~13s)                       |
| `npm run test:watch`      | Watch mode                                  |
| `npm run test:coverage`   | With V8 coverage                            |
| `npm run seed`            | Reset database (blocked on production)      |
| `npm run seed:production` | Reset production DB (requires confirmation) |
| `npm run migrate`         | Run pending database migrations             |
| `npm run migrate:status`  | Show applied & pending migrations           |
| `npm run dev`             | Local dev server                            |
| `npm run lint`            | ESLint                                      |
| `npm run format`          | Prettier — format all files                 |
| `npm run translate`       | API-based translation (see i18n protocol)   |
| `npm run format:check`    | Prettier — check formatting (CI)            |

## Development Rules

- IMPORTANT: Always run `npm run build` before committing
- IMPORTANT: When fixing a bug, always add a regression test
- Write tests for business logic, data handling, and API endpoints
- Skip tests for one-off scripts, styling, and rapid prototypes unless asked
- Environment variables go in `.env.local` (see `.env.example` for shape)
- Use feature branches for new work; commit to `main` only when ready
- IMPORTANT: Never merge to main directly — always push the feature branch, create a PR, wait for CI to pass, then merge immediately. Do not wait for user approval — merge as soon as CI is green and run the post-merge checklist. Vercel auto-deploys a preview for every PR.

## Branching Workflow (IMPORTANT — follow exactly)

A merged branch is dead. Never push more commits to a branch after its PR has been merged.

**One PR = one branch. New work = new branch.**

```
# 1. Always start new work from latest main
git fetch origin main
git checkout -b claude/<descriptive-name> origin/main

# 2. Make changes, test, build, commit, push
npm test && npm run build
git add <files> && git commit -m "..."
git push -u origin claude/<descriptive-name>

# 3. Create PR
gh pr create --title "..." --body "..."

# 4. AFTER PR is merged — IMMEDIATELY switch to a fresh branch before any more work
git fetch origin main
git checkout -b claude/<next-task-name> origin/main
# The old branch is now dead. Never go back to it.
```

**Why this matters:** In a worktree, you can't checkout `main` directly (it's used by the main repo). If you stay on a merged branch and push more commits, those commits go to a dead branch that main will never see. Every new piece of work — even a one-line follow-up fix — needs a fresh branch from `origin/main`.

**Self-check before every commit:** Run `git log origin/main..HEAD --oneline` — if you see commits that were already part of a merged PR, you're on a stale branch. Stop. Create a fresh branch from `origin/main` and cherry-pick or re-apply your changes.

## Conventions

- Prefer async server components — only add `"use client"` for interactive parts
- Mobile-first CSS — design for small screens, scale up with breakpoints
- Follow existing code patterns before introducing new ones
- TypeScript strict mode — no `any` without justification
- IMPORTANT: **Design for multiple languages and countries from the outset.** Every feature must work for all 56 locales and international users from day one — never build English-only and retrofit i18n later. This applies to UI text, emails, URLs (locale-aware callbacks), form validation, date/currency formatting, and any user-facing content.

## Internationalisation Protocol (IMPORTANT — follow for every feature)

Every user-facing text must be translated into all 55 non-English locales. A feature is not complete until translations exist in all locales.

### Checklist for new DB fields/entities

1. **User-facing?** → Add to `scripts/seed-translations.ts` (both `TranslationFile` interface, `generateEnglishBaseline()`, and `applyTranslations()`)
2. **Searchable?** → Update `buildTranslatedLikeClause()` in `src/lib/queries/issues.ts` (or equivalent query) to also search the `translations` table for non-English locales
3. **Displayed?** → Use `translateEntities()` / `translateEntity()` from `src/lib/queries/translate.ts` to overlay translations before rendering
4. **Generate translations** using the API pipeline: `npm run translate -- --section <name>` (see DB Entity Translation Protocol below)
5. **Apply translations** to staging + production as part of the post-merge checklist (`seed-translations.ts --apply`)

### Rules

- **Seed scripts must seed all 55 locales**, not just English — any new entity type must be added to `seed-translations.ts`
- **Never ship English-only** — if a feature adds user-facing text and doesn't include translations, it's incomplete
- **Translation files** live in `translations/*.json` — one per locale, keyed by English source text
- **Translation table** stores `(entity_type, entity_id, field, language_code, value)` with UNIQUE constraint on `(entity_type, entity_id, field, language_code)`
- **Sanitise** all translated values with `sanitizeText()` before DB insertion

### Zero Tolerance for Hardcoded English (MANDATORY — zero exceptions)

**EVERY user-visible string must go through i18n. No exceptions. No shortcuts. No "I'll translate it later."**

1. **No hardcoded English strings in components.** Every string a user can see (labels, titles, descriptions, CTAs, tooltips, error messages, placeholders) MUST use `getTranslations()` or `useTranslations()` with a key from `messages/*.json`. If you write a literal English string in a `.tsx` file that renders to the DOM, it's a bug.

2. **No untranslated DB data in pages.** Every page that fetches translatable entities (issues, organisations, assistants, synonyms) MUST call the appropriate `translate*()` function from `src/lib/queries/translate.ts` before rendering:
   - `translateEntities()` / `translateEntity()` for issues, organisations
   - `translateCategoryAssistants()` / `translateCategoryAssistant()` for assistants
   - `translateSynonyms()` for synonyms
   - If a page calls `getAllAssistants()`, `getAssistantByCategory()`, or `getAssistantDetail()`, it MUST translate the result before passing it to any component.

3. **No untranslated category names.** Category names like "Transport", "Banking", "Health" are English enum values — they MUST be translated via `getTranslations('Categories')` before display. Every `<CategoryBadge>` MUST receive a translated `label` prop. The `{label ?? category}` fallback in `CategoryBadge` exists as a safety net, not as a valid rendering path.

4. **Self-check before committing.** Search for hardcoded strings:
   ```bash
   # Find potential hardcoded English in components (review each match)
   grep -rn ">[A-Z][a-z].*</" src/components/ src/app/ --include="*.tsx" | grep -v "test\." | grep -v "{" | head -20
   ```

5. **API routes vs pages.** API routes that return JSON are correctly translated (they use `translate*()` functions). The pattern to follow: if the API route translates, the page MUST also translate. Never assume "the API handles it" — pages call the DB directly, not the API.

### DB Entity Translation Protocol (MANDATORY — use `npm run translate`)

When a feature adds or modifies translatable DB entities (issues, organisations, synonyms, category_assistants, categories), use the API-based translation pipeline. **NEVER use sub-agents for DB entity translations** — they are slow (~20 min), hit context limits, and fail silently.

```bash
# 1. Update the English baseline (adds new entities to en.json)
npx tsx scripts/seed-translations.ts --generate

# 2. Translate the section that changed (all 55 locales, ~1-2 minutes)
npm run translate -- --section category_assistants

# 3. Verify all files are valid JSON
for f in translations/*.json; do node -e "require('./$f')" 2>&1 || echo "BROKEN: $f"; done

# 4. Apply to DB (staging, then production)
npx tsx scripts/seed-translations.ts --apply
```

**Options:**

- `--section <name>` — translate one section (can repeat: `--section issues --section synonyms`)
- `--all` — retranslate everything
- `--locales es,fr,de` — only specific locales (useful for retrying failures)
- `--dry-run` — preview without calling the API
- `--model claude-sonnet-4-20250514` — use a different model (default: `claude-haiku-4-20250414`)

**Requires** `ANTHROPIC_API_KEY` in environment or `.env.local`.

### UI Translation Protocol (MANDATORY — follow this exact pattern)

When a feature adds or changes keys in `messages/en.json`, the same changes must be applied to all 55 non-English locale files. **ALWAYS use the script-first approach below.** Never use sub-agents for translations — they are slow, hit context limits on large locale files, and fail silently.

**Helper script:** `scripts/apply-ui-translations.js` — validates locale codes, applies translations, and verifies JSON integrity.

**Step 1: Get the exact locale list and identify what needs translating**

```bash
# Get the canonical locale list (derives from actual message files)
node scripts/apply-ui-translations.js --list-locales

# List new/changed keys (compare en.json against any non-English file)
node << 'SCRIPT'
const en = require('./messages/en.json');
const fr = require('./messages/fr.json');
for (const [ns, keys] of Object.entries(en)) {
  if (!fr[ns]) console.log('NEW namespace: ' + ns + ' (' + Object.keys(keys).length + ' keys)');
  else { const missing = Object.keys(keys).filter(k => !(k in fr[ns]));
    if (missing.length) console.log('NEW keys in ' + ns + ': ' + missing.join(', ')); }
}
SCRIPT
```

**Step 2: Generate translations with a single Task agent**

Launch ONE Task agent (not 6 — one is enough) that produces a JSON object mapping each locale to its translations. The agent returns ONLY the translation data, not file edits.

**CRITICAL:** Always include the exact locale list from Step 1 in the prompt. Never let the agent guess locale codes — common mistakes include `zh` (should be `zh-CN`), `zh-Hant` (should be `zh-TW`), `fil` (should be `tl`), and inventing locales like `et`, `gu`, `kn` that don't exist in this project.

```
Prompt: "Translate these keys into ALL 55 locales listed below. Return ONLY a JSON object.
**Target locales (55):** [paste output from --list-locales]

Rules: keep {variable} placeholders as-is, keep brand names (Quiet Riots) as-is,
keep technical terms (IPO, Pre-Seed) as-is, keep currency amounts ($10m, 10p) as-is.
For -Latn locales: write in LATIN SCRIPT (romanised), not native script.

Format: { 'es': { 'key': 'translated value', ... }, 'fr': { ... }, ... }"
```

**Step 3: Apply translations with the helper script**

Save the agent's JSON output to a file, then validate and apply:

```bash
# Save the agent output to a temp file (the agent returns raw JSON)
# Then validate before applying:
node scripts/apply-ui-translations.js --check /tmp/translations.json

# Apply (reads each locale file, merges new keys, writes back):
node scripts/apply-ui-translations.js /tmp/translations.json

# Format
npx prettier --write messages/*.json
```

The script will:
- **Reject** unexpected locale codes (e.g. `zh` instead of `zh-CN`)
- **Warn** about missing locales (exist in messages/ but not in translation output)
- **Skip** locales that don't have corresponding message files
- **Validate** all JSON files after writing

**For simple value changes** (like renaming "supporter" → "participant"), skip the agent entirely — build the translations object directly with known mappings and run the script.

**Step 4: Validate and test**

```bash
# Verify all locale files are valid JSON
for f in messages/*.json; do node -e "require('./$f')" 2>&1 || echo "BROKEN: $f"; done
# Run tests
npm test
# Format
npx prettier --write messages/*.json
```

**Why script/API-first is mandatory:**

- Sub-agents hit "Prompt is too long" on locale files (>25K tokens each)
- Sub-agents are unpredictable — some batches finish, others fail silently or take 20+ minutes
- `npm run translate` handles all 55 locales in ~1-2 minutes via parallel API calls
- A Node.js script handles all 55 UI locale files in <1 second, deterministically
- The `apply-ui-translations.js` script catches locale code mismatches that would silently lose translations

## Dual-Surface Protocol (IMPORTANT — follow for every feature)

Every feature must work on BOTH the web app and the WhatsApp bot. When fixing a bug, verify the fix works on both surfaces before merging.

### Checklist

1. **Web path:** Which page/component is affected? Does it pass `locale` to query functions?
2. **Bot path:** Which bot action is affected? Does it accept `language_code`? Does it translate the response?
3. **Shared code:** Both surfaces should use the same query/logic layer (`src/lib/queries/`) — never duplicate logic in the API route and bot route separately
4. **Tests:** Write tests for both the API route (web surface: `src/app/api/*/`) and bot action (WhatsApp surface: `src/app/api/bot/bot-api.test.ts`)
5. **Translations:** Both surfaces must return translated content for non-English users

### Key paths

| Surface  | Search                            | Issue detail                     | Synonyms                         |
| -------- | --------------------------------- | -------------------------------- | -------------------------------- |
| Web app  | `GET /api/issues?search=&locale=` | `/[locale]/issues/[id]/page.tsx` | `SynonymList` component          |
| WhatsApp | Bot `search_issues` action        | Bot `get_issue` action           | Returned in `get_issue` response |

## Developer Best Practices (implemented)

- **CI:** GitHub Actions runs lint, tests, build, and `npm audit` on every push/PR
- **Pre-commit hooks:** Husky + lint-staged runs ESLint, Prettier on staged files
- **Linting:** ESLint with jsx-a11y rules promoted to error level
- **Formatting:** Prettier (`.prettierrc`) — semi, singleQuote, trailingComma all, printWidth 100
- **API validation:** Zod schemas on all mutation endpoints
- **Rate limiting:** Sliding-window in-memory limiter on all mutation endpoints (`src/lib/rate-limit.ts`)
- **Security headers:** Nonce-based CSP, X-Frame-Options, etc. in `src/proxy.ts`
- **Cache headers:** GET API routes get `Cache-Control: public, max-age=60, s-maxage=300`
- **Error monitoring:** Sentry (`@sentry/nextjs`) — client/server/edge configs, session replay, source maps
- **Error pages:** `error.tsx`, `global-error.tsx`, `not-found.tsx` all report to Sentry
- **Env validation:** `src/lib/env.ts` — validates required env vars at startup via `src/instrumentation.ts`
- **Health check:** `GET /api/health` — checks db connectivity
- **Standardised API responses:** `src/lib/api-response.ts` — `apiOk()`, `apiError()` (with error codes), `apiValidationError()` (field-level details)
- **Editor config:** `.editorconfig` for consistent whitespace across editors
- **Coverage thresholds:** Vitest enforces 75% statements, 69% branches, 74% functions, 76% lines
- **Dependabot:** Weekly npm dependency updates, grouped minor/patch, max 5 open PRs (`.github/dependabot.yml`)
- **Branch protection:** `main` requires 1 PR approval + `test` status check passing + branch up-to-date
- **DB query timeouts:** `withTimeout()` wrapper in `src/lib/db.ts` — 5s default via `Promise.race`
- **Structured logging:** pino JSON logger (`src/lib/logger.ts`) with `createRequestLogger()` for per-request context
- **Schema constraints:** CHECK constraints on all tables — non-negative counters, health 0-100, enum validation, length limits
- **Input sanitization:** `src/lib/sanitize.ts` — `normalizePhone()` (E.164), `trimAndLimit()`, `sanitizeText()`
- **Error codes:** All API errors include `code` field (`VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `RATE_LIMITED`, `INTERNAL_ERROR`)
- **Integration tests:** `src/test/integration.test.ts` — full user journey tests crossing multiple API routes

## Critical Gotchas

- **Bare domain breaks POST:** Always use `www.quietriots.com` for API URLs (307 redirect)
- **Turso queries are async:** All db queries must be awaited
- **OpenClaw BOOTSTRAP.md kills skills:** Must NOT exist in `~/.openclaw/workspace/`
- **OpenClaw session cache is sticky:** After changing SKILL.md, delete `~/.openclaw/agents/main/sessions/*.jsonl` and restart gateway
- **CSP uses nonces + strict-dynamic:** `unsafe-eval` only in dev mode; prod eliminates `unsafe-inline`
- **CSP + SSG = broken JavaScript:** Pages pre-rendered at build time (SSG/static) get 0 script nonces — CSP blocks ALL JavaScript, React never hydrates, buttons/forms stay disabled/dead. The `[locale]/layout.tsx` has `generateStaticParams()` which makes child pages SSG by default. Any page with interactive client components MUST use `export const dynamic = 'force-dynamic'` in a server component wrapper. Pattern: extract `'use client'` code to a separate file (e.g., `signup-form.tsx`), make `page.tsx` a server component with `force-dynamic` that imports and renders the client component. Already fixed for: auth/signin, auth/signup, auth/verify, auth/error, onboard, profile.
- **Bot API key in tests:** Test helper reads `BOT_API_KEY` env var with same fallback as route — CI sets it to `test-key`
- **`BOT_API_KEY` is required in production:** The env validation rejects both missing AND dev fallback key (`qr-bot-dev-key-2026`) values. All three bot-authenticated routes (`/api/bot`, `/api/evidence/upload`, `/api/action-initiatives`) reject the dev key in production via `IS_DEV_KEY` check. The real production key (`qr-xx21iIL4s2cepF9WVzHwwlL7QslY4boQGJHEWFYNA1U`) is set in Vercel production + preview env vars. OpenClaw SKILL.md and TOOLS.md use this key. The dev fallback key still works for local dev and tests.
- **`tsx` doesn't load `.env.local`:** When running `npm run seed` or `tsx scripts/*.ts`, env vars must be passed explicitly or sourced from `.env.local` — without them, libSQL falls back to `file:quiet-riots.db` (a local SQLite file) instead of the remote Turso database. Scripts that need a remote DB (`seed-translations --apply`, `seed-assistants`, `seed-reference-data`) have a `requireRemoteDb()` guard that blocks this. Use `bash scripts/with-staging-env.sh scripts/<script>.ts [args]` to auto-load env vars from the main repo's `.env.local`.
- **`.env.local` should point to staging:** For day-to-day development, `.env.local` should use the staging Turso DB. Vercel Preview deployments also use staging. To get staging creds: `npx vercel env pull /tmp/vercel-preview-env --environment preview` (must run from main repo root, not a worktree). To run scripts against production, pass env vars explicitly: `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/seed-assistants.ts`
- **`npm run seed` is blocked on production:** The seed script refuses to run against production unless the `--i-know-what-im-doing` flag is passed (via `npm run seed:production`). This prevents accidental data loss. All scripts show a database banner (LOCAL/STAGING/PRODUCTION) before running.
- **`npx vercel` commands fail in worktrees:** Vercel CLI doesn't recognise worktrees as linked projects — always run from `/Users/skye/Projects/quiet-riots`
- **libSQL `datetime("now")` as column default fails:** Use `CURRENT_TIMESTAMP` or omit and set in application code
- **OpenClaw default session reset wipes memory at 4 AM:** The default `session.reset.mode` is `"daily"` with `atHour: 4`. This creates a brand new session on the first inbound message after 4 AM, so the bot loses all conversational context overnight. Fixed by setting `session.reset.mode: "idle"` with `idleMinutes: 1440` (24h) — sessions now only reset after 24 hours of inactivity. The auto-update LaunchAgent also runs at 04:00 which compounds the issue.
- **DB changes need Vercel redeployment:** After modifying production DB schema (migrations) or data (scripts, manual inserts), Vercel serverless functions may serve stale data. Force a fresh deployment: `cd /Users/skye/Projects/quiet-riots && git checkout main && git pull origin main && npx vercel --prod`. ALWAYS pull main first — see "Main repo checkout gets stale" gotcha.
- **Main repo checkout gets stale in worktree workflow:** PRs merged via `gh api` or `gh pr merge` update `origin/main` on GitHub, but the local checkout at `/Users/skye/Projects/quiet-riots` stays at whatever commit it was on. Running `npx vercel --prod` from there deploys the stale local code, not what's on GitHub. Fix: always `cd /Users/skye/Projects/quiet-riots && git checkout main && git pull origin main` before any `npx vercel` command.
- **New env vars need Vercel setup:** When adding a required env var to `src/lib/env.ts` or `.env.example`, it MUST also be added to Vercel production/preview via `npx vercel env add`. Missing env vars cause `instrumentation.ts` to throw, resulting in 500 errors on every route. Always check `npx vercel env ls` after adding new required vars.
- **Migrations must run on BOTH staging AND production:** After merging migration files, run `npm run migrate` (with env vars) against both environments immediately. Never run staging-only — production will 500 if deployed code references columns that don't exist yet.
- **Production has more data than seed:** Production has 49 issues (vs 19 in seed.ts). Never re-seed production — use targeted migration scripts that match by name instead of relying on seed-generated IDs.
- **CSP `media-src` needed for video blob playback:** Without an explicit `media-src` directive in the CSP (`src/proxy.ts`), `default-src 'self'` blocks cross-origin `<video>` loading. The video element renders with controls but content is blocked — looks like a black box that isn't clickable. Must allowlist `https://*.public.blob.vercel-storage.com` in both `img-src` and `media-src`.
- **libSQL rows return `Value` objects, not plain JS types:** When using `db.execute()` directly (e.g. in scripts), row fields are libSQL `Value` objects. Use `String(row.field)` and `Number(row.field)` to coerce before passing as SQL args — `as string` type casts don't convert at runtime.
- **Merge script ordering matters:** In `merge-users.ts`, soft-delete the source user (freeing their email) BEFORE upgrading the target's email, and move wallet transactions BEFORE deleting the source wallet. Batch statements execute in order.
- **Romanised locales need native script cleanup:** AI translation models (Haiku and Sonnet) leak native script characters into `-Latn` romanised output. After running `npm run translate` for `-Latn` locales, always run a Unicode range check and transliteration cleanup pass. Cross-script contamination also happens (e.g., Cyrillic chars in Arabic files). The cleanup script is documented in session 56.
- **Romanised locales need Sonnet for entity names:** Haiku sees English entity names like "Train Cancellations" in a Banglish context and thinks "already Latin script, no translation needed." Use `--model claude-sonnet-4-20250514` for `-Latn` locales when translating issue/org names: `npm run translate -- --section issues --section organisations --locales bn-Latn,hi-Latn --model claude-sonnet-4-20250514`
- **Locale lists live in `src/i18n/locales.ts`:** This is the single source of truth for ALL locale-related constants. To add a new locale, edit ONLY this file (plus create message/translation files). All 9 consumer files import from it. Do NOT add locale codes to `routing.ts`, `ai.ts`, or any script directly — they all re-export from `locales.ts`.
- **Merged branches are dead — never reuse them:** After a PR is merged, that branch is done. Pushing more commits to it won't reach main. Always `git fetch origin main && git checkout -b claude/<new-name> origin/main` before starting any new work, even a one-line fix. This is the #1 cause of "I pushed but it didn't deploy" bugs.
- **New env vars need a redeploy AFTER being added:** Vercel injects env vars at build time. If you add an env var via `npx vercel env add` after the auto-deploy has already built, the deployed functions won't have it. Always run `npx vercel --prod` after adding new env vars (pull main first). The post-merge health check (`/api/health`) only tests DB connectivity — it won't catch missing Resend/OAuth keys.
- **OTP delivery script must use production API key:** The `scripts/deliver-otp-codes.sh` script always talks to production Vercel. It hardcodes the production bot API key (`qr-xx21iIL4s2cepF9WVzHwwlL7QslY4boQGJHEWFYNA1U`) because `.env.local` has the dev fallback key (`qr-bot-dev-key-2026`) which production rejects. Never change this to read from `.env.local`.
- **WhatsApp delivery from Vercel requires DB queue polling:** `sendWhatsAppMessage()` calls `/opt/homebrew/bin/openclaw` which only exists on the local Mac — it silently fails on Vercel. All WhatsApp delivery must go through the DB queue: write `whatsapp_message` + `whatsapp_expires_at` to the `messages` table, and the local polling script (`scripts/deliver-messages.sh`, 5s interval) handles actual delivery via OpenClaw. Use `sendNotification()` from `src/lib/queries/messages.ts` which handles this automatically. Same pattern as OTP delivery. **This is the standard approach until Twilio replaces OpenClaw.**
- **Phone/password login must set Auth.js JWT cookie:** `setSession()` sets BOTH the legacy `qr_user_id` cookie (server-side `getSession()`) AND the Auth.js JWT cookie (client-side `useSession()` from next-auth/react). Without the JWT cookie, the nav-bar and auth-gate show the user as logged out even though server-side auth works. The JWT is encoded using `encode()` from `next-auth/jwt` with `AUTH_SECRET`. Cookie name: `__Secure-authjs.session-token` (production) or `authjs.session-token` (dev). All callers of `setSession()` should pass `userInfo` (name, email, image) for the JWT payload.
- **Worktree removal kills the shell:** If the worktree directory is removed (by `git worktree remove` or any other process) while a Claude Code session is running inside it, ALL Bash commands fail permanently — the persisted cwd no longer exists and cannot be recovered. This is why worktree cleanup must be the absolute last command of a session, using `nohup` with a delay so it runs after the session exits.

## Database ID Convention

- All 17 entity tables use `TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))` — UUIDs generated in JS via `crypto.randomUUID()` and passed explicitly on INSERT (`src/lib/uuid.ts`)
- The `_migrations` table is the sole exception — keeps `INTEGER PRIMARY KEY AUTOINCREMENT` (internal tooling, no API surface)
- Tests use short readable string IDs (`'issue-rail'`, `'user-sarah'`) for determinism and clarity
- Session cookie (`qr_user_id`) stores the UUID string directly — no parseInt needed

## Known Issues

- **OTP delivery depends on Mac being online:** Phone OTP codes are delivered via WhatsApp by a polling script running on the local Mac (`scripts/deliver-otp-codes.sh` via LaunchAgent every 3s). If the Mac is offline, sleeping, or the OpenClaw gateway is down, codes won't be delivered until connectivity is restored. Codes expire after 5 minutes.
- **OTP delivery message contains plaintext code:** The `delivery_message` column stores the readable code for WhatsApp delivery. It's NULLed after verification/expiry (defence in depth), but there's a 5-minute window where the plaintext is in the DB. Bot API auth is required to read it.

## Start of Session Protocol

At the start of every session (or when asked to "pick up where we left off"):

1. Read CLAUDE.md → SESSION_LOG.md (lightweight index) → latest session file linked from it
2. Summarise where we left off and what the priorities are
3. Run the test suite (`npm test`) and flag any issues
4. **OpenClaw health check — only if bot work is planned or user mentions bot issues:**
   - `openclaw --version` — report current version
   - `launchctl list | grep ai.openclaw.gateway` — confirm gateway is running
   - `tail -5 ~/.openclaw/logs/watchdog.log` — check for recent auto-recoveries
   - `tail -3 ~/.openclaw/logs/auto-update.log` — check if auto-update ran recently; look for TESTS FAILED lines
   - `tail -3 ~/.openclaw/logs/otp-delivery.log` — check recent OTP deliveries
   - If the watchdog has been restarting frequently, flag it as a connectivity issue

**Continuation sessions:** If this session continues a previous one (context compacted or "pick up where we left off"), skip the full start-of-session — just read the latest session file and continue working.

## During Session

### Code quality

- Write tests alongside new code, not as a separate pass at session end
- Run `npm test` after meaningful changes — don't batch all testing to the end
- If you discover a new gotcha, add it to CLAUDE.md immediately

### Incremental commit protocol (IMPORTANT — prevents lost work)

- **Commit after every logical unit of work** (e.g. each phase of a multi-phase feature). Don't batch everything into one commit at the end.
- **Push after every commit.** If the session dies unexpectedly, the last pushed commit survives.
- **MANDATORY: Save plans to `PLAN.md` before starting implementation.** Any multi-step task (3+ steps) MUST have its plan written to `PLAN.md`, committed, and pushed BEFORE writing any implementation code. This is non-negotiable — if the session dies or context compacts, the plan is the only thing that survives. A plan described only in conversation text is lost when context is compressed.
  - **When to write PLAN.md:** Immediately after a plan is formed or approved — whether from EnterPlanMode, a user request, or your own analysis. Don't start coding until the plan is persisted.
  - **What to include:** Problem statement, scope, all phases/steps, file list, deployment/rollback notes.
  - **When to update:** If the plan changes mid-execution (e.g. a step is added or removed), update PLAN.md and push before continuing.
- **Never rely on uncommitted work surviving a session.** The previous session lost all 5 phases of work because nothing was committed. Another session lost its plan because it was only in the conversation, not in PLAN.md.
- Pattern for multi-phase work:
  ```
  1. Write PLAN.md → commit + push (BEFORE any implementation)
  2. Phase 1 code + tests → commit + push
  3. Phase 2 code + tests → commit + push
  ... repeat for each phase
  N. Create PR after final phase
  ```

### Branching & PRs

- Follow the Branching Workflow exactly — fresh branch from `origin/main` for every piece of work
- After creating a PR: wait for CI → check if production DB needs migration/seed → merge → verify deployment
- After merging a PR, immediately create a fresh branch if more work follows
- **Merge PRs within the same session they're created.** A PR left open across sessions will go stale — main moves on, the branch conflicts, and it has to be rebased or recreated. Never leave a PR open — merge as soon as CI passes.

### Post-merge checklist (run after EVERY merge to main)

After merging a PR, run through this checklist immediately — don't defer to end of session:

1. **Env vars check:** If `.env.example` changed or `src/lib/env.ts` changed, verify all new required env vars are set in Vercel:
   - `cd /Users/skye/Projects/quiet-riots && npx vercel env ls` — compare against `.env.example`
   - If any are missing: `npx vercel env add <NAME> production` (and `preview` if needed)
   - Common miss: adding a var to env validation without adding it to Vercel

2. **Migration check:** If new `migrations/*.sql` files were added:
   - Pull env vars: `cd /Users/skye/Projects/quiet-riots && npx vercel env pull /tmp/vercel-preview-env --environment preview && npx vercel env pull /tmp/vercel-production-env --environment production`
   - Run on staging: `set -a && source /tmp/vercel-preview-env && set +a && npx tsx scripts/migrate.ts`
   - Run on production: `set -a && source /tmp/vercel-production-env && set +a && npx tsx scripts/migrate.ts`
   - Run seed scripts if needed (e.g. `seed-reference-data.ts` for new tables)
   - Clean up: `rm -f /tmp/vercel-preview-env /tmp/vercel-production-env`
   - ALWAYS run on BOTH environments — never staging-only

3. **Sync main repo checkout:** The main repo at `/Users/skye/Projects/quiet-riots` must be updated before any `npx vercel --prod`:
   - `cd /Users/skye/Projects/quiet-riots && git checkout main && git pull origin main`
   - This is critical because `npx vercel --prod` deploys from the local filesystem, not from GitHub

4. **Verify production:** Wait ~30s for Vercel propagation, then:
   - `curl -s https://www.quietriots.com/api/health` — must return `{"status":"ok"}`
   - For UI changes, verify the change is visible on production
   - For CSP or header changes: `curl -sI https://www.quietriots.com | grep -i <header>`
   - If health returns 500: check Vercel deployment logs (`npx vercel inspect <url> --logs`), likely a missing env var

5. **Force redeploy if needed:** If Vercel auto-deploy didn't trigger or deployed stale code:
   - `cd /Users/skye/Projects/quiet-riots && git checkout main && git pull origin main && npx vercel --prod`
   - NEVER run `npx vercel --prod` without pulling main first — this deploys stale local files

### PR lifecycle (within a session)

- Create PR → wait for CI (`gh pr checks <number> --watch`) → merge (`gh pr merge <number> --squash --admin`) → run post-merge checklist → verify deployment
- **IMPORTANT: Always merge and deploy automatically.** After creating a PR: watch CI, merge, run post-merge checklist, verify production health — all without waiting for the user to tell you. The user should never have to say "merge and deploy". This is your responsibility every time.
- Default: merge every PR in the same session it's created. Only leave open if user explicitly requests review.

## End of Session Protocol

At the end of every session (or when asked to "wrap up" / "good night"). Steps are ordered by priority — if context is running low, the most important things happen first:

1. **Don't lose work:** Check `git status` and `git log origin/main..HEAD` — commit and push any uncommitted or unpushed changes (run `npm test && npm run build` before committing)
2. **Verify green:** Run `npm test` and `npm run build` — report any failures. If any new logic was added without tests, write them now.
3. **Session docs (commit to the current feature branch before merging):**
   - Update this file (CLAUDE.md) with any new decisions, gotchas, or known issues
   - Create a new session file in `session-logs/` with: what was worked on, decisions made and why, anything discovered or surprising, test count, PRs created/merged, clear next steps
   - Update `SESSION_LOG.md` index: set "Latest Session" pointer and "Current Priorities", add a row to "All Sessions" table
   - Commit all three files to the current branch: `git add CLAUDE.md SESSION_LOG.md session-logs/<file>`
   - Push to origin
   - **If there is an open PR for this branch:** the docs are now included — done
   - **If the PR was already merged (stale branch):** create a fresh branch from `origin/main`, cherry-pick or re-apply the docs commit, push, and create a new PR. This is the fallback, not the normal path.
4. **Check CI passes** on the PR with the session docs. If it fails, fix and push again.
5. **Merge open PRs:** Run `gh pr list --state open`. Handle each:
   - **Our PRs** (`--author Simon-Quiet-Riots`): Wait for CI (`gh pr checks <number> --watch`), then merge: `gh pr merge <number> --squash --admin`. The `--admin` flag bypasses the 1-approval branch protection rule. If `gh pr merge` fails in a worktree ("`main` already used"), use: `gh api repos/Skye-Quiet-Riots/quiet-riots/pulls/<number>/merge -X PUT -f merge_method=squash`. Don't leave PRs open across sessions.
   - **Dependabot PRs:** Check CI with `gh pr checks <number>`. Minor/patch with passing CI → `gh pr merge <number> --squash --admin`. Major bumps → evaluate. If CI is still running, skip.
6. **Run backup:** `bash ~/.openclaw/scripts/backup.sh`
7. **If bot files changed** (SKILL.md, bot API, OPERATIONS.md): flag that OpenClaw sessions may need clearing (`rm ~/.openclaw/agents/main/sessions/*.jsonl`) and gateway may need restarting
8. **Worktree cleanup (MUST be the very last command):** If this session's branch has been merged to main, run a fire-and-forget background cleanup: `nohup bash -c 'sleep 5 && cd /Users/skye/Projects/quiet-riots && git worktree remove .claude/worktrees/<name> 2>/dev/null; git branch -d <branch-names> 2>/dev/null' &>/dev/null &`. The 5-second delay lets the session exit before the worktree directory is removed. **Do not run any other commands after this** — the shell will break once the cwd is deleted.

**Key rule:** Always do steps 1–3 _before_ the final PR of the session is merged. If the user asks to deploy/merge mid-protocol, finish the docs first, then merge. The session log commit is the last commit on the branch.

Write everything as if briefing a new version of yourself that has zero context beyond these files.

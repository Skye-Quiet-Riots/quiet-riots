# Quiet Riots

Bringing the _Quiet Riots_ book to life.

Quiet Riots is a platform for organising people around shared issues and enabling collective action. It's built on the belief that meaningful change doesn't always start with loud protest — sometimes it begins with people quietly finding each other, aligning on what matters, and acting together.

**Live site:** [quietriots.com](https://www.quietriots.com)

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/Skye-Quiet-Riots/quiet-riots.git
cd quiet-riots

# 2. Use the right Node version
nvm use   # reads .nvmrc → Node 25

# 3. Install dependencies
npm install

# 4. Set up environment variables
cp .env.example .env.local
# Then edit .env.local with your Turso credentials (see below)

# 5. Seed the database
npm run seed

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable             | Required | Description                                                                    |
| -------------------- | -------- | ------------------------------------------------------------------------------ |
| `TURSO_DATABASE_URL` | Yes      | Your Turso database URL (`libsql://your-db.turso.io`)                          |
| `TURSO_AUTH_TOKEN`   | Yes      | Auth token from the Turso dashboard                                            |
| `BOT_API_KEY`        | Yes      | API key for the WhatsApp bot endpoint (default: `qr-bot-dev-key-2026` for dev) |

**Getting Turso credentials:**

1. Sign up at [turso.tech](https://turso.tech)
2. Create a database (or use the existing `quietriots-skye`)
3. Copy the database URL and auth token from the dashboard

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) with React 19 and App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4 (mobile-first)
- **Database:** [Turso](https://turso.tech) (libSQL) — hosted in Ireland (aws-eu-west-1)
- **Hosting:** [Vercel](https://vercel.com) — functions in London (lhr1)
- **Bot:** [OpenClaw](https://openclaw.com) WhatsApp agent via `/api/bot`

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── page.tsx            # Homepage
│   ├── issues/             # /issues and /issues/[id]
│   ├── organisations/      # /organisations and /organisations/[id]
│   ├── profile/            # /profile
│   └── api/                # API routes
│       ├── bot/            # WhatsApp bot endpoint (POST)
│       ├── issues/         # Issues CRUD + join, feed, actions, synonyms
│       ├── organisations/  # Organisations list + detail
│       └── users/          # User signup, profile, lookup
├── components/
│   ├── cards/              # Issue, org, action, expert, feed post cards
│   ├── data/               # Health meter, pivot table, stats, badges
│   ├── interactive/        # Join button, search, feed, filters
│   └── layout/             # Nav bar, footer, page header
├── lib/
│   ├── db.ts               # Database connection (Turso/libSQL)
│   ├── schema.ts           # Table definitions
│   ├── session.ts          # Cookie-based auth
│   ├── seed.ts             # Sample data (19 issues, 18 orgs)
│   └── queries/            # Data access layer
│       ├── issues.ts
│       ├── organisations.ts
│       ├── users.ts
│       ├── actions.ts
│       ├── community.ts
│       └── synonyms.ts
├── test/                   # Test helpers
└── types/                  # TypeScript interfaces
```

## API Routes

| Method | Endpoint                              | Description                                           |
| ------ | ------------------------------------- | ----------------------------------------------------- |
| POST   | `/api/bot`                            | WhatsApp bot (Bearer token auth, multiplexed actions) |
| GET    | `/api/issues`                         | List issues (supports `?category=` and `?search=`)    |
| GET    | `/api/issues/[id]`                    | Issue detail with health, countries, pivot orgs       |
| POST   | `/api/issues/[id]/join`               | Join an issue (requires login)                        |
| DELETE | `/api/issues/[id]/join`               | Leave an issue                                        |
| GET    | `/api/issues/[id]/feed`               | Community feed posts                                  |
| POST   | `/api/issues/[id]/feed`               | Create a feed post                                    |
| POST   | `/api/issues/[id]/feed/[postId]/like` | Like a post                                           |
| GET    | `/api/issues/[id]/actions`            | Actions (supports `?type=` and `?time=`)              |
| GET    | `/api/issues/[id]/synonyms`           | Issue synonyms                                        |
| GET    | `/api/organisations`                  | List organisations (supports `?category=`)            |
| GET    | `/api/organisations/[id]`             | Organisation detail with issues                       |
| POST   | `/api/users`                          | Create or get user                                    |
| GET    | `/api/users/me`                       | Current logged-in user                                |
| GET    | `/api/users/[id]`                     | User by ID                                            |

## Database

11 tables in Turso (libSQL):

- `issues` — The core issues people rally around
- `organisations` — Organisations linked to issues
- `issue_organisation` — Pivot table with Pareto ranking by rioter count
- `synonyms` — Alternative names for issues (improves search)
- `users` — Users with optional phone number for WhatsApp
- `user_issues` — Which users have joined which issues
- `actions` — Things people can do (ideas, actions, together activities)
- `feed` — Community discussion posts per issue
- `community_health` — Sense of Community Index scores (needs met, membership, influence, connection)
- `expert_profiles` — Subject matter experts per issue
- `country_breakdown` — Rioter counts by country per issue

## Testing

```bash
npm test              # Run all 210 tests (~1.3s)
npm run test:watch    # Watch mode
npm run test:coverage # With V8 coverage report
```

**Test architecture:**

- **Backend tests** (126): In-memory libSQL database per test file via `_setTestDb()`
- **Component tests** (84): React Testing Library with jsdom (via `// @vitest-environment jsdom`)
- **Session mocking:** `mockLoggedIn(userId)` / `mockLoggedOut()` helpers
- **API helpers:** `createTestRequest()` and `createBotRequest()` for route testing

## Key Concepts

### Pivot Tables (Pareto Principle)

Every issue-organisation relationship is ranked by rioter count. You can view data from two perspectives:

- **Issue pivot:** "Which organisations care about this issue?" (ranked)
- **Org pivot:** "Which issues does this organisation touch?" (ranked)

### Cookie Sessions

Users are identified by a `qr_user_id` httpOnly cookie (1-year expiry). WhatsApp users get auto-created accounts with phone-based identity.

### WhatsApp Bot

The bot runs via [OpenClaw](https://openclaw.com) on a local Mac, connecting to the production API. It uses numbered text choices (not polls/buttons) because the underlying WhatsApp library doesn't support them reliably.

## Deployment

Pushes to `main` trigger automatic production deployments via the Vercel GitHub App.

- **Domain:** quietriots.com (DNS via GoDaddy)
- **Functions:** London (lhr1) — close to the database in Ireland
- **Important:** Always use `www.quietriots.com` for API URLs — the bare domain redirects with 307 which breaks POST requests

## Scripts

| Command                 | Purpose                         |
| ----------------------- | ------------------------------- |
| `npm run dev`           | Local development server        |
| `npm run build`         | Production build                |
| `npm test`              | Run test suite                  |
| `npm run test:watch`    | Watch mode                      |
| `npm run test:coverage` | Coverage report                 |
| `npm run seed`          | Reset database with sample data |
| `npm run lint`          | ESLint                          |

## Further Reading

- `CLAUDE.md` — Agent instructions and session protocols
- `ARCHITECTURE.md` — Detailed architecture reference
- `OPERATIONS.md` — Deployment, bot, backup, and infrastructure docs
- `SESSION_LOG.md` — Development session history

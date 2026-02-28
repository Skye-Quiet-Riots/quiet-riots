# Plan: Website Redesign + Hero Images + Follow + Activity Feed + Issue:Org Pages + Nav Search

## Context

Quiet Riots needs a major visual upgrade, new features, and new page types. This plan covers:

1. **Full website redesign** — logo-exact colour palette, hero images, sidebar layout
2. **Follow feature** — users can follow issues without joining (lighter engagement)
3. **Activity newsfeed** — personalised homepage feed of actions/evidence from followed/joined riots
4. **Issue:Organisation intersection pages** — e.g. "Train Cancellations at Northern Rail"
5. **Organisation page redesign** — same layout as issue pages
6. **Global nav search** — search issues, orgs, synonyms from any page
7. **OpenAI hero image pipeline** — DALL-E generation, guide review, backfill
8. **WhatsApp bot integration** — all new features work on both surfaces

---

## Logo Colours (EXACT — extracted from `public/logo-192.png`)

| Colour | Hex | RGB | Usage |
|--------|-----|-----|-------|
| **Logo Blue** | `#188BFF` | (24, 139, 255) | Primary brand accent — links, buttons, logotype, active states |
| **Logo Red** | `#FB0202` | (251, 2, 2) | Secondary accent — notifications, alerts, logo dot |
| **Pivot Teal** | `#0d9479` | (13, 148, 121) | Feature colour — pivot/Pareto tables (replaces purple) |

These are NOT standard Tailwind colours. We'll define custom CSS properties and use Tailwind's arbitrary value syntax or extend the theme.

**Use the actual logo file** — `public/logo-192.png` — in the nav bar. Do NOT recreate or approximate it.

**Logotype:** "Quiet Riots" text in nav bar uses `#188BFF` (Logo Blue), `text-xl font-extrabold tracking-tight`.

---

## Nav Bar Design

### Desktop Nav (always visible):
- Logo (`logo-192.png`) + **"Quiet Riots" in blue** (xl, extrabold)
- **Issues** | **Organisations** (only 2 links — Assistants moved to profile dropdown)
- **Search input** — always expanded (`w-56`), not collapsible
- **Language selector** — `<LanguageSelector />` dropdown (shows global reach)
- **Wallet balance** — e.g. `£10.00` — clickable, links to `/wallet`. Currency formatted per user's country using `formatCurrency()` from `src/lib/format.ts`
- **Inbox** icon with red badge count
- **Profile avatar** — dropdown contains: Profile, Wallet (with balance), Assistants, Sign out

### Mobile Nav:
- Logo + logotype (blue)
- Language (compact: "EN"), wallet balance, inbox badge, hamburger menu
- **Search input always visible below** the nav row (full width)
- Hamburger menu contains: Issues, Organisations, Assistants, Profile, Wallet, Sign out

### Wallet Balance Display
- Uses `formatCurrency(balance_pence, currencyCode, locale)` from `src/lib/format.ts`
- Currency determined by user's `country_code` → `countries.currency_code` lookup
- Examples: 🇬🇧 £10.00 | 🇺🇸 $10.00 | 🇫🇷 10,00 € | 🇯🇵 ¥1,000 | 🇮🇳 ₹850.00 | 🇧🇷 R$ 55,00
- Handles zero-decimal currencies (JPY, KRW, VND) and three-decimal currencies (BHD, KWD, OMR)

### Pivot/Pareto Table Colour
- **Replace purple with teal** across all pivot/Pareto components
- Purple felt dated and clashed with blue brand; teal complements blue without competing
- Teal shades: border `teal-200`, bg `teal-50/30`, heading text `teal-700`, progress bars `teal-500/teal-100`
- Files: `src/components/interactive/pivot-toggle.tsx`, `src/components/data/pivot-table.tsx`

---

## New Feature: Follow

### Database

New table `user_follows`:
```sql
CREATE TABLE IF NOT EXISTS user_follows (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  followed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, issue_id)
);
```

Add to `issues` table:
```sql
ALTER TABLE issues ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0 CHECK(follower_count >= 0);
```

### Behaviour

- **Follow** = lightweight — user gets the issue in their newsfeed but isn't counted as a rioter
- **Join** = full commitment — user is counted as a rioter AND automatically followed
- When a user **Joins**, the follow button animates to show "Following ✓" (auto-follow)
- When a user **Unfollows**, they are NOT removed from joined — those are independent actions
- When a user **Leaves** (un-joins), they stay as a follower unless they explicitly unfollow
- Follower count shown separately from rioter count in stats

### UI (Issue Detail Page)

Two buttons side by side:
```
[ ✊ Join This Quiet Riot ]  [ 👁 Follow ]
```

When user clicks **Join**:
1. Join button changes to "✊ Joined ✓" (filled brand blue)
2. Follow button animates: briefly shows "Auto-followed! ✓" then settles to "👁 Following ✓"
3. Both stay in "active" state

When user clicks **Follow** (without joining):
1. Follow button changes to "👁 Following ✓"
2. Join button stays as "Join This Quiet Riot" (unchanged)

### API

- `POST /api/issues/[id]/follow` — follow/unfollow toggle (session auth)
- `POST /api/issues/[id]/join` — existing endpoint, now also auto-follows
- New queries: `followIssue()`, `unfollowIssue()`, `hasFollowedIssue()`, `getUserFollowedIssues()`

### WhatsApp Bot

- New action: `follow_issue` — follow without joining
- Modified `join_issue` — auto-follows when joining
- New action: `get_followed_issues` — list followed issues
- Activity feed accessible via `get_my_feed` action

---

## New Feature: Activity Newsfeed (Homepage)

### Concept

When a logged-in user visits the homepage, below the hero and trending section, they see a **personalised activity feed** of everything happening in their followed/joined riots.

### Feed Items (from existing tables)

Each feed item shows: **who** did **what** about **which issue** at **which org** (if applicable), **when**, with the actual content (text, photos, videos), and comment/like/share actions.

Sources:
1. **Evidence** — "James Smith gathered evidence about Cancelled Flights at American Airlines" + photos/videos/text
2. **Feed posts** — "Sarah Jones posted in Cancelled Flights community" + content
3. **Reel submissions** — "Anna Kjovik added a Riot Reel about Train Cancellations at Southern Rail in the 🇬🇧 United Kingdom" + YouTube video preview embed (thumbnail, play button, duration badge, "🎬 Riot Reel" tag)
4. **Joins** — "12 people joined Cancelled Flights this week" (aggregated)

### Database

New table `activity_feed` (materialised view pattern):
```sql
CREATE TABLE IF NOT EXISTS activity_feed (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  activity_type TEXT NOT NULL CHECK(activity_type IN ('evidence', 'feed_post', 'reel', 'join_milestone')),
  issue_id TEXT NOT NULL REFERENCES issues(id),
  org_id TEXT REFERENCES organisations(id),
  user_id TEXT REFERENCES users(id),
  source_id TEXT NOT NULL,
  summary TEXT NOT NULL CHECK(length(summary) <= 500),
  content TEXT CHECK(length(content) <= 5000),
  media_type TEXT DEFAULT 'text' CHECK(media_type IN ('text','photo','video','link')),
  photo_urls TEXT DEFAULT '[]',
  video_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_activity_feed_issue ON activity_feed(issue_id, created_at DESC);
CREATE INDEX idx_activity_feed_created ON activity_feed(created_at DESC);
```

### Query Pattern

```sql
SELECT af.*, i.name as issue_name, i.category, o.name as org_name, u.name as user_name
FROM activity_feed af
JOIN issues i ON af.issue_id = i.id
LEFT JOIN organisations o ON af.org_id = o.id
LEFT JOIN users u ON af.user_id = u.id
WHERE af.issue_id IN (
  SELECT issue_id FROM user_issues WHERE user_id = ?
  UNION
  SELECT issue_id FROM user_follows WHERE user_id = ?
)
ORDER BY af.created_at DESC
LIMIT ? OFFSET ?
```

### Writing to Activity Feed

When evidence/feed/reel is created, also INSERT into `activity_feed`.

### UI Component

`src/components/interactive/activity-feed.tsx` — client component with:
- Infinite scroll / "Load more" pagination
- Each card: user avatar + name + action verb + issue link + org link + timestamp
- Content (text, expandable), media (photos/video), engagement bar (like, comment, share)
- 1 comment expanded, "View N more" for rest

### Seed Data

Seed 30+ activity feed entries across multiple issues and users for all 56 locales.

### WhatsApp Bot

- New action: `get_my_feed` — returns latest 5 activity items

---

## New Feature: Issue:Organisation Intersection Pages

### Concept

New page at `/[locale]/issues/[issueId]/at/[orgId]` — intersection of issue and org.
Example: "Train Cancellations at Northern Rail"

### Page Layout (same as Issue page)

- Hero image (issue hero, org logo overlay)
- Title: "{Issue Name} at {Org Name}"
- Stats (filtered): intersection-specific rioter count
- Section nav pills
- Main content: only evidence/feed/actions related to this specific org+issue
- Sidebar: org details, community health, experts

### Database Changes

Add optional `org_id` to feed table:
```sql
ALTER TABLE feed ADD COLUMN org_id TEXT REFERENCES organisations(id) DEFAULT NULL;
```

### Navigation

- From issue pivot table: clicking org → intersection page
- From org page: clicking issue → intersection page
- Intersection page has links to both full issue and full org pages

### WhatsApp Bot

- New action: `get_issue_at_org`

---

## Redesigned Organisation Page

Same layout as issue page: hero, sidebar, section nav. Issues list replaces pivot toggle (clickable → intersection pages). Evidence section (org-wide). Community section.

---

## Redesigned Pivot Table

- **Issue pages:** Remove toggle. Show orgs only. Clickable rows → intersection pages.
- **Org pages:** Remove toggle. Show issues only. Clickable rows → intersection pages.
- Keep purple styling as feature identity.

---

## Global Nav Search

Search input in nav bar. Desktop: expandable. Mobile: overlay. Searches issues + orgs + synonyms. Dropdown results panel. New `GET /api/search` endpoint.

---

## Other UI Changes

- Use actual `logo-192.png` in nav (NOT a CSS approximation)
- "First Rioter" → **"Founding Quiet Rioter"**
- Community Health: clickable → Community section
- Countries "View all" → Community section
- Evidence feed at bottom of issue overview → "View more" → Evidence section
- **Logotype in blue** (`#188BFF`), larger (`text-xl font-extrabold`)
- **Assistants removed from nav** — moved to profile dropdown (Profile, Wallet, Assistants, Sign out)
- **Wallet balance in nav** — clickable → wallet page, formatted per user's country currency
- **Language selector in nav** — `<LanguageSelector />` (shows global reach)
- **Search always expanded** on desktop, always visible at top on mobile
- **Purple → Teal** for pivot/Pareto tables (`#0d9479` — fresh, complements blue without competing)
- **Riot Reels in activity feed** — YouTube video preview with play button, duration badge, "🎬 Riot Reel" tag

---

## Phase Plan

### Phase 0: Database Migrations + Types
### Phase 1: Colour Palette + Logo
### Phase 2: Nav Bar + Footer + Global Search
### Phase 3: Follow Feature
### Phase 4: Activity Newsfeed
### Phase 5: Hero Image Component + Issue Page Redesign
### Phase 6: Issue:Org Intersection Pages
### Phase 7: Organisation Page Redesign
### Phase 8: OpenAI Image Generation Pipeline
### Phase 9: Approval Flow Integration
### Phase 10: Backfill Existing Entities
### Phase 11: Browse Pages + Card Redesign
### Phase 12: Homepage + All Remaining Pages
### Phase 13: i18n for All New UI Text

---

## WhatsApp Bot New Actions

| Action | Description |
|--------|-------------|
| `follow_issue` | Follow an issue |
| `get_followed_issues` | List followed issues |
| `get_my_feed` | Personalised activity feed |
| `get_issue_at_org` | Intersection detail |
| `search_all` | Search issues + organisations |

Enhanced: `join_issue` (auto-follows), `get_organisation` (evidence/community)

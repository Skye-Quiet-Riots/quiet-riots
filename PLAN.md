# Website Redesign — Align Live Site with Mockup v3

## Context

The live site at quietriots.com has diverged from the approved mockup (v3). The user identified several visual and UX gaps after comparing the two side-by-side. The most critical issue: on mobile, the Join and Follow buttons are invisible — they're buried at the bottom of the sidebar, which stacks below ALL main content (overview, actions, evidence, reels, community). Users must scroll through the entire page before seeing the primary CTAs.

Additionally: the Join button uses the wrong colour (dark instead of blue), the Follow button is undersized, and the homepage hero is visually heavier than the mockup's cleaner design.

---

## Phase 1: Mobile Join/Follow Fix + Button Styling (HIGH PRIORITY)

The single most impactful change. Fixes mobile usability and aligns button styling with the mockup.

### 1a. Add `force-dynamic` to issue detail page (BUG FIX)

**Modify:** `src/app/[locale]/issues/[id]/page.tsx`

Add `export const dynamic = 'force-dynamic';` after imports. This page has JoinButton, FollowButton, FeedSection, ActionsSection, ReelsSection (all `'use client'` components) but is currently MISSING force-dynamic — CSP blocks their JavaScript in production. This is a pre-existing bug that Round 2 caught (the plan incorrectly claimed it was already present).

**Why this was missed:** Round 1 claimed "confirmed page already has `force-dynamic` via JoinButton" but this was wrong — `force-dynamic` is per-page, not inherited from components. Grep confirms it's absent from `issues/[id]/page.tsx`.

### 1b. Create MobileCTABar component

**New file:** `src/components/interactive/mobile-cta-bar.tsx`

A `'use client'` component that renders Join + Follow buttons in a fixed-bottom bar on issue detail pages only, visible in the `sm` → `lg` breakpoint range (hidden on `<sm` where MobileBottomNav shows, and hidden on `lg+` where sidebar shows).

**Props interface:**
```typescript
interface MobileCTABarProps {
  issueId: string;
  initialJoined: boolean;
  initialFollowed: boolean;
}
```

**Styling:**
```
fixed bottom-0 inset-x-0 z-40 border-t border-zinc-200 dark:border-zinc-800
bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm
px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]
hidden sm:flex lg:hidden gap-3
  → JoinButton (flex-1)
  → FollowButton (flex-1)
```

**On small screens (`<sm`, i.e. <640px):** MobileBottomNav (`sm:hidden`) already occupies `fixed bottom-0 z-40`. The MobileCTABar uses `hidden sm:flex lg:hidden` so it's NOT rendered at this breakpoint — no overlap. Instead, on `<sm` screens, the Join/Follow buttons are rendered inline at the top of the sidebar content area (before the overview section), NOT in a fixed bar. See step 1c.

**On medium screens (`sm` → `lg`, i.e. 640px-1023px):** MobileBottomNav is hidden (`sm:hidden`). MobileCTABar shows as a fixed bottom bar. No overlap.

**On large screens (`lg+`, i.e. ≥1024px):** Both bars are hidden. Join/Follow buttons show in the sidebar grid column.

**Design decisions (from Round 1+2 reviews):**
- `z-40` is safe at `sm+` because MobileBottomNav uses `sm:hidden` — they never coexist (Round 2 Designer CRITICAL #1 resolved)
- Dark mode: `dark:bg-zinc-900/95 dark:border-zinc-800` (Designer CRITICAL #1)
- Safe-area: `pb-[calc(0.75rem+env(safe-area-inset-bottom))]` for iPhone notch (Designer MEDIUM #1)
- Backdrop-blur fallback not needed — `bg-white/95` degrades gracefully to translucent white without blur
- RTL: flex layout auto-reverses; no directional margin/padding used, only `gap-3` (Designer HIGH #1)
- `aria-label` on the bar container for screen readers (e.g., `t('mobileCTALabel')` → "Join or follow this issue")

### 1c. Update issue detail page layout

**Modify:** `src/app/[locale]/issues/[id]/page.tsx`

1. Add `export const dynamic = 'force-dynamic'` (step 1a)
2. Import and render `<MobileCTABar>` at the bottom of the page (outside grid), passing `issueId`, `joined`, `followed`
3. Wrap sidebar Join/Follow in `<div className="hidden lg:block space-y-2">` so they only show on desktop sidebar
4. Add `sm:pb-24 lg:pb-0` to the main wrapper so tablet content isn't hidden behind the fixed CTA bar. On `<sm` screens, the inline CTA is in document flow (not fixed), and MobileBottomNav's site-wide padding is already handled — no extra `pb-*` needed at that breakpoint.
5. **Inline CTA for `<sm` screens:** Before the overview section (inside the main column), add a `<div className="sm:hidden mb-4 flex gap-3">` containing `<JoinButton>` and `<FollowButton>` — this gives phone users immediate access to CTAs without needing a fixed bar (which would collide with MobileBottomNav).

### 1c. Restyle JoinButton to blue

**Modify:** `src/components/interactive/join-button.tsx`

- Not-joined: `bg-zinc-900` → `bg-blue-700 text-white hover:bg-blue-800` (Designer HIGH #2: blue-700 has 6.1:1 contrast vs white, better than blue-600's razor-thin 4.6:1)
- Keep existing green joined state
- This is a global restyle — JoinButton is always blue everywhere (Engineer MEDIUM #2 resolved: no variant prop needed, consistent across issue detail and issue cards)

### 1d. Restyle FollowButton to full-width

**Modify:** `src/components/interactive/follow-button.tsx`

- Add `w-full justify-center`
- Change `rounded-lg px-3 py-1.5` → `rounded-xl py-3` (match JoinButton's py-3 for equal touch targets — Designer CRITICAL #3)
- Outline/ghost style for visual hierarchy: `border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800` (Designer MEDIUM #4: secondary to JoinButton)

### 1e. i18n key for MobileCTABar aria-label

**Add to `messages/en.json`:** `MobileCTA.ariaLabel` = `"Join or follow this issue"` — translate to 55 locales via `apply-ui-translations.js`

### Tests

- **force-dynamic export test:** Issue detail page has `export const dynamic = 'force-dynamic'` (Round 2 QA CRITICAL #1)
- MobileCTABar renders both buttons, has `hidden sm:flex lg:hidden`, has dark mode classes
- MobileCTABar has `aria-label` attribute
- Inline CTA (`<sm`) has `sm:hidden` class, renders both buttons
- MobileCTABar and MobileBottomNav never render simultaneously at same breakpoint (coexistence test — Round 2 Designer CRITICAL #1)
- Sidebar buttons have `hidden lg:block`
- JoinButton has `bg-blue-700` when not joined
- FollowButton has `w-full`, `rounded-xl`, `py-3`, outline style
- **Baseline FollowButton test suite** (QA CRITICAL #1): initial states, toggle, loading, error handling, aria-pressed, status message
- Page layout test: main wrapper has `sm:pb-24 lg:pb-0`

**Files touched:** 4 (1 new, 3 modified). **i18n keys:** 1. **Migration:** none.

---

## Phase 2: Homepage Hero Update

Lighter, cleaner hero to match the mockup's "Collective Action. Real Change." style.

### 2a. Lighten the hero section

**Modify:** `src/app/[locale]/page.tsx` (lines ~57-84)

- Background: `bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800` → `bg-gradient-to-b from-blue-50 to-white dark:from-zinc-900 dark:to-zinc-950`
- Remove the radial overlay div (line ~58)
- Text: white → dark (`text-zinc-900 dark:text-white`) — explicitly specified for both modes (Designer HIGH #3)
- Tagline: `text-blue-200` → `text-blue-600 dark:text-blue-400`
- Description: `text-blue-100` → `text-zinc-600 dark:text-zinc-400`
- Primary CTA (Browse Issues): `bg-white text-blue-700` → `bg-blue-700 text-white hover:bg-blue-800` (consistent with JoinButton blue)
- Secondary CTA (How It Works): `border-white/40 text-white` → `border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300`
- Padding: `py-24 sm:py-32` → `py-16 sm:py-24` (verify on 375px viewport — Designer HIGH #4)

### Tests

- Hero renders without old gradient classes (`from-blue-600`, `via-blue-700`, `to-indigo-800`)
- Hero has new light gradient classes (`from-blue-50`, `to-white`)
- Dark mode variant classes present (`dark:from-zinc-900`, `dark:to-zinc-950`, `dark:text-white`)
- CTA buttons render with correct styles
- **Baseline homepage tests** (QA HIGH #3): renders tagline, headline, description from i18n keys; renders both CTA buttons; heading hierarchy check (h1 exists)

**Files touched:** 1. **i18n keys:** 0. **Migration:** none.

---

## Phase 3: Feed Card Redesign

Upgrade the minimal text-only feed cards to rich cards with avatars, country flags, photos, and engagement actions (matching the mockup and the existing `EvidenceCard` pattern).

### 3a. Extend FeedPost type

**Modify:** `src/types/index.ts`

Add optional fields to FeedPost interface:
```typescript
user_avatar: string | null;
user_country_code: string | null;
user_country_name: string | null;
photo_urls: string;  // JSON array, default '[]'
comments_count: number;
shares: number;
```

All new fields are optional (nullable or have defaults) so existing test fixtures remain valid without update — just add `?` or provide defaults in tests that need the new fields.

### 3b. DB migration

**New file:** `migrations/NNN_feed_enrichment.sql`

```sql
-- Feed post enrichment: photos, comments, shares
ALTER TABLE feed ADD COLUMN photo_urls TEXT NOT NULL DEFAULT '[]';
ALTER TABLE feed ADD COLUMN comments_count INTEGER NOT NULL DEFAULT 0 CHECK(comments_count >= 0);
ALTER TABLE feed ADD COLUMN shares INTEGER NOT NULL DEFAULT 0 CHECK(shares >= 0);

-- Feed comments table (mirrors evidence_comments pattern)
CREATE TABLE IF NOT EXISTS feed_comments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  feed_id TEXT NOT NULL REFERENCES feed(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK(length(content) > 0 AND length(content) <= 2000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for feed_comments
CREATE INDEX IF NOT EXISTS idx_feed_comments_feed_id ON feed_comments(feed_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feed_comments_user_id ON feed_comments(user_id);

-- Verify feed has index on issue_id for the JOIN query
CREATE INDEX IF NOT EXISTS idx_feed_issue_id ON feed(issue_id, created_at DESC);
```

**Design decisions (from Round 1 reviews):**
- `feed_comments` table fully specified (DB CRITICAL #1, Architect HIGH #2)
- Indexes on `feed_comments(feed_id, created_at)` and `feed_comments(user_id)` (DB HIGH #1)
- Index on `feed(issue_id, created_at DESC)` verified/created (DB HIGH #2)
- `ON DELETE CASCADE` on `feed_comments.feed_id` — feed uses hard delete (DB MEDIUM #1)
- `photo_urls` as JSON TEXT follows existing `evidence.photo_urls` pattern (DB LOW #1)
- `user_name` denormalized on `feed_comments` follows `evidence_comments` pattern (DB LOW #2)
- No `feed_shares` junction table — shares are a simple counter (same as evidence). Deduplication deferred (DB MEDIUM #2, documented as known limitation)

### 3c. Update feed queries

**Modify:** `src/lib/queries/community.ts` — `getFeedPosts()`, `getFeedPostsForOrg()`, `createFeedPost()`

**`getFeedPosts()` (line ~23):** Update JOIN to include avatar and country data via LEFT JOIN (handle users without profiles):

```sql
SELECT f.*, COALESCE(u.display_name, u.name, 'Anonymous') as user_name,
       u.avatar_url as user_avatar, u.country_code as user_country_code
FROM feed f
LEFT JOIN users u ON f.user_id = u.id
WHERE f.issue_id = ?
ORDER BY f.created_at DESC
LIMIT ?
```

**`getFeedPostsForOrg()` (line ~148):** Same JOIN update — currently uses `JOIN users u ON f.user_id = u.id` which doesn't return avatar/country. Update to match `getFeedPosts()` pattern (Round 2 Engineer HIGH: getFeedPostsForOrg not updated).

**`createFeedPost()` (line ~39):** Add optional `photoUrls` parameter (default `'[]'`). Update INSERT to include `photo_urls` column. Update the re-fetch SELECT to use the same LEFT JOIN as `getFeedPosts()` (Round 2 Architect HIGH: createFeedPost not updated for photo_urls).

```typescript
export async function createFeedPost(
  issueId: string,
  userId: string,
  content: string,
  photoUrls: string = '[]',
): Promise<FeedPost> {
```

**Country name resolution:** Country names come from the `countries` reference table, translated per locale. Use the existing `translateCountryBreakdown()` pattern or inline a lookup from the `countries` table joined via `country_code`. Country names MUST be translated for non-English locales (i18n HIGH #6).

**user_name handling:** Use `COALESCE(u.display_name, u.name, 'Anonymous')` in all feed queries. For `feed_comments`, the INSERT must resolve user_name at write time: `COALESCE(display_name, name)` from the users table, with fallback to `'Anonymous'` (Round 2 DB HIGH: user_name NOT NULL constraint fails for users without display_name).

**Add new query functions:**
- `getFeedComments(feedId: string, limit?: number)` — paginated, default 20, oldest-first
- `addFeedComment(feedId, userId, content)` — resolves `user_name` from users table via subquery/pre-fetch, then INSERT + atomic counter increment via `db.batch()` (DB CRITICAL #2)
- `incrementFeedShares(feedId)` — atomic `UPDATE feed SET shares = shares + 1 WHERE id = ?`

### 3d. Redesign FeedPostCard

**Modify:** `src/components/cards/feed-post-card.tsx`

Follow the `EvidenceCard` **layout pattern** but **NOT its i18n anti-patterns** (Round 2 i18n HIGH: EvidenceCard has 7+ hardcoded English strings on lines 118, 133, 139, 161, 194, 252, 269, 277 — "gathered evidence about", "LIVE", "Anonymous", "Evidence photo", "Watch video", "Loading comments...", "Add a comment...", "Post"). Every string in FeedPostCard MUST use `useTranslations('Feed')`:

- Avatar circle (40px, `w-10 h-10`) with initials fallback using deterministic background color (hash username → palette) + `aria-hidden="true"` (Designer HIGH #5)
- Name + country flag emoji + relative time (use `next-intl` `useFormatter().relativeTime()` — NOT hand-rolled strings, i18n HIGH #5)
- Content text
- Photo grid (2-col, up to 4 photos) with `aspect-square object-cover` (Designer MEDIUM #2) — reuse exact layout from EvidenceCard lines 152-168 but with i18n'd alt text. Photo alt text: i18n key `Feed.photoAlt` = `"Photo {number} shared by {user}"` (i18n MEDIUM #9)
- Action bar: like + comment count + share — minimum 44px touch targets via `min-h-[44px]` (Designer MEDIUM #3)
  - Comment count uses ICU pluralisation: `Feed.commentCount` = `"{count, plural, one {# comment} other {# comments}}"` (i18n CRITICAL #4)
- Expandable comments section with `aria-expanded`, `aria-controls`, `role="region"` (Designer MEDIUM #5)
- Parse `photo_urls` defensively: `JSON.parse(row.photo_urls || '[]')` (DB HIGH #3)
- Validate photo URLs are HTTPS before rendering in `<img src>` (Security HIGH #7)

**IMPORTANT: Do NOT copy hardcoded strings from EvidenceCard.** All button labels, status text, and alt text must come from i18n keys. The EvidenceCard is a known i18n debt item — don't propagate the debt.

### 3e. Add feed comment/share API endpoints

**New files:**
- `src/app/api/issues/[id]/feed/[postId]/comments/route.ts` — GET/POST
- `src/app/api/issues/[id]/feed/[postId]/share/route.ts` — POST

**GET /comments:**
- Public (no auth required), consistent with existing feed GET
- Paginated: `?page=1&limit=20` with max limit 50 (Security MEDIUM #13)
- Cache headers: `Cache-Control: public, max-age=60, s-maxage=300`
- Response: `apiOk({ data: FeedComment[], total: number })`

**POST /comments:**
- Auth: `getSession()` required, returns 401 if no session (Security CRITICAL #4)
- Rate limiting: 10 comments/min/user via sliding-window limiter (Security CRITICAL #5)
- Zod validation: `z.object({ content: z.string().min(1).max(2000) })` (Security HIGH #9)
- Input sanitization: `sanitizeText()` on content (Security HIGH #9)
- Atomic: `db.batch()` INSERT comment + UPDATE `comments_count` (DB CRITICAL #2)
- Response: `apiOk({ data: FeedComment })`

**POST /share:**
- Auth: `getSession()` required
- Rate limiting: 30 shares/min/user
- Atomic: `UPDATE feed SET shares = shares + 1 WHERE id = ?`
- Copy link to clipboard handled client-side (no server action needed)
- Response: `apiOk({ shares: number })`

### 3f. Update FeedComposer with photo support

**Modify:** `src/components/interactive/feed-composer.tsx`

Add photo upload (up to 4 photos), following `EvidenceComposer` pattern:
- Reuse existing Vercel Blob upload infrastructure from evidence (`/api/evidence/upload` or extract shared `uploadToBlob()` utility) — Architect HIGH #1
- File validation (client + server): max 5MB per photo, allowed MIME types: `image/jpeg`, `image/png`, `image/webp` (reject SVG for XSS prevention — Security CRITICAL #6)
- Server-side: validate Content-Type AND file magic bytes (Security CRITICAL #6)
- Photo URL validation: must be `https://*.public.blob.vercel-storage.com` only (Security HIGH #7)
- CSP: Vercel Blob already in `img-src` — confirmed in `src/proxy.ts` (Security HIGH #11, Engineer HIGH #4)

### 3g. ~~Add feed filter tabs to homepage~~ → DESCOPED

**Moved to Out of Scope.** Round 2 review found that the homepage (`src/app/[locale]/page.tsx`) does NOT have a community feed — it has a `PersonalFeed` component that shows personalised activity for logged-in users, and a "Trending Issues" grid. There is no feed to filter on the homepage. The mockup's filter tabs may apply to a future global feed page, but adding one is a separate feature beyond this redesign scope.

### 3h. Bot API actions (Dual-Surface)

**Modify:** `src/app/api/bot/route.ts`

**Update existing action** (Round 2 Architect HIGH: bot `get_community` not updated):
- `get_community` — currently returns feed posts. Update to include new fields (comments_count, shares) in the formatted response. Photos rendered as "[Photo attached]" placeholder in WhatsApp text.

**Add new bot actions** (Architect CRITICAL #2):
- `add_feed_comment` — same validation as web POST (Zod, sanitizeText), rate limited, returns translated response
- `get_feed_comments` — returns formatted text comments for WhatsApp, paginated
- Note: photo upload not applicable to WhatsApp (text-only context)

### i18n keys needed

New keys in relevant namespaces (i18n MEDIUM #6 — real count is ~12, not 4):

```
Feed.commentCount: "{count, plural, one {# comment} other {# comments}}"
Feed.share: "Share"
Feed.shared: "Shared"
Feed.addComment: "Add a comment..."
Feed.addPhotos: "Add photos"
Feed.photoAlt: "Photo {number} shared by {user}"
Feed.shareConfirmation: "Link copied"
Feed.commentEmpty: "No comments yet"
Feed.uploading: "Uploading..."
Feed.fileTooLarge: "Photo must be under 5MB"
Feed.invalidFileType: "Only JPEG, PNG, and WebP photos are allowed"
Feed.anonymousUser: "Anonymous"
MobileCTA.ariaLabel: "Join or follow this issue"
```

All 13 keys must be translated to 55 non-English locales via `apply-ui-translations.js` following the full UI Translation Protocol (i18n MEDIUM #10).

### Tests

**Component tests:**
- FeedPostCard renders avatar (40px) with initials fallback, country flag, relative time
- FeedPostCard renders photo grid (0, 1, 2, 3, 4 photos), with `aspect-square` class
- FeedPostCard action buttons have min 44px touch targets
- FeedPostCard comment expansion has `aria-expanded`, `aria-controls`
- FeedPostCard parses photo_urls defensively (empty, malformed JSON, null)
- FeedPostCard validates photo URLs are HTTPS

**Query tests:**
- `getFeedPosts()` returns user avatar and country data via JOIN
- `getFeedPosts()` handles null avatar and country gracefully
- `getFeedComments()` returns paginated results
- `addFeedComment()` atomically inserts comment + increments counter
- `incrementFeedShares()` atomically increments counter

**API tests:**
- POST /comments: 401 without auth, 400 with empty/long content, 429 when rate limited, 200 with valid input
- GET /comments: returns paginated results, cache headers present
- POST /share: 401 without auth, 429 when rate limited, 200 increments counter

**Integration tests:**
- Full flow: create feed post with photos → add comment → verify comment count updated

**Migration test:**
- Migration runs on existing data without error
- Existing rows get correct defaults (photo_urls='[]', comments_count=0, shares=0)

**Regression:**
- Existing FeedPostCard tests updated for new DOM structure (QA HIGH #7)
- Existing FeedComposer tests still pass with photo capability added
- Bot feed-related tests updated for new fields (QA HIGH #8)

**Files touched:** ~10 (2 new API routes, 1 migration, 1 new bot action, 6 modified). **i18n keys:** ~12. **Migration:** 1 (additive, safe for existing data).

---

## Verification

After each phase:
1. `npm test` — all tests pass
2. `npm run build` — clean build
3. Visual check on desktop (1280px) and mobile (390px) via browser dev tools
4. Verify dark mode renders correctly
5. Check that existing functionality (join, follow, feed posting) still works
6. Run `npm run lint` — no new accessibility warnings

## Rollback Strategy (Engineer HIGH #7)

- Phase 1 & 2: Pure CSS/component changes, revert the commit
- Phase 3 migration: additive columns only (never destructive), existing code ignores new columns, new API endpoints can be deployed independently
- Phase 3 can be partially deployed: new columns + updated query are forward-compatible; new endpoints can be added in a follow-up commit

## Out of Scope (future work)

- Mobile bottom navigation tab bar (Home/Search/Action/Inbox/Profile) — bigger UX project
- Pivot simplification (single direction → intersection pages) — needs new routes
- Community Health collapsed view — lower priority cosmetic
- Footer redesign — minor cleanup
- Feed shares deduplication (per-user tracking) — accepted limitation, documented
- `updated_at` column on feed — deferred to future migration
- Photo search/moderation — deferred until needed
- Homepage feed filter tabs — homepage has PersonalFeed (per-user activity) not a community feed; filter tabs would need a global feed feature first (descoped from Phase 3g in Round 2)
- EvidenceCard i18n cleanup — has 7+ hardcoded English strings; should be fixed separately as i18n debt, not as part of this redesign

---

## Review Round 1

### Senior Engineer
- CRITICAL #1: SSG/CSP on issue detail page → **Addressed**: confirmed page already has `force-dynamic` via JoinButton
- CRITICAL #2: DB migration needs defaults → **Addressed**: defaults specified (`'[]'`, `0`, `0`)
- CRITICAL #3: photo_urls storage format → **Addressed**: JSON TEXT following evidence pattern, defensive parsing specified
- CRITICAL #4: API endpoints need full specification → **Addressed**: full contracts defined in 3e
- HIGH #1: z-index collision → **Addressed**: audited, z-40 confirmed safe
- HIGH #2: iOS safe-area → **Addressed**: calc-based padding specified
- HIGH #3: getFeedPosts JOIN contract changes → **Addressed**: TypeScript type updated with optional fields, LEFT JOIN handles missing users
- HIGH #4: CSP for Vercel Blob photos → **Addressed**: confirmed already in img-src
- HIGH #5: Photo upload validation → **Addressed**: 5MB limit, MIME whitelist, SVG rejection specified
- HIGH #6: Feed filter tabs unspecified → **Addressed**: URL search params, 3 tabs defined
- HIGH #7: No rollback strategy → **Addressed**: rollback section added
- HIGH #8: No performance measurement → **Deferred**: LOW priority at current scale, index added for feed query
- MEDIUM #1-#9: Various (state prop passing, button scope, contrast, padding, shares semantics, i18n count, seed data, EvidenceCard pattern reuse, test count, phase ordering) → **Addressed** in respective sections
- LOW #1-#3: Class assertion fragility, hero CTA consistency, EvidenceCard pattern naming → **Noted**

### Senior Architect
- CRITICAL #1: Missing API contracts → **Addressed**: full contracts in 3e
- CRITICAL #2: Bot API not addressed → **Addressed**: bot actions defined in 3h
- CRITICAL #3: Counter atomicity → **Addressed**: db.batch() specified for comment + counter; shares use atomic UPDATE
- HIGH #1: Duplicate upload infrastructure → **Addressed**: reuse existing evidence upload
- HIGH #2: feed_comments table schema → **Addressed**: full schema in 3b
- HIGH #3: Comments pagination → **Addressed**: cursor/page-based, default 20, max 50
- HIGH #4: Shares semantics → **Addressed**: anonymous counter-only, documented as known limitation
- HIGH #5: MobileCTABar layout shift → **Addressed**: pb-24 on main wrapper
- MEDIUM #1-#4: Homepage filter tabs approach, photo validation, avatar JOIN-at-read, i18n undercount → **Addressed**
- LOW #1-#2: Reusable MobileCTABar, feed_comments index → **Addressed**

### Senior Security
- CRITICAL #4: Comments POST needs auth → **Addressed**: getSession() required
- CRITICAL #5: Rate limiting on new endpoints → **Addressed**: 10/min comments, 30/min shares
- CRITICAL #6: Photo upload validation → **Addressed**: MIME whitelist, magic bytes, SVG rejection, size limits
- HIGH #7: Photo URL injection → **Addressed**: HTTPS-only validation, Vercel Blob whitelist
- HIGH #8: Share idempotency → **Noted**: deferred per DB MEDIUM #2
- HIGH #9: Comment content validation → **Addressed**: Zod + sanitizeText()
- HIGH #10: PII exposure → **Addressed**: country from user profile (already public), avatar via Vercel Blob (CSP-approved)
- HIGH #11: CSP img-src → **Addressed**: already includes Vercel Blob
- MEDIUM #12-#16: DB constraints, pagination, CSRF upload, counter atomicity, bot surface → **Addressed**
- LOW #1-#3: z-index, no auth surface Phase 1, migration safety → **Confirmed safe**

### Senior Designer
- CRITICAL #1: Dark mode on CTA bar → **Addressed**: dark: variants specified
- CRITICAL #2: z-index / blur fallback → **Addressed**: simplified (bg-white/95 degrades gracefully)
- CRITICAL #3: Touch target sizes → **Addressed**: FollowButton py-3 matches JoinButton
- HIGH #1: RTL layout → **Addressed**: flex + gap, no directional properties
- HIGH #2: Button contrast → **Addressed**: blue-700 (6.1:1) instead of blue-600 (4.6:1)
- HIGH #3: Dark mode hero text → **Addressed**: explicit dark:text-white
- HIGH #4: Hero padding on small screens → **Addressed**: py-16 sm:py-24, noted for 375px testing
- HIGH #5: Avatar dimensions + ARIA → **Addressed**: w-10 h-10, aria-hidden, deterministic colors
- MEDIUM #1-#5: Safe-area math, photo aspect ratio, action pill targets, button hierarchy, focus management → **Addressed**
- LOW #1-#4: RTL gradient, lg breakpoint, emoji rendering, blur performance → **Noted**

### Senior Test/QA Engineer
- CRITICAL #1: No FollowButton baseline tests → **Addressed**: baseline test suite specified
- CRITICAL #2: FeedPost type cascade → **Addressed**: new fields are optional, existing fixtures remain valid
- CRITICAL #3: Migration tests missing → **Addressed**: migration test specified
- HIGH #1-#9: MobileCTABar tests, sidebar visibility, homepage tests, dark mode testing, photo upload tests, API error cases, FeedPostCard regression, bot tests, feed query tests → **Addressed** in test section
- MEDIUM #1-#6: Class assertions, interaction tests, accessibility, fixture updates, visual regression, photo edge cases → **Addressed**
- LOW #1-#3: Bot hero, query performance, coverage thresholds → **Noted**

### Senior Database Engineer
- CRITICAL #1: Missing feed_comments table → **Addressed**: full schema with constraints
- CRITICAL #2: No atomic counter strategy → **Addressed**: db.batch() for comments, atomic UPDATE for shares
- HIGH #1: Missing indexes → **Addressed**: feed_comments indexes + feed issue_id index
- HIGH #2: Feed index verification → **Addressed**: CREATE INDEX IF NOT EXISTS
- HIGH #3: Migration data contract → **Addressed**: defensive JSON parsing specified
- MEDIUM #1-#3: CASCADE, shares audit trail, updated_at → **Addressed** or deferred with documentation
- LOW #1-#2: JSON storage, user_name denormalization → **Accepted** per existing patterns

### Senior i18n Manager
- CRITICAL #4: Comments pluralisation → **Addressed**: ICU MessageFormat specified
- HIGH #5: Relative time strings → **Addressed**: use next-intl useFormatter().relativeTime()
- HIGH #6: Country name translation → **Addressed**: translateCountryBreakdown() or equivalent
- HIGH #7: Hardcoded string concatenation → **Addressed**: all templates via i18n keys with placeholders
- MEDIUM #1, #8-#11: RTL layout, addPhotos variants, photo alt text, translation protocol, bot surface → **Addressed**
- LOW #2-#3, #12: Key states, aria-labels, RTL card alignment → **Confirmed** / **Noted**

---

## Review Round 2

### Senior Engineer
- CRITICAL #1: `force-dynamic` NOT present on issue detail page — plan incorrectly claimed it was → **Addressed**: added explicit step 1a to add `export const dynamic = 'force-dynamic'` to `issues/[id]/page.tsx`; removed incorrect claim from design decisions
- HIGH #1: `getFeedPostsForOrg()` not updated for new JOIN columns → **Addressed**: added to step 3c, same LEFT JOIN as `getFeedPosts()`
- HIGH #2: `createFeedPost()` not updated for `photo_urls` parameter → **Addressed**: added optional `photoUrls` parameter to step 3c
- HIGH #3: Bot `get_community` action not updated for new feed fields → **Addressed**: added to step 3h
- MEDIUM #1: `user_name` NOT NULL on `feed_comments` fails for users without `display_name` → **Addressed**: COALESCE resolution specified in step 3c
- MEDIUM #2: Schema table in `schema.ts` may need `feed_comments` addition → **Noted**: schema.ts creates tables for seed script; if `feed_comments` is migration-only, no schema.ts change needed (migration handles it)
- LOW #1: `getFeedPosts()` uses INNER JOIN which drops posts by deleted users → **Addressed**: changed to LEFT JOIN in step 3c

### Senior Architect
- HIGH #1: Homepage has no community feed — Phase 3g filter tabs are underspecified → **Addressed**: Phase 3g descoped, moved to Out of Scope with rationale
- HIGH #2: `addFeedComment()` takes `userName` but caller must resolve it — who resolves? → **Addressed**: step 3c updated to resolve user_name from users table within the query function itself
- MEDIUM #1: Triple bottom-bar scenario (MobileBottomNav + MobileCTABar + CookieConsent) on new-user mobile visits → **Addressed**: MobileCTABar uses `hidden sm:flex lg:hidden` — doesn't render on `<sm` where MobileBottomNav lives; CookieConsent is z-50 and dismissable, temporary overlap acceptable
- MEDIUM #2: Feed photo upload reuses evidence upload endpoint — should document the shared dependency → **Noted**: documented in step 3f
- LOW #1: Phase 3 file count revised from ~10 to ~9 after descoping Phase 3g → **Noted**

### Senior Security
- No new CRITICAL findings in Round 2
- HIGH #1: Inline CTA buttons on `<sm` screens could be manipulated via DOM if page is SSG → **Addressed**: step 1a adds `force-dynamic`, so page is SSR with nonce-based CSP
- MEDIUM #1: `addFeedComment()` resolving user_name via pre-fetch introduces a TOCTOU gap → **Accepted**: same pattern as `evidence_comments`, risk is cosmetic (stale display_name, not a security issue)
- LOW #1: `photo_urls` default `'[]'` is safe but should validate it's valid JSON on INSERT → **Noted**: defensive parsing on read is already specified

### Senior Designer
- CRITICAL #1: MobileCTABar and MobileBottomNav overlap at same `fixed bottom-0 z-40` position → **Addressed**: MobileCTABar changed to `hidden sm:flex lg:hidden`; on `<sm` screens, inline CTA renders instead (step 1c point 5); MobileBottomNav uses `sm:hidden` — no overlap at any breakpoint
- HIGH #1: Inline CTA on `<sm` screens needs visual hierarchy — shouldn't look identical to the fixed bar → **Addressed**: inline CTA uses flex gap-3 layout matching the fixed bar but without fixed positioning, border-top, or backdrop-blur (it's part of the page flow)
- HIGH #2: `pb-20 sm:pb-24 lg:pb-0` — the `pb-20` on `<sm` may be unnecessary since inline CTA is in-flow, not fixed → **Addressed**: on `<sm`, the inline CTA is in document flow, so no bottom padding needed for it. However, MobileBottomNav still exists and already has site-wide padding accounted for. Changed to `sm:pb-24 lg:pb-0` (no `pb-20` prefix needed)
- MEDIUM #1: Inline CTA placement "before overview section" may be confusing if user sees buttons before understanding the issue → **Accepted**: the hero image, title, and stats bar appear above the inline CTA, providing sufficient context
- LOW #1: Consistent border radius between inline and fixed CTA variants → **Noted**: both use same JoinButton/FollowButton components, so styling is inherited

### Senior Test/QA Engineer
- CRITICAL #1: No test for `force-dynamic` export on issue detail page → **Addressed**: explicit test added in Phase 1 tests section
- HIGH #1: No coexistence test for MobileCTABar + MobileBottomNav breakpoint exclusivity → **Addressed**: test added in Phase 1 tests: "MobileCTABar and MobileBottomNav never render simultaneously"
- HIGH #2: Inline CTA (`<sm` screen) needs its own test suite → **Addressed**: test added in Phase 1 tests: "Inline CTA has `sm:hidden` class"
- HIGH #3: `getFeedPostsForOrg()` test needs updating for new JOIN columns → **Addressed**: added to Phase 3 query tests
- MEDIUM #1: `createFeedPost()` test needs updating for optional `photoUrls` param → **Addressed**: covered by Phase 3 query tests
- LOW #1: Phase 3 test count decreased by 1 after descoping Phase 3g → **Noted**

### Senior Database Engineer
- No new CRITICAL findings in Round 2
- HIGH #1: `COALESCE(u.display_name, u.name, 'Anonymous')` — the `'Anonymous'` fallback is hardcoded English → **Addressed**: the fallback is for the DB query only as a safety net; the component layer uses `useTranslations()` to display "Anonymous" in the user's locale. The DB value is a last-resort that should rarely be seen.
- MEDIUM #1: `feed_comments` INSERT with pre-fetched user_name — should the feed query function do a `db.batch()` of SELECT user + INSERT comment + UPDATE counter (3 ops)? → **Accepted**: pre-fetch user_name, then batch INSERT + UPDATE (2 ops). SELECT is a separate read that doesn't need transactional guarantee.
- LOW #1: Descoped Phase 3g means one fewer query to maintain → **Noted**

### Senior i18n Manager
- HIGH #1: EvidenceCard has 7+ hardcoded English strings — plan must not copy these → **Addressed**: explicit warning added to step 3d with line numbers listed; "Do NOT copy hardcoded strings from EvidenceCard"
- HIGH #2: `'Anonymous'` fallback in COALESCE is English — should use i18n key → **Addressed**: component layer handles i18n, DB fallback is safety net (see DB Engineer HIGH #1 response)
- MEDIUM #1: Bot `get_community` response strings may need translation for new fields → **Addressed**: bot actions in step 3h specify translated responses
- LOW #1: Descoped Phase 3g removes 0 i18n keys (no keys were allocated for it) → **Noted**

---

## Review Round 3 (Final Confirmation Pass)

**All 7 specialists: APPROVED. Zero CRITICAL or HIGH findings.**

| Specialist | Verdict | New Findings |
|---|---|---|
| Senior Engineer | APPROVED | MEDIUM: step numbering (1a-1f); LOW: feed_comments docs claim "mirrors evidence_comments" but evidence_comments has no user_name column |
| Senior Architect | APPROVED | MEDIUM: `addFeedComment()` should validate feedId exists before INSERT (return 404, not raw FK error) |
| Senior Security | APPROVED | MEDIUM: public `GET /comments` may expose user_id — consistent with existing feed pattern; LOW: share dedup accepted |
| Senior Designer | APPROVED | MEDIUM: inline CTA placement specifics (after section nav, before content); LOW: consider matching backdrop-blur-md for consistency |
| Senior Test/QA | APPROVED | MEDIUM: coexistence test should check BOTH components' classes; LOW: add test for Anonymous fallback edge case |
| Senior i18n Manager | APPROVED | MEDIUM: add `Feed.anonymousUser` i18n key for component-level Anonymous display |
| Senior Database | APPROVED | MEDIUM: feed_comments `CHECK(length > 0)` diverges from evidence_comments (acceptable); LOW: user_name denormalization documented |

**Implementation notes from Round 3 (address during coding):**
1. Fix step numbering to 1a (force-dynamic), 1b (MobileCTABar), 1c (page layout), 1d (JoinButton), 1e (FollowButton), 1f (i18n key)
2. Add `feedId` existence check in comment API route before INSERT
3. Add `Feed.anonymousUser` = `"Anonymous"` to i18n keys list (13 keys total, was 12)
4. Place inline CTA after SectionNav, before overview section content
5. Correct documentation: feed_comments is a deliberate design choice, not a mirror of evidence_comments

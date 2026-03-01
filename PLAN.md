# Website Redesign — Remaining Implementation Plan

## Context

A full mockup was created in session 65 (`http://localhost:8777/qr-full-mockup.html`) and partially implemented across sessions 67 (PRs #163-174). This plan covers the remaining 8 features to complete the mockup implementation.

**Already implemented:** Blue palette, logotype, nav/footer redesign, hero images, DALL-E pipeline, homepage hero, trending issues, Deploy a Chicken, tab nav on issue detail, evidence system with media/comments.

**Still needed:** 9 features in 8 PRs, 2 DB migrations, ~42 hours total.

**Reviewed by:** Senior Developer, Senior Designer, Senior Security Engineer. All findings incorporated below (3 rounds of review).

**Dual-surface protocol:** Every phase includes WhatsApp bot actions alongside web UI. No feature ships web-only.

**i18n protocol:** Every phase includes new UI keys (messages/*.json), translations for all 55 non-English locales, and BotMessages keys where bot actions produce user-facing text. No new DB entity types are needed — all phases use existing translatable entities (issues, orgs, actions, etc.).

---

## Phase 0: Foundational Fixes (prerequisite PR) ✅ COMPLETE (PR #178)

**Effort:** ~1.5 hours | **Migration:** None | **Dependencies:** None

These fixes address review findings that affect ALL subsequent phases. Ship as first PR.

### 0a. Global `:focus-visible` styles
- **File:** `src/app/globals.css`
- Add global focus ring: `:focus-visible { outline: 2px solid var(--brand-blue); outline-offset: 2px; }`
- Without this, keyboard users cannot navigate ANY interactive element (existing or new)
- *[Designer review: CRITICAL finding #2]*

### 0b. Fix hardcoded English in `timeAgo()`
- **File:** `src/components/cards/feed-post-card.tsx` (lines 11-21)
- Replace hardcoded `"5m ago"`, `"3h ago"` strings with `Intl.RelativeTimeFormat(locale)`
- Extract to `src/lib/format.ts` as `formatRelativeTime(date, locale)` — reused by Phase 8 activity cards
- *[Designer review: CRITICAL finding #3 — violates zero-tolerance hardcoded English rule]*

### 0c. Fix `identify` bot action PII exposure
- **File:** `src/app/api/bot/route.ts` (line 891)
- Currently returns full `User` object including `password_hash`, `email`, `phone`, `session_version`
- Create `SafeUserProfile` projection type that excludes sensitive fields
- Apply to `identify` response: `return ok({ user: safeProfile(user), issues, memories })`
- Must fix BEFORE Phase 4/8 enrich `identify` with more data
- *[Security review: HIGH finding #3]*

### 0d. Fix `dangerouslySetInnerHTML` on homepage
- **File:** `src/app/[locale]/page.tsx` (line 177)
- Replace with `t.rich()` pattern (safe React element interpolation)
- Security checklist requires "No `dangerouslySetInnerHTML` anywhere"
- *[Designer review R3: HIGH #1]*

### 0e. Add `viewport-fit=cover` to root layout
- **File:** `src/app/layout.tsx`
- Add `export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }`
- Without this, Phase 5's `env(safe-area-inset-bottom)` evaluates to 0 on iOS — bottom nav overlaps gesture bar
- *[Designer review R3: HIGH #2]*

### 0f. SectionNav ARIA tablist upgrade
- **File:** `src/components/layout/section-nav.tsx` (lines 41-62)
- Current: plain `<button>` elements, no ARIA roles
- Upgrade: `<div role="tablist">`, each button `role="tab"`, `aria-selected`, arrow-key navigation
- Fixes existing tech debt before Phase 6 reuses this component on org detail page
- *[Designer review: HIGH finding #7]*

### i18n: None (no new user-visible strings)
### Bot surface: SafeUserProfile projection affects all bot actions returning user data
### Tests: ~5 (focus-visible rendering, timeAgo locale output, SectionNav ARIA, dangerouslySetInnerHTML removal, viewport-fit)

---

## Phase 1+2: Pivot Blue + Wallet in Nav + Nav Context API (combined PR) ✅ COMPLETE (PR #179)

**Effort:** ~2 hours | **Migration:** None | **Dependencies:** Phase 0

### 1a. Pivot table purple → blue
- **File:** `src/components/data/pivot-table.tsx` (lines 35, 44, 72, 80)
- Replace all `purple-*` Tailwind classes with `blue-*` equivalents:
  - `border-purple-300` → `border-blue-300`
  - `bg-purple-50/50` → `bg-blue-50/50`
  - `bg-purple-100` → `bg-blue-100`
  - `text-purple-700` → `text-blue-700`
  - All corresponding `dark:` variants
- **Accessibility check:** Verify blue-700 on blue-100 meets WCAG AA contrast (4.5:1)
- **Dark mode:** Use `dark:bg-blue-900/30 dark:border-blue-500` (stronger than issue-card blue) so pivot "You" badge row stands out from general blue accent *[Designer review: MEDIUM #16]*

### 1b. Consolidated nav context endpoint
- **New:** `GET /api/users/me/nav-context` — single endpoint returning `{ unreadCount, roles, walletBalance, walletCurrency }`
- **Security:** Derive user ID exclusively from `getSession()` cookie. NEVER accept user ID param.
- **Security:** Route handler MUST explicitly set `Cache-Control: private, no-store` + `Vary: Cookie` in its own response headers — do NOT rely on middleware `/me` path exemption alone. Add a test asserting this header. *[Security review: CRITICAL #1]*
- **Performance:** Wrap all 3 sub-queries in `Promise.all()` with `withTimeout(3000)` (shorter than default 5s since this is UI-blocking) *[Dev review: MEDIUM #9]*
- **File:** `src/components/layout/nav-bar.tsx` — collapse 3 `useEffect` fetches (unread, roles, wallet) into 1 fetch to `/api/users/me/nav-context`
- **Also fix RTL:** Convert `right-0`, `-right-1.5`, `left-0 right-0` in nav-bar.tsx to logical `end-0`, `-end-1.5`, `inset-inline-start-0 inset-inline-end-0` *[Designer review: MEDIUM #10]*
- Display balance as wallet-icon chip (`bg-blue-50 rounded-full px-2` with wallet icon prefix) — visually distinct from unread count badge. Between inbox icon and avatar (desktop), in mobile menu (mobile) *[Designer review: CRITICAL #1]*
- Only show when authenticated and wallet exists

### Bot surface
- **No new bot actions needed.** Bot already has `get_wallet` (balance), `get_inbox` (unread count), and role checks. Nav context is a web-only optimization to reduce parallel fetches.

### i18n
- **UI keys (Nav namespace):** `Nav.walletBalance` (aria-label for balance display), `Nav.walletLabel` (visible label if needed)
- **DB translations:** None — wallet balance is a number formatted via `Intl.NumberFormat`
- **BotMessages:** None
- **Tests:** Nav-context API route tests (auth, response shape, cache headers)

---

## Phase 3: Unified Nav Search with Live Dropdown

**Effort:** ~4-5 hours | **Migration:** None | **Dependencies:** None

### New unified search endpoint
- **New:** `GET /api/search?q=&locale=&limit=10` — single endpoint querying both issues and orgs in one `db.batch()` call
- **Security:** Minimum search length is locale-aware: 1 character for CJK locales (`zh-CN`, `zh-TW`, `ja`, `ko`), 3 characters for Latin scripts. CJK single characters are meaningful words. *[Dev review: MEDIUM #11]*
- **Security:** Rate limit 30 req/min/IP (15/min too restrictive with 200ms debounce — realistic typing generates ~10 requests per search attempt, 2 searches = lockout). Cap at 3 search words maximum (not 5). Add `LIMIT 5` inside every subquery (not just outer SELECT) to prevent full translations table scans. *[Security review: HIGH #5, Dev R3: MEDIUM #8]*
- **Security:** Ensure search term is passed as bound SQL parameter, never interpolated
- Response: `{ issues: [...], organisations: [...] }` with `Cache-Control: public, s-maxage=30` (shorter cache for search)
- SQL queries use `LIMIT 5` per type in both outer and inner queries
- Add test asserting no `dangerouslySetInnerHTML` in NavSearch source *[Security review: MEDIUM #10]*

### NavSearch component
- **New:** `src/components/interactive/nav-search.tsx` — `'use client'` component
- Desktop: compact input that expands on focus
- Mobile: full-screen overlay with `fixed inset-0 z-45` (not `absolute` — must cover sticky SectionNav at z-30), backdrop, body scroll lock (`overflow-hidden`), back-button/swipe dismissal, focus trap *[Designer review R3: MEDIUM #6]*
- Debounce 200ms (not 400ms — faster perceived responsiveness) with `AbortController` to cancel in-flight requests. Show skeleton/shimmer immediately when debounce fires. *[Designer review: MEDIUM #12]*
- **Mobile overlay:** Use `history.pushState` for back-button handling (close overlay, don't navigate away). Save/restore `window.scrollY`. Add enter/exit CSS transition. *[Designer review: MEDIUM #11]*
- Results dropdown grouped by type (issues with category badge, orgs with emoji)
- **ARIA:** Full combobox pattern (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, `aria-owns`)
- Keyboard navigation: arrows, Enter, Escape
- **Error handling:** If one fetch fails, show results from the other with subtle "partial results" indicator. 3s timeout shows partial results.
- **XSS prevention:** NEVER use `dangerouslySetInnerHTML`. For match highlighting, split string at boundaries and wrap in `<mark>` via React elements.
- **RTL:** Use `start-*`/`end-*` logical properties instead of `left-*`/`right-*` for icon positioning
- **Empty state:** "No results found" with suggestion to try different terms

### Modify nav-bar.tsx
- Import and render `NavSearch` in desktop nav area
- On mobile, remove search from bottom nav if Phase 5 exists (avoid duplication)

### Bot surface
- **No new bot actions needed.** Bot already has `search_issues` (freetext + locale) and `get_orgs` (category filter). Unified search is a web UX optimization for the dropdown. The bot's conversational flow uses sequential actions (search issues first, then explore orgs).
- **Latent gap noted:** `get_orgs` only filters by category, not freetext name. If org name search is needed for the bot later, add `search_orgs` action mirroring the `/api/search` endpoint. Not required for this phase.

### i18n
- **UI keys (new `NavSearch` namespace — 7 keys):**
  - `NavSearch.placeholder` — "Search issues and organisations..."
  - `NavSearch.noResults` — "No results found"
  - `NavSearch.issues` — "Issues" (group heading)
  - `NavSearch.organisations` — "Organisations" (group heading)
  - `NavSearch.searching` — "Searching..."
  - `NavSearch.partialResults` — "Partial results" (error fallback)
  - `NavSearch.minChars` — "Type at least {count} characters" (interpolated: 3 for Latin, 1 for CJK) *[Designer review R3: LOW #14]*
- **DB translations:** None — search endpoint calls `translateEntities(issues, 'issue', locale)` and `translateEntities(orgs, 'organisation', locale)` using existing functions
- **BotMessages:** None
- **Translate all 55 locales** via `apply-ui-translations.js`
- **Tests:** Component tests for debouncing, grouped results, keyboard nav, error states. API route tests for validation, rate limiting, batch query, locale translation.

---

## Phase 4: Follow System

**Effort:** ~5-6 hours | **Migration:** `030_user_follows.sql` | **Dependencies:** None

### DB migration `030_user_follows.sql`
```sql
CREATE TABLE IF NOT EXISTS user_follows (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  auto_followed INTEGER NOT NULL DEFAULT 0 CHECK(auto_followed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, issue_id)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_user ON user_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_issue ON user_follows(issue_id);
```

### State machine (explicit)
- **Manual follow:** INSERT into user_follows with auto_followed=0
- **Join issue:** INSERT into user_issues + UPSERT into user_follows (set auto_followed=1 if inserting, leave alone if already exists as manual follow)
- **Leave issue:** DELETE from user_issues + DELETE from user_follows WHERE auto_followed=1 only (manual follows survive)
- **Manual unfollow:** DELETE from user_follows regardless of auto_followed
- **Duplicate handling:** `INSERT OR IGNORE` for follow; UNIQUE constraint prevents duplicates

### Queries (`src/lib/queries/users.ts`)
- `followIssue(userId, issueId, autoFollowed)` — Must verify issue exists and `status = 'active'` before insert. Return typed result (`'followed' | 'already_following' | 'not_found' | 'max_reached'`). *[Security review: HIGH #4]*
- `unfollowIssue(userId, issueId)` — DELETE
- `hasFollowedIssue(userId, issueId)` — boolean check
- `getFollowedIssues(userId)` — returns issue array for bot `get_followed_issues` action
- `getFollowerCount(issueId)` — COUNT (acceptable at current scale; index scan on `idx_user_follows_issue`. Document as future scalability concern — denormalize to `issues.follower_count` if needed later) *[Dev review: MEDIUM #12]*
- **Atomicity:** Modify `joinIssue` to use `db.batch()` wrapping both INSERT into `user_issues` AND INSERT OR IGNORE into `user_follows` — crash between the two would leave joined-but-not-followed state. Same for `leaveIssue`: batch DELETE from `user_issues` with DELETE from `user_follows WHERE auto_followed=1`. *[Dev review: CRITICAL #1]*
- **Soft cap:** Count-and-insert in single `db.batch()` to prevent race condition (concurrent requests exceeding 100). Also add per-user rate limit on `follow_issue` bot action (10/min per phone). *[Security review: MEDIUM #6]*

### API
- `POST /api/issues/[id]/follow` — follow (session auth, rate limited: 10 req/min/user — use userId as key, consistent with join endpoint) *[Dev review: HIGH #4]*
- `DELETE /api/issues/[id]/follow` — unfollow (session auth, rate limited: 10 req/min/user)
- **Security:** Validate issue ID using existing `idField` pattern (`z.string().min(1).max(64)`) for consistency with bot. Do NOT use `/^[0-9a-f]{32}$/` — `generateId()` may produce 36-char hyphenated UUIDs and test IDs are short strings like `'issue-rail'`. *[Dev review: HIGH #5, #15]*
- **Security:** Verify `qr_user_id` cookie is `SameSite=Lax` (blocks cross-site POST CSRF)
- **Security:** Return 404 for non-existent or inactive issues (don't leak existence for deleted/draft)

### UI
- **New:** `src/components/interactive/follow-button.tsx` — secondary action below JoinButton
- **Visual hierarchy:** JoinButton = primary CTA (full-width, solid fill, large). FollowButton = secondary (smaller, text-link or icon-toggle style). Must NOT compete visually with Join. *[Designer review: HIGH #5]*
- States: "Follow" (outline) → "Following" (auto-followed after join) → "Following ✓" (manual)
- **Auto-follow notification:** Add `aria-live="polite"` region announcing "You are now following this Quiet Riot" when auto-follow triggers. Don't rely on subtle animation alone — user's focus is on the Join button. *[Designer review: MEDIUM #15]*
- **Accessibility:** `aria-pressed` for toggle state, loading spinner with `aria-busy`
- **Error feedback:** Toast or inline message on failure

### Issue detail sidebar update
- Display follower count as new stat in the stats bar (alongside rioters, countries)
- Pass `initialFollowed` boolean to `FollowButton`

### Bot surface (3 new actions + 2 modifications)

**New actions in `src/app/api/bot/route.ts`:**

1. **`follow_issue`**
   - Schema: `{ phone: phoneField, issue_id: idField }`
   - Resolve user by phone, call `followIssue(userId, issueId, false)` (manual follow)
   - Returns: `{ followed: true, user_id, issue_id }`
   - Respond with `getBotMessage(locale, 'followed', { issue: issueName })`

2. **`unfollow_issue`**
   - Schema: `{ phone: phoneField, issue_id: idField }`
   - Resolve user by phone, call `unfollowIssue(userId, issueId)`
   - Returns: `{ unfollowed: true, user_id, issue_id }`
   - Respond with `getBotMessage(locale, 'unfollowed', { issue: issueName })`

3. **`get_followed_issues`**
   - Schema: `{ phone: phoneField, language_code: langField }`
   - Resolve user by phone, call new `getFollowedIssues(userId)` query
   - Translate with `translateEntities(issues, 'issue', locale)`
   - Returns: `{ issues: [...] }`
   - Rationale: Bot users need to see what they follow, analogous to how `identify` returns joined issues

**Modifications to existing actions:**

4. **`join_issue`** — No route change needed. Auto-follow logic is embedded in the `joinIssue()` query function in `users.ts`, so both web and bot get it automatically.

5. **`leave_issue`** — Same: auto-unfollow logic is embedded in `leaveIssue()` query function.

6. **`get_issue`** — Add `follower_count` to the response alongside existing stats (rioter_count, countries, etc.)

7. **`identify`** — Add `followed_issue_count` (integer, not full array) to response. Full array bloat is unacceptable for users following 100 issues — use `get_followed_issues` for the full list. *[Dev review: MEDIUM #10]*

**Critical:** Auto-follow/unfollow logic MUST be in query layer (`src/lib/queries/users.ts`), NOT in route handlers. Both surfaces call the same query functions.

### i18n

**UI keys (new `Follow` namespace — 8 keys):**
- `Follow.follow` — "Follow"
- `Follow.following` — "Following"
- `Follow.followingAuto` — "Following" (auto-followed state)
- `Follow.unfollow` — "Unfollow"
- `Follow.followers` — "{count} followers"
- `Follow.followConfirm` — "You're now following this Quiet Riot"
- `Follow.unfollowConfirm` — "You've unfollowed this Quiet Riot"
- `Follow.maxFollows` — "You can follow up to 100 Quiet Riots"

**BotMessages keys (4 new keys in `BotMessages` namespace):**
- `BotMessages.followed` — "You are now following {issue}."
- `BotMessages.unfollowed` — "You have unfollowed {issue}."
- `BotMessages.alreadyFollowing` — "You are already following this Quiet Riot."
- `BotMessages.maxFollows` — "You can follow up to 100 Quiet Riots."

**DB translations:** None — `user_follows` is a join table with no translatable text fields.
**New translate functions:** None — existing functions cover issue name translation.
**Translate all 55 locales** for both UI and BotMessages keys via `apply-ui-translations.js`

### Tests: ~18 new tests
- Query CRUD + state transitions (follow, unfollow, auto-follow on join, auto-unfollow on leave, manual survives leave, max 100 cap)
- API auth/validation/rate-limit (POST/DELETE follow endpoints)
- Bot actions (follow_issue, unfollow_issue, get_followed_issues)
- Component states (follow button states, loading, error)

---

## Phase 5: Mobile Bottom Navigation Bar

**Effort:** ~2-3 hours | **Migration:** None | **Dependencies:** Phase 3 (search integration)

### New component
- **New:** `src/components/layout/mobile-bottom-nav.tsx` — `'use client'`, `sm:hidden`
- 5 tabs: Home, Search, Action (central CTA with QR logo), Inbox (unread badge), Profile
- Fixed bottom with `z-40` (below nav z-50, below search overlay z-45) *[Dev review: LOW #16]*
- **iOS safe area:** Add `pb-[env(safe-area-inset-bottom)]` to the bar. Ensure `<meta name="viewport">` includes `viewport-fit=cover`. Without this, bottom tabs are occluded by iPhone gesture bar. *[Designer review: HIGH #4]*
- `usePathname()` for active state highlighting
- `useSession()` for auth-gated items (Inbox badge, Profile)
- **Accessibility:** `role="navigation"`, `aria-label`, visible focus ring on all tabs
- **RTL:** Use logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`)
- Search tab: opens NavSearch in full-screen mode (from Phase 3)

### Layout modification
- **Modify:** `src/app/[locale]/layout.tsx` — render MobileBottomNav after Footer
- Add `pb-16 sm:pb-0` to `<main>` to prevent content hiding behind fixed bar
- **Consideration:** Top nav on mobile should simplify (hide hamburger menu links that duplicate bottom nav?)

### Mobile nav interaction with top nav
- Top nav remains for logo + wallet balance on mobile
- Bottom nav handles primary navigation (Home, Search, Action, Inbox, Profile)
- Hamburger menu retains role-specific links (Setup Guide, Share Guide, etc.) not in bottom nav

### Bot surface
- **No bot actions needed.** Mobile bottom nav is a web-only UI pattern. The bot has no concept of tab navigation.

### i18n
- **UI keys (new `MobileNav` namespace — 6 keys):**
  - `MobileNav.home` — "Home"
  - `MobileNav.search` — "Search"
  - `MobileNav.action` — "Action" (central CTA)
  - `MobileNav.inbox` — "Inbox"
  - `MobileNav.profile` — "Profile"
  - `MobileNav.navLabel` — "Main navigation" (aria-label)
- **DB translations:** None
- **BotMessages:** None
- **Translate all 55 locales** via `apply-ui-translations.js`

### Tests: Component render test, active state test, RTL layout test

---

## Phase 6: Organisation Detail Page Enrichment

**Effort:** ~4-5 hours | **Migration:** Index migration `031_indexes.sql` | **Dependencies:** None

### DB migration `031_indexes.sql`
```sql
-- Org-scoped aggregation queries (Phase 6)
CREATE INDEX IF NOT EXISTS idx_issue_org_org_id ON issue_organisation(organisation_id);

-- Personal feed UNION ALL queries (Phase 8) — include here to ensure they exist well before Phase 8 code deploys
CREATE INDEX IF NOT EXISTS idx_feed_issue ON feed(issue_id);
CREATE INDEX IF NOT EXISTS idx_feed_issue_created ON feed(issue_id, created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_issue_created ON evidence(issue_id, created_at);
CREATE INDEX IF NOT EXISTS idx_riot_reels_issue_created ON riot_reels(issue_id, created_at);
```
Note: `feed` table currently has ZERO indexes. The plain `idx_feed_issue` prevents full table scans even without the compound index. *[Dev review: CRITICAL #2]*

### New org-scoped query functions
All queries JOIN through `issue_organisation` and are bounded with `LIMIT`:
- `getCommunityHealthForOrg(orgId)` — weighted average health across linked issues, weighted by `rioter_count` in `issue_organisation` (larger issues have more influence, consistent with Pareto principle). Guard against division-by-zero when all linked issues have `rioter_count = 0`: fall back to simple average. *[Dev review: LOW #17, Dev R3: MEDIUM #11]*
- `getFeedPostsForOrg(orgId, limit=20)` — JOIN feed + issue_organisation
- `getActionsForOrg(orgId, limit=20)` — JOIN actions + issue_organisation
- `getCountryBreakdownForOrg(orgId)` — aggregated country stats across linked issues
- `getExpertsForOrg(orgId)` — JOIN expert_profiles + issue_organisation
- `getReelsForOrg(orgId, limit=10)` — JOIN riot_reels + issue_organisation

### Page expansion
- **Modify:** `src/app/[locale]/organisations/[id]/page.tsx` — add SectionNav, HealthMeter, CountryList, FeedSection, ActionsSection, ReelsSection, ExpertCard (all reused from issue detail)
- **Section IDs:** Each section wrapper MUST have `id` attribute matching SectionNav items: `overview`, `actions`, `evidence`, `community`, `experts`, `reels`. Without these, `scrollToSection` does nothing. *[Designer review: MEDIUM #14]*
- Add `export const dynamic = 'force-dynamic'` (CSP nonce issue for client components)
- **Empty states with CTAs:** `noFeed` → "Join a related issue to start the conversation" + link to top issue. `noActions` → "Check individual issues for actions" + links. `noReels` → "Record a riot reel on a related issue" + link. Empty states are opportunities to guide, not dead ends. *[Designer review: LOW #19]*

### Files to modify
- `src/lib/queries/community.ts` — add `getFeedPostsForOrg`, `getCommunityHealthForOrg`, `getExpertsForOrg`, `getCountryBreakdownForOrg`
- `src/lib/queries/actions.ts` — add `getActionsForOrg`
- `src/lib/queries/reels.ts` — add `getReelsForOrg`
- `src/lib/queries/organisations.ts` — new `getOrgCommunityData(orgId)` convenience wrapper that wraps all 6 calls in `Promise.all()` (never sequential — would create waterfall) *[Dev review: HIGH #6]*

### Bot surface (enrich existing + 1 new action)

**Modification to existing action:**

1. **`get_org_pivot`** — Enrich response to include org-scoped community data alongside the pivot. Currently returns `{ org, issues, totalRioters }`. Add `health`, `countries`, `experts` fields using the new org-scoped query functions. This avoids requiring a separate bot call for org community data.
   - Updated returns: `{ org, issues, totalRioters, health, countries, experts }`
   - Translate experts via `translateExpertProfiles(experts, locale)`
   - Translate country names via `translateCountryBreakdown(countries, locale)`

**New action:**

2. **`get_org_community`** — Full org community data (mirrors `get_community` for issues)
   - Schema: `{ org_id: idField, language_code: langField }`
   - Calls: `getCommunityHealthForOrg`, `getFeedPostsForOrg`, `getExpertsForOrg`, `getCountryBreakdownForOrg`, `getActionsForOrg`, `getReelsForOrg` in `Promise.all()`
   - Returns: `{ health, feed, experts, countries, actions, reels }`
   - Translate: `translateExpertProfiles`, `translateActions`, `translateRiotReels`, `translateCountryBreakdown`
   - **Rate limit:** Add per-action limit: 10/min per IP (6 parallel queries per call is expensive). Ensure all sub-queries have LIMIT clauses. *[Security review: MEDIUM #9]*
   - Rationale: Bot users exploring an org ("tell me about Thames Water") should get the same rich data as the web page. Without this, org enrichment is invisible to bot users.

### i18n
- **UI keys (`OrgDetail` namespace — 10 new keys):**
  - `OrgDetail.healthTitle` — "Community Health"
  - `OrgDetail.feedTitle` — "Community Feed"
  - `OrgDetail.actionsTitle` — "Actions"
  - `OrgDetail.reelsTitle` — "Riot Reels"
  - `OrgDetail.expertsTitle` — "Experts"
  - `OrgDetail.countriesTitle` — "Countries"
  - `OrgDetail.noFeed` — "No community posts yet for this organisation."
  - `OrgDetail.noActions` — "No actions available yet."
  - `OrgDetail.noReels` — "No riot reels yet."
  - `OrgDetail.noExperts` — "No experts listed yet."
- **DB translations:** None — org-scoped queries return existing entity types (actions, experts, reels) already translatable
- **New translate functions:** None — existing `translateActions`, `translateExpertProfiles`, `translateRiotReels` work on any array of those types
- **BotMessages:** None
- **Translate all 55 locales** via `apply-ui-translations.js`

### Tests: ~12 new tests
- Query tests for all 6 org-scoped aggregation functions
- Bot `get_org_community` action tests (auth, response shape, translation)
- Bot `get_org_pivot` enriched response tests
- Empty state handling (org with no linked issues)

---

## Phase 7: Issue-Organisation Intersection Pages

**Effort:** ~5-6 hours | **Migration:** None | **Dependencies:** Phase 6

### New route
- **New:** `src/app/[locale]/issues/[id]/organisations/[orgId]/page.tsx` — server component
- `export const dynamic = 'force-dynamic'` (CSP nonce requirement)
- **Security:** Validate both `id` and `orgId` using existing `idField` pattern (`z.string().min(1).max(64)`) — consistent with bot. Return 404 for invalid or non-existent intersection (not 500). *[Dev review: HIGH #5]*

### Page content
- Hero image from the issue
- Breadcrumb: Issues > [Category] > [Issue Name] > [Org Name]. On mobile (320px), collapse intermediate segments to `Issues > ... > [Org Name]` or use back-arrow to prevent overflow. Add `overflow-x-auto` with `scrollbar-hide` as fallback. *[Designer review: MEDIUM #13]*
- Stats: rioter count at this org, Pareto rank, evidence count
- Evidence filtered to this org (reuse `getEvidenceForIssue(issueId, orgId)` — filters on `org_id` column, not `organisation_id`) *[Dev R3: MEDIUM #12]*
- Community feed posts scoped to this issue (feed table has no `org_id` column — cannot filter by org, so show all feed posts for the issue). Label section clearly: "Community discussion about {issueName}" *[Dev review: MEDIUM #13]*
- Back links to both issue and org detail pages
- Join + Follow buttons (scoped to the issue)

### Pivot table integration
- **Modify:** `src/components/data/pivot-table.tsx` — make org rows in issue mode link to intersection page (`/issues/[issueId]/organisations/[orgId]`) instead of org detail
- Org pivot rows become `<Link>` components
- **Visual cue:** Add trailing chevron icon (`→`) to linked rows so users know the destination changed from org detail to intersection page. Without this, the link change breaks the existing mental model silently. *[Designer review: HIGH #6]*

### New query functions
- `getIssueOrgIntersection(issueId, orgId)` — returns the `issue_organisation` row or null
- Reuse existing `getEvidenceForIssue(issueId, orgId?, limit?)` from `src/lib/queries/evidence.ts` — already accepts optional `orgId` param and filters by `org_id` column. Do NOT create a duplicate function. *[Dev review R3: HIGH #3]*
- Reuse existing `getFeedPosts(issueId, limit)` from `src/lib/queries/community.ts` — feed table has NO `org_id` column, so feed is always issue-scoped. Do NOT create `getFeedPostsForIssue` duplicate. *[Dev review R3: LOW #16]*

### Bot surface (1 new action)

**New action:**

1. **`get_issue_org_intersection`**
   - Schema: `{ issue_id: idField, org_id: idField, language_code: langField }`
   - Calls: `getIssueOrgIntersection(issueId, orgId)`, `getEvidenceForIssueOrg(issueId, orgId)` in `Promise.all()`
   - Returns: `{ intersection: { rioter_count, rank }, issue, org, evidence: [...] }` or 404 if no intersection
   - Translate: Issue + org names via `translateEntity()`
   - Validate: Both IDs with existing `idField` pattern (`z.string().min(1).max(64)`) — consistent with all other bot actions *[Dev review: HIGH #5]*
   - Rationale: The pivot table links to intersection pages. Bot users drilling into "Train Cancellations at Avanti West Coast" should get scoped evidence and stats. Completes the pivot story for both surfaces.

### i18n
- **UI keys (new `IssueOrgIntersection` namespace — 13 keys):**
  - `IssueOrgIntersection.rioters` — "{count} rioters affected"
  - `IssueOrgIntersection.paretoRank` — "Pareto Rank #{rank}"
  - `IssueOrgIntersection.evidenceTitle` — "Evidence"
  - `IssueOrgIntersection.evidenceCount` — "{count} pieces of evidence"
  - `IssueOrgIntersection.feedTitle` — "Community Discussion"
  - `IssueOrgIntersection.backToIssue` — "Back to {issueName}"
  - `IssueOrgIntersection.backToOrg` — "Back to {orgName}"
  - `IssueOrgIntersection.noEvidence` — "No evidence gathered yet."
  - `IssueOrgIntersection.noFeed` — "No community discussion yet."
  - `IssueOrgIntersection.joinToContribute` — "Join this Quiet Riot to contribute evidence."
  - `IssueOrgIntersection.statsTitle` — "Stats"
  - `IssueOrgIntersection.breadcrumbIssues` — "Issues"
  - `IssueOrgIntersection.title` — "{issueName} at {orgName}"
- **DB translations:** None — displays existing entity types
- **New translate functions:** None — existing functions cover issue/org name translation
- **BotMessages:** None
- **Translate all 55 locales** via `apply-ui-translations.js`

### Tests: ~12 new tests
- Page rendering with valid/invalid intersection combos
- 404 for non-existent intersections
- Query tests for intersection + scoped evidence
- Bot `get_issue_org_intersection` action tests (auth, 404, translation)

---

## Phase 8: Homepage Personal Activity Feed

**Effort:** ~7-8 hours | **Migration:** Index migration (if not done in Phase 6) | **Dependencies:** Phase 4 (follow system)

### DB indexes (migration or add to Phase 6 migration)
```sql
CREATE INDEX IF NOT EXISTS idx_feed_issue_created ON feed(issue_id, created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_issue_created ON evidence(issue_id, created_at);
CREATE INDEX IF NOT EXISTS idx_riot_reels_issue_created ON riot_reels(issue_id, created_at);
```

### API
- **New:** `GET /api/users/me/feed?cursor=&limit=20` — session auth (cookie). Path includes `/me` to benefit from proxy.ts cache header exemption (skips public caching). *[Security review R3: MEDIUM #1]*
- UNION ALL across evidence, feed, riot_reels with normalised columns. **Explicit SELECT list per subquery** — never `SELECT *`. Create `ActivityItem` projection type: `{ activity_type, activity_id, issue_id, issue_name, user_name, content_snippet, created_at, likes, comments_count, shares, media_url?, media_type?, detail_url }`. Exclude `user_id`, `email`, `phone` from projection. *[Security review: HIGH #2]*
- Each UNION branch selects type-specific media fields: evidence → `media_url` + `media_type` ('image'|'video'), riot_reels → `youtube_url` as `media_url` + `'video'` as `media_type`, feed posts → `NULL` as `media_url` + `NULL` as `media_type`. Include `detail_url` computed as `/issues/{issue_id}` (or `/issues/{issue_id}#evidence-{id}` for evidence). *[Dev review: HIGH #8, MEDIUM #14]*
- **Column aliasing per branch** (tables have different column names): `feed` has `likes` but no `comments_count`/`shares` → alias as `f.likes, 0 AS comments_count, 0 AS shares`. `riot_reels` has `upvotes` not `likes` → alias as `r.upvotes AS likes, 0 AS comments_count, 0 AS shares`. `evidence` has neither → `0 AS likes, 0 AS comments_count, 0 AS shares`. *[Dev review R3: HIGH #1]*
- **User column asymmetry:** `feed` and `evidence` JOIN on `user_id`, but `riot_reels` uses `submitted_by` (nullable for curated reels) → `LEFT JOIN users u ON r.submitted_by = u.id`, with `COALESCE(u.name, 'Quiet Riots') AS user_name`. *[Dev review R3: HIGH #2]*
- **Status filter on riot_reels branch:** Add `WHERE r.status IN ('approved', 'featured')` to prevent pending/rejected reels from leaking into the personal feed. Evidence and feed don't have status columns. *[Dev review R3: MEDIUM #6]*
- Filtered by `issue_id IN (SELECT issue_id FROM user_issues WHERE user_id = ? UNION SELECT issue_id FROM user_follows WHERE user_id = ?)`
- **Pagination:** Compound cursor `(created_at, id)` — not just `created_at`. Without the `id` tie-breaker, items created in the same second can be duplicated or skipped across pages. Cursor format: `{iso_datetime}_{id}`. WHERE clause: `(created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC, id DESC LIMIT 20`. *[Dev review: HIGH #3]*
- **Cursor validation:** Validate cursor format with Zod: `z.string().max(100).regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?Z?_[a-f0-9-]+$/)`. Max 100 chars prevents oversized payloads. Regex allows both `T` and space separators (SQLite uses space), and hyphens in ID segment (UUIDs from `crypto.randomUUID()` and test IDs like `issue-rail`). Invalid cursor → 400. *[Security review: MEDIUM #8, Dev R3: LOW #13, #14, Security R3: LOW #4]*
- **Security:** Derive user ID exclusively from session cookie. Return 401 for unauthenticated (not empty feed).
- **Security:** Rate limit 20 req/min/user. Cap cursor results with `LIMIT`.
- **Cache:** `Cache-Control: private, no-store` (personalised data)

### Components
- **New:** `src/lib/queries/personal-feed.ts` — the aggregation query with cursor pagination
- **New:** `src/app/api/users/me/feed/route.ts` — API endpoint with Zod validation
- **New:** `src/components/interactive/personal-feed.tsx` — `'use client'` with "Load more" button
- **New:** `src/components/cards/activity-card.tsx` — unified card rendering different activity types (evidence with photos, feed posts, riot reels with video thumbnail, milestones)

### Activity card visual design *[Designer review: HIGH #8]*
- **Type-differentiated rendering:** Each activity type has distinct visual treatment:
  - **Feed posts (text-only):** Left-coloured border (blue accent, 3px) to distinguish from evidence. Standard text card layout.
  - **Evidence with media:** Thumbnail strip (max 3 images, horizontal scroll for more). Image thumbnails 80x80 with rounded corners. Video thumbnails show play-button overlay.
  - **Riot reels:** YouTube thumbnail with semi-transparent play-button overlay. Title below thumbnail.
  - **Milestones:** Distinct background (`bg-blue-50 dark:bg-blue-900/20`), icon prefix, celebratory copy.
- Like/comment/share buttons (reuse existing like mechanisms)
- One comment expanded with "View N more comments →" link
- User avatar + name + country flag + relative time (reuse `formatRelativeTime` from Phase 0)
- Issue name as link to issue detail (using `detail_url` from API response)
- **Accessibility:** Each card has `aria-label` describing type + issue + time. Media thumbnails have `alt` text.

### Homepage integration
- **Modify:** `src/app/[locale]/page.tsx` — for authenticated users: show "Your Feed" section between hero and trending
- For unauthenticated users: unchanged (trending + reel of day + how it works)
- **Empty state:** Illustration card with subtle background pattern (`bg-gradient-to-b from-blue-50/50`), empty-inbox style icon (not just text), heading "No activity yet", description "Follow or join issues to see activity here", and primary CTA button "Browse issues" → `/issues`. The empty state should feel like an invitation, not a dead end. *[Designer review: HIGH #9]*
- **Feed length cap:** Use "Load more" button (not infinite scroll) to prevent footer from becoming unreachable. Cap at 5 pages (100 items) before showing "View all activity →" link. *[Designer review R3: MEDIUM #5]*

### Bot surface (1 new action + 1 modification)

**New action:**

1. **`get_personal_feed`**
   - Schema: `{ phone: phoneField, cursor?: z.string().optional(), limit?: z.number().min(1).max(20).optional(), language_code: langField }`
   - Resolve user by phone, call `getPersonalFeed(userId, cursor, limit)` query
   - Translate issue names in results using `translateEntities` overlay
   - Returns: `{ activities: [...], next_cursor: string | null, formatted_text: string }`
   - **Bot response formatting:** WhatsApp is text-only, so `formatted_text` concatenates activities into a readable summary. Template per activity type: *[Designer review: MEDIUM #17]*
     - Evidence: `"📸 New evidence on *{issueName}*: {snippet}... ({timeAgo})"`
     - Feed post: `"💬 *{userName}* posted on *{issueName}*: {snippet}... ({timeAgo})"`
     - Riot reel: `"🎬 New riot reel on *{issueName}*: {reelTitle} ({timeAgo})"`
     - Footer: `"Reply 'more' to see older activity."`
   - Empty response: return `{ activities: [], message: getBotMessage(locale, 'personalFeedEmpty') }`
   - Rationale: **Dual-surface protocol requires this.** Bot users who joined/followed issues should say "what's new?" and get their feed. Simpler than web (no infinite scroll) — just last N items.

**Modification to existing action:**

2. **`identify`** — Add `recent_activity_count` to response (count of feed items since user's last session). Hooks users into asking for their feed.

### i18n
- **UI keys (new `PersonalFeed` namespace — 14 keys):**
  - `PersonalFeed.title` — "Your Feed"
  - `PersonalFeed.emptyTitle` — "No activity yet"
  - `PersonalFeed.emptyDesc` — "Follow or join issues to see activity here."
  - `PersonalFeed.browseIssues` — "Browse issues"
  - `PersonalFeed.loadMore` — "Load more"
  - `PersonalFeed.loading` — "Loading..."
  - `PersonalFeed.evidenceLabel` — "New evidence"
  - `PersonalFeed.feedPostLabel` — "Community post"
  - `PersonalFeed.reelLabel` — "Riot reel"
  - `PersonalFeed.milestoneLabel` — "Milestone"
  - `PersonalFeed.likesCount` — "{count} likes"
  - `PersonalFeed.commentsCount` — "{count} comments"
  - `PersonalFeed.viewAllComments` — "View {count} more comments"
  - `PersonalFeed.shareLabel` — "Share"
- **BotMessages keys (2 new):**
  - `BotMessages.personalFeedEmpty` — "You haven't joined or followed any Quiet Riots yet. Search for one to get started."
  - `BotMessages.personalFeedSummary` — "Here are your latest updates from {count} Quiet Riots:"
- **DB translations:** None — feed aggregates existing entity types whose content is user-generated (not translated). Issue names in feed items translated via existing functions.
- **New translate functions:** None — `translateEntities` covers issue name overlay on feed items
- **Translate all 55 locales** for both UI and BotMessages keys via `apply-ui-translations.js`

### Tests: ~18 new tests
- Query aggregation with cursor pagination (multiple activity types, ordering, filtering)
- API auth/validation/pagination (401 for unauth, cursor format, limit bounds)
- Bot `get_personal_feed` action tests (auth, empty state, pagination, translation)
- Component render tests (activity cards, load more, empty state)

---

## Implementation Order

| Order | Phase | Est. Time | Dependencies | New Tests | Bot Actions |
|-------|-------|-----------|-------------|-----------|-------------|
| 1st | Phase 0 (Foundational fixes) | 2 hr | None | ~5 | 0 new (SafeUserProfile projection) |
| 2nd | Phase 1+2 (Pivot blue + Wallet + Nav context) | 2 hr | Phase 0 | ~5 | 0 new |
| 3rd | Phase 4 (Follow system) | 6-7 hr | Phase 0 | ~18 | 3 new + 3 modified |
| 4th | Phase 3 (Nav search) | 4-5 hr | None | ~10 | 0 new |
| 5th | Phase 6 (Org enrichment + indexes) | 5-6 hr | None | ~12 | 1 new + 1 modified |
| 6th | Phase 5 (Mobile bottom nav) | 2-3 hr | Phase 3 | ~5 | 0 new |
| 7th | Phase 7 (Intersection pages) | 6-7 hr | Phase 6 | ~12 | 1 new |
| 8th | Phase 8 (Personal feed) | 8-9 hr | Phase 4 | ~18 | 1 new + 1 modified |

**Rationale for ordering:** Phase 0 first as prerequisite (focus-visible, SafeUserProfile, timeAgo, SectionNav ARIA all affect subsequent phases). Phase 4 (follow) moved up to unblock Phase 8 as early as possible. Phase 6 moved before Phase 5 since intersection pages (Phase 7) depend on it. Nav search (Phase 3) before mobile bottom nav (Phase 5) so bottom nav can integrate search.

**Parallelisable:** Phases 1+2, 3, 4, 6 are all independent (after Phase 0). Phases 3 and 4 can also run in parallel.

**Total: 8 PRs, ~43 hours, 2 DB migrations, ~85 new tests, 6 new bot actions, 5 modified bot actions**

## Bot Action Summary (all phases)

| Phase | New Actions | Modified Actions |
|-------|------------|-----------------|
| 0 | — | `identify` (SafeUserProfile projection) |
| 1+2 | — | — |
| 3 | — | — |
| 4 | `follow_issue`, `unfollow_issue`, `get_followed_issues` | `join_issue` (auto-follow via query), `leave_issue` (auto-unfollow via query), `get_issue` (+follower_count) |
| 5 | — | — |
| 6 | `get_org_community` | `get_org_pivot` (+health, countries, experts) |
| 7 | `get_issue_org_intersection` | — |
| 8 | `get_personal_feed` | `identify` (+recent_activity_count) |

## i18n Summary (all phases)

| Phase | UI Namespace | New Keys | BotMessages Keys | DB Entity Types |
|-------|-------------|----------|-----------------|-----------------|
| 1+2 | `Nav` | 2 | 0 | None |
| 3 | `NavSearch` (new) | 7 | 0 | None |
| 4 | `Follow` (new) | 8 | 4 | None (join table) |
| 5 | `MobileNav` (new) | 6 | 0 | None |
| 6 | `OrgDetail` (extend) | 10 | 0 | None |
| 7 | `IssueOrgIntersection` (new) | 13 | 0 | None |
| 8 | `PersonalFeed` (new) | 14 | 2 | None |
| **Total** | | **~60 keys** | **6 keys** | **0 new entity types** |

**No changes to `seed-translations.ts`** — all phases work with existing translatable entity types (issues, organisations, actions, expert_profiles, riot_reels, etc.). No new DB entity types with user-visible text fields are introduced.

---

## Security Checklist (apply to EVERY phase)

- [ ] All new mutation endpoints have Zod validation + rate limiting
- [ ] All new GET endpoints with personalised data use `Cache-Control: private, no-store`
- [ ] All public GET endpoints use `Cache-Control: public, max-age=60, s-maxage=300`
- [ ] All dynamic route segments validated against hex UUID format
- [ ] All DB queries use bound parameters (never string interpolation)
- [ ] All user IDs derived from session cookie, never from request params
- [ ] All new `'use client'` pages have `export const dynamic = 'force-dynamic'` in wrapper
- [ ] No `dangerouslySetInnerHTML` anywhere
- [ ] No inline `style={}` attributes (use CSS classes to avoid CSP blocks) — exception: computed `style={{ width: `${pct}%` }}` for progress bars is acceptable (already used by HealthMeter and action-initiative-progress) *[Designer review R3: MEDIUM #9]*
- [ ] `SameSite=Lax` verified on auth cookies

## Accessibility Checklist (apply to EVERY phase)

- [ ] New interactive components have ARIA roles and labels
- [ ] Keyboard navigation works (Tab, Enter, Escape, arrows where appropriate)
- [ ] Focus management: dropdowns trap focus, modals return focus on close
- [ ] Visible `:focus-visible` ring on all interactive elements
- [ ] Colour contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] Screen reader announcements for dynamic content (`aria-live`, `role="status"`)

## i18n Checklist (apply to EVERY phase)

- [ ] All user-visible strings use `getTranslations()` / `useTranslations()` with keys from messages/*.json
- [ ] New keys added to `messages/en.json` with correct namespace
- [ ] Translations generated for all 55 non-English locales via `apply-ui-translations.js`
- [ ] RTL tested: use logical properties (`start-*`/`end-*`, `ps-*`/`pe-*`) not physical (`left-*`/`right-*`)
- [ ] Bot responses translated using user's `language_code` via `getBotMessage(locale, key, params)`
- [ ] New BotMessages keys added to `messages/en.json` under `BotMessages` namespace
- [ ] No new DB entity types needed (all phases use existing translatable types)
- [ ] API endpoints that return entities call `translateEntities()` / `translateEntity()` with locale param
- [ ] Search endpoints accept `locale` param and translate results before returning

## Dual-Surface Checklist (apply to EVERY phase)

- [ ] New query functions live in `src/lib/queries/` (shared by both web and bot)
- [ ] New bot actions added to `src/app/api/bot/route.ts` with standard pattern (Zod schema, phone resolution, locale handling, fire-and-forget analytics)
- [ ] Bot actions that return entities call appropriate `translate*()` functions
- [ ] Bot action tests added to `src/app/api/bot/bot-api.test.ts`
- [ ] State changes (follow/unfollow, join/leave) embedded in query layer, NOT route handlers
- [ ] Both surfaces return identical data shapes for the same operation

## Verification (after EVERY phase)

1. `npm test` — all tests pass (including new ones)
2. `npm run build` — build succeeds
3. Verify on Vercel preview deployment (desktop + mobile)
4. Check dark mode rendering
5. Check at least one RTL locale (ar)
6. For migration phases: run on BOTH staging AND production
7. Production health check: `curl https://www.quietriots.com/api/health`

---

## Known Design Debt (from designer review — track, fix later)

- Hero image text contrast: needs text-shadow or extended gradient for bright DALL-E images
- ~~Section nav needs full ARIA tablist pattern~~ → addressed in Phase 0d
- Language selector with 56 items needs search/filter or grouping
- Chicken deploy form needs payment confirmation step (two-step flow)
- Loading/skeleton states needed for all pages (no `loading.tsx` Suspense boundaries exist)
- ~~Global `:focus-visible` styles should be added to `globals.css`~~ → addressed in Phase 0a
- Breadcrumb "/" separator should be SVG chevron that auto-mirrors for RTL
- AuthGate modal lacks focus trap *[Designer review: LOW #20]*
- ~~`user_follows` table should have `ON DELETE CASCADE`~~ → addressed in Phase 4 migration *[Security R3: MEDIUM #2]*
- Focus ring contrast (3.9:1 light mode) passes minimum but is marginal — consider thicker outline for bright themes *[Designer R3: LOW #10]*
- Issue detail page omits Reels from SectionNav but Phase 6 adds it to org detail — consider adding to issue detail for consistency *[Designer R3: LOW #12]*
- Pivot table Phase 7 link change only addresses issue-mode — org-mode pivot link behavior unspecified *[Designer R3: MEDIUM #7]*

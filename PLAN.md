# Plan: Website Redesign + Deploy a Chicken

## Overview

Two major features being implemented across multiple PRs:

### Feature 1: Website Redesign (10 phases)

Full visual upgrade: purple→blue colour palette, hero images with DALL-E generation, modernised nav/footer, card thumbnails, and font update.

**PR order:** 0 → 1 → 2 → 6 → 3 → 4 → 7 → 5 → 8 → 9

| Phase | Summary | Branch |
|-------|---------|--------|
| 0 | DB migration (hero_image_url columns) + types | `claude/website-redesign-phase-0` |
| 1 | Colour palette (purple→blue, keep pivot purple) | `claude/website-redesign-phase-1` |
| 2 | Nav bar + footer redesign | `claude/website-redesign-phase-2` |
| 6 | OpenAI image generation pipeline | `claude/website-redesign-phase-6` |
| 3 | Hero image component + detail page layouts | `claude/website-redesign-phase-3` |
| 4 | Browse pages + card redesign | `claude/website-redesign-phase-4` |
| 7 | Approval flow integration + guide review | `claude/website-redesign-phase-7` |
| 5 | Homepage + all remaining pages | `claude/website-redesign-phase-5` |
| 8 | Backfill existing entities | `claude/website-redesign-phase-8` |
| 9 | i18n for all new UI text | `claude/website-redesign-phase-9` |

### Feature 2: Deploy a Chicken

Paid action: ~$50 for a chicken-costumed person to deliver a handwritten note to a CEO. Separate PR after redesign phases.

**Key tables:** `chicken_deployments`, `chicken_pricing`, `chicken_fulfillers`
**Status flow:** paid → accepted → in_progress → delivered (with cancel/refund/dispute paths)
**Full plan:** preserved in git history of `claude/busy-hoover` branch (commits b8ece28, b9ca7f3)

## Current Progress

- [x] Phase 0: DB migration + types (PR #163)
- [x] Phase 1: Colour palette (PR #164)
- [x] Phase 2: Nav + footer (PR #165)
- [x] Phase 6: OpenAI pipeline (PR #166)
- [x] Phase 3: Hero component + detail pages (PR #167)
- [x] Phase 4: Browse pages + cards (PR #168)
- [ ] Phase 7: Approval flow
- [ ] Phase 5: Homepage + remaining pages
- [ ] Phase 8: Backfill
- [ ] Phase 9: i18n
- [ ] Deploy a Chicken: All phases

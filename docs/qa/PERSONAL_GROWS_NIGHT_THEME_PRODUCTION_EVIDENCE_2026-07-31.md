# Personal Grows Night-Theme Production Evidence

Date: 2026-07-31

## Release

- Frontend commit: `abec377c`
- Production URL: `https://growpathai.com`
- Frontend CI: `30672515412` (passed)
- Production Build Preflight: `30672515370` (passed)
- Deployment source: automatic production deployment from `main`

## Verified route

- `https://growpathai.com/home/personal/grows`

## Finding

The signed-in Personal Pro account used Auto appearance resolved to Night. The
Grows heading and outer shell were dark, but the Latest Grow card, Search card,
search input, and empty-grow card still rendered fixed white surfaces. Summary
and status styles also retained fixed light-theme colors.

## Fix

- The Grows workspace now derives cards, summaries, status treatments, chips,
  inputs, headings, metadata, empty/loading/error states, and actions from the
  active palette.
- The search placeholder now uses the active muted-text color.
- Loading, filtering, refresh, entitlement limits, navigation, feed content,
  record data, and persistence logic were not changed.

## Live acceptance

- The production route retained one `Grows` level-one heading and rendered no
  large fixed-white content cards.
- The Search input rendered with Night surface `rgb(26, 35, 48)`, Night text
  `rgb(244, 247, 251)`, and Night border `rgb(40, 53, 69)`.
- The zero-grow roadmap, Grow tools, featured feed, five summary metrics,
  Latest grow empty state, Search, Your grows empty state, and all named actions
  remained present.
- The bottom bar retained Home, Grows, Forum, Nature, More, and Profile.
- No search term was entered, no link was opened, and no record was created or
  changed.

## Automated verification

- `tests/unit/PersonalGrowsRoute.test.tsx`

The focused suite passed both empty-state/feed ordering and latest-grow roadmap
cases. Targeted ESLint, full `tsc --noEmit`, and `git diff --check` passed. The
source contains no remaining fixed hex colors. Both main production safeguards
passed for the exact source commit.

## Remaining scope

This evidence covers desktop in-app Browser Night-mode rendering for the real
zero-grow account. Day mode, populated grow-card rendering, intentional
create/search/navigation/reload, physical-device/video capture, and independent
accessibility review remain part of the broader acceptance backlog.

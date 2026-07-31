# Personal Core Calculators Night-Theme Production Evidence

Date: 2026-07-31

## Release

- Frontend commit: `90d82099`
- Production URL: `https://growpathai.com`
- Frontend CI: `30670865619` (passed)
- Production Build Preflight: `30670865607` (passed)
- Deployment source: automatic production deployment from `main`

## Verified routes

- `https://growpathai.com/home/personal/tools/watering`
- `https://growpathai.com/home/personal/tools/ppfd`
- `https://growpathai.com/home/personal/tools/timeline-planner`
- `https://growpathai.com/home/personal/tools/pdf-export`

## Finding

The signed-in Personal Pro account used Auto appearance resolved to Night. All
four routes reproduced the same visual break before release: a dark header and
navigation shell above a hard-coded white calculator workspace.

## Fix

- Watering Planner now themes its page, headings, context, labels, inputs,
  grow-context AI-prefill card, and action from the active palette.
- PPFD / DLI Planner now themes its page, headings, context, labels, and inputs.
- Timeline Planner now themes its page, labels, date/duration inputs, milestone
  cards, dates, titles, and details.
- PDF / Export now themes its page, context, preview cards, titles, and details.
- Calculation, planning, export, entitlement, API, and persistence logic were
  not changed.

## Live acceptance

- Every former white page rendered as a continuous Night workspace.
- Each route retained one level-one heading and its named inputs/actions.
- Watering retained the 11 L, 10% runoff, two-day interval, and soil defaults.
- PPFD retained the 35 mol/m2/day target, 12-hour photoperiod, 850 measured
  PPFD, 100% fixture power, flower stage, and 810 umol/m2/s preview.
- Timeline retained the July 31, 2026 start date and the 4-week veg, 9-week
  flower, 10-day dry, and 4-week cure defaults.
- PDF / Export retained the zero-record package summary and CSV-ready copy.
- No field was changed and no Calculate/Save, task, journal, AI, copy, export,
  download, share, or date-picker action was invoked.

## Automated verification

- `tests/unit/WateringToolScreen.test.tsx`
- `tests/unit/PpfdToolScreen.test.tsx`
- `tests/unit/TimelinePlannerToolScreen.test.tsx`
- `tests/unit/PersonalToolSharedBackRoutes.test.tsx`

The four focused suites passed 12 tests. Targeted ESLint, full
`tsc --noEmit`, and `git diff --check` passed. Both main production safeguards
passed for the exact source commit.

## Remaining scope

This evidence covers desktop in-app Browser Night-mode rendering and
non-mutating default/local-preview behavior. Day mode, physical-device/video
capture, intentional save/reload, linked grow task/journal persistence, real
exports, and independent accessibility review remain part of the broader
acceptance backlog.

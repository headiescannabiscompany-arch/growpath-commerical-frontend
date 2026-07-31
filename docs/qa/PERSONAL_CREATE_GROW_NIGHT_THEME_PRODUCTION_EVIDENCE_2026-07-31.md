# Personal Create Grow Night-Theme Production Evidence

Date: 2026-07-31

## Release

- Frontend commit: `a245d3e6`
- Production URL: `https://growpathai.com`
- Frontend CI: `30671638517` (passed)
- Production Build Preflight: `30671638512` (passed)
- Deployment source: automatic production deployment from `main`

## Verified route

- `https://growpathai.com/home/personal/grows/new`

## Finding

The signed-in Personal Pro account used Auto appearance resolved to Night. Before
the release, Create Grow displayed a hard-coded white form workspace beneath the
dark header and navigation shell. The shared grow-interest picker also used
fixed light colors.

## Fix

- Create Grow now themes its page, headings, explanatory copy, AI-draft panel,
  validation state, planner card, fields, pills, photo controls, advanced
  section, create action, and post-create modal from the active palette.
- The shared grow-interest picker now themes its container, tier headings,
  counts, chips, selected states, and warnings from the active palette.
- Grow creation, calendar, AI, upload, entitlement, and persistence logic were
  not changed.

## Live acceptance

- The former white form rendered as a continuous Night workspace with no large
  white content panel.
- The page retained one `New Grow` level-one heading, AI draft action, grow-name
  field, planner controls, all seven interest tiers and their chips, system and
  anchor controls, date and timezone controls, photo controls, advanced toggle,
  and disabled Create Grow action.
- Expanding advanced fields retained all optional dates, pot size/count,
  cultivar, VPD target, and notes controls. Inspected advanced inputs rendered
  with dark surfaces, light text, and palette borders.
- No field or interest was changed. No AI, photo attachment, photo URL, date
  picker, or Create Grow action was invoked, and no record was created.
- The post-create modal was not opened because doing so requires a real grow
  creation; its palette conversion has source and automated coverage only.

## Automated verification

- `tests/unit/NewGrowAccess.test.tsx`

The focused suite passed all three entitlement cases: free-limit lock, first
free grow creation access, and Pro creation access. Targeted ESLint, full
`tsc --noEmit`, and `git diff --check` passed. Both main production safeguards
passed for the exact source commit.

## Remaining scope

This evidence covers desktop in-app Browser Night-mode rendering and
non-mutating control presence. Day mode, physical-device/video capture,
intentional create/reload, post-create modal and calendar-next-step live proof,
and independent accessibility review remain part of the broader acceptance
backlog.

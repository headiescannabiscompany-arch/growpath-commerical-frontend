# Personal VPD Night-Theme Production Evidence

Date: 2026-07-31

## Release

- Frontend commit: `e5902ed7`
- Production URL: `https://growpathai.com/home/personal/tools/vpd`
- Frontend CI: `30670100881` (passed)
- Production Build Preflight: `30670100869` (passed)
- Deployment source: automatic production deployment from `main`

## Finding

Under the signed-in Personal Pro account, Auto appearance resolved to Night. The
VPD Calculator header and tab/navigation shell were dark, but the calculator
workspace remained a hard-coded white canvas with light-theme labels, pills,
inputs, and locked-state colors.

## Fix

The VPD workspace now derives its page canvas, title, subtitle, context link,
unit/stage pills, labels, inputs, and locked-state card from the active GrowPath
palette. Calculator formulas, default values, save behavior, navigation, and
entitlement checks were not changed.

## Live acceptance

- The former white workspace rendered as a continuous Night page.
- `VPD Calculator`, explanatory copy, field labels, pills, and input values were
  readable against the dark palette.
- The default local preview remained `77°F`, `60% RH`, `-2°C` leaf offset,
  `veg`, and `1.27 kPa`.
- The page retained one level-one heading, all named form controls, the local
  preview/result surface, and the same Calculate and Save, Copy Result, and Ask
  AI About This actions.
- The acceptance pass did not press Calculate and Save, Copy Result, or Ask AI.
  It created no ToolRun, log, task, credit charge, clipboard write, or account
  change.

## Automated verification

- `tests/unit/PersonalToolSharedBackRoutes.test.tsx`: 9 tests passed, including
  VPD Calculator shared back behavior.
- Targeted ESLint passed.
- Full `tsc --noEmit` passed.
- `git diff --check` passed.
- Both main production safeguards passed for the exact source commit.

## Remaining scope

This pass proves desktop in-app Browser Night rendering and non-mutating local
preview behavior. Day mode, physical-device/video capture, intentional server
save/reload, linked grow journal/task actions, and independent accessibility
review remain part of the broader acceptance backlog.

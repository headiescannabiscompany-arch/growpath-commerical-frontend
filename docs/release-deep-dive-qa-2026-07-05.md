# Release Deep-Dive QA - 2026-07-05

## Current Step

We completed a frontend-heavy release QA pass and fixed one facility dashboard crash found during screenshot review.

Post-push status:

- Commit: `ae5dca8`
- Frontend CI run `28729495976`: passed.
- Production Build Preflight run `28729495975`: `Release preflight` passed, EAS iOS/Android authentication passed, EAS build start remains blocked by Expo robot `Viewer` permissions.

Resume from here if interrupted:

1. Check `git status --short`.
2. Confirm the latest commit includes `src/app/home/facility/(tabs)/dashboard.tsx`, `dist`, and this document.
3. Rerun `npm.cmd run release:preflight` if source or dist changes again.
4. Continue release only after the external blockers below are cleared.

## Deep-Dive Checklist

- [x] Inventory QA scripts and app route surface.
- [x] Run local corruption, placeholder, export, lint, route, and release scans.
- [x] Run focused release/unit tests.
- [x] Run public live URL verification.
- [x] Rerun live seeded user-mode shell tests.
- [x] Run mocked personal/commercial/facility shell tests without backend dependency.
- [x] Capture screenshots for public and mocked authenticated surfaces.
- [x] Analyze screenshots for layout, error-state, and user-satisfaction issues.
- [x] Fix frontend issue found during visual QA.
- [x] Run full release preflight after the fix.
- [ ] Resolve Expo/EAS build permission blocker.
- [ ] Restore or replace live seeded credentials for production user-mode tests.
- [ ] Collect final App Store / Google Play release evidence buckets.

## Commands Run

Passed:

- `npm.cmd run inventory:ui-routes`
  - Routes: 183
  - Files: 197
- `npm.cmd run scan:release`
  - Checked 826 files
  - Local URL allowlist: 2
- `npm.cmd run verify:delivery`
  - Placeholder scan: no findings
  - Corruption scan: no findings
  - Export sanity: passed
- `npm.cmd run lint:ci`
- Focused release Jest:
  - `tests/release.preflight.test.js`
  - `tests/release.scan.test.js`
  - `tests/release.live-urls.test.js`
  - `tests/release.go-no-go.test.js`
  - `tests/release.production-builds.test.js`
  - `tests/release.store-assets.test.js`
  - Result: 6 suites, 25 tests passed
- Focused UI/legal/login Jest:
  - `tests/unit/StorefrontRoute.test.tsx`
  - `tests/unit/LegalLinks.test.tsx`
  - `tests/unit/LoginEmailVerification.test.tsx`
  - Result: 3 suites, 3 tests passed
- Facility/commercial focused Jest after fix:
  - `tests/unit/CommercialReportsScreen.test.tsx`
  - `tests/facility/roomAccess.test.ts`
  - `tests/facility/taskAccess.test.ts`
  - Result: 3 suites, 8 tests passed
- `npm.cmd run verify:live-test-packs:sources:planning`
  - Passed in planning mode
  - Known placeholders: 514
  - Invalid URLs: 0
- `npm.cmd run release:builds:dry-run`
  - Printed expected iOS and Android EAS production build commands
- `npm.cmd run verify:live-urls` with `NODE_OPTIONS=--use-system-ca`
  - Passed
  - Evidence: `tmp/spec/live-url-checks/2026-07-05T02-56-37-472Z.json`
- Mocked mode routing:
  - `npx.cmd playwright test e2e/auth-shell-capabilities.spec.ts --reporter=list`
  - Result: 4 passed
- Visual screenshot audit temporary spec:
  - Public login desktop/mobile, register, store, privacy mobile
  - Mocked personal, commercial, facility shells
  - Result before fix: facility screenshot exposed dashboard crash
  - Result after fix: 8 screenshot captures passed
- Full release preflight after fix:
  - `npm.cmd run release:preflight`
  - Result: passed
  - Focused backend release routes: 3 suites, 38 tests passed
  - Focused release unit tests: 16 suites, 58 tests passed
  - Focused release Playwright specs: 6 passed
  - Production web export verified against `https://api.growpathai.com`
  - Store graphics export passed

Expected blocker:

- `npx.cmd playwright test e2e/live-shells.spec.ts --reporter=list` against `https://growpathai.com`
  - Result: 3 failed
  - Personal, commercial, and facility seeded accounts stayed on `/login`.
  - Screenshot showed clear `Invalid email or password`.
  - This blocks live production user-mode testing until valid seeded accounts exist.

Expected NO-GO:

- `npm.cmd run release:go-no-go`
  - Tracked artifacts and live URL evidence passed.
  - Still NO-GO because external release evidence buckets are missing.

## Screenshots Captured

Generated under `tmp/deep-dive-qa/`:

- `login-desktop.png`
- `login-mobile.png`
- `register-desktop.png`
- `store-desktop.png`
- `privacy-mobile.png`
- `personal-shell-desktop.png`
- `commercial-shell-desktop.png`
- `facility-shell-desktop.png`

Live seeded-login failure screenshot:

- `test-results/live-shells-live-seeded-sh-23656--routes-from-api-me-context-chromium/test-failed-1.png`

## Visual QA Findings

Good:

- Login desktop and mobile are clear, branded, and usable.
- Invalid login state is understandable and does not navigate unexpectedly.
- Register page makes account type selection obvious.
- Store page renders without backend auth and gives public brand/profile entry points.
- Privacy policy mobile page is readable and fits the viewport.
- Personal shell renders useful grow, task, alert, and forum context with mocked data.
- Commercial shell renders a clear command-center layout with obvious actions.
- Facility shell now renders instead of crashing when insights data is partial.

Issues found:

- Fixed: facility dashboard crashed when `insights.latestToolRuns` was missing from a partial insights response.
- UX note: the facility desktop bottom tab bar is dense and labels are cramped near the bottom edge. It is usable, but should be simplified or made horizontally scrollable before a polish pass.
- UX note: disabled primary buttons on login/register use a pale green that can read like an enabled button at a glance. This is acceptable for now but should be revisited for clearer disabled affordance.
- UX note: store page works without auth, but the default `brand-slug` placeholder feels developer-oriented. A production empty state should suggest real example search terms or hide direct slug entry behind an advanced action.

## Code Fix Made

File:

- `src/app/home/facility/(tabs)/dashboard.tsx`

Change:

- Normalized `insights.overdueTasksCount` and `insights.latestToolRuns` before rendering the Facility insights status row.
- Missing `latestToolRuns` now renders as `0 tool runs` instead of throwing.

## Remaining Blockers

Expo/EAS:

- `EXPO_TOKEN` authenticates in GitHub Actions.
- The robot account is still `etgujays-organization (Role: Viewer)`.
- iOS and Android EAS build-start steps still fail with `Entity not authorized`.
- Required action: raise the Expo robot/token permissions or replace `EXPO_TOKEN` with a token that can read/build the EAS app.

Live user-mode testing:

- Current seeded accounts fail login:
  - `free@growpath.com`
  - `commercial@growpath.com`
  - `facility@growpath.com`
- Required action: restore these accounts or provide replacement personal/commercial/facility test credentials.

Final store release:

- Required evidence buckets remain missing under `tmp/spec/`:
  - Sentry native crash verification
  - Disposable-account export/delete verification
  - Production iOS/Android build evidence
  - Physical-device smoke evidence
  - Store screenshots evidence
  - Store-console submission form evidence
  - Legal release sign-off
  - Named release/support/QA/crash owners
  - Hotfix and rollback sign-off

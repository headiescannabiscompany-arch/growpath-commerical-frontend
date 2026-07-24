# Commercial Analytics Heading-Hierarchy Production Evidence

Date: 2026-07-24

## Release

- Frontend PR: `#194`
- Source commit: `a0af9453918653bb1c18e05997e020652a5cc981`
- Frontend merge SHA: `4c8865d4b88831288b93108657b89e2638c6f51f`
- Production URL: `https://growpathai.com`
- Production behavior live by: `2026-07-24T12:53:42-04:00`
- Deployment trigger: automatic deployment from `main`

No Render deployment ID or Render status is claimed. Production delivery is
evidenced by the authenticated application changing from 15 default level-one
headings to the hierarchy introduced by merge
`4c8865d4b88831288b93108657b89e2638c6f51f`.

## Session and route

- Session: existing authenticated Commercial workspace browser session
- Route:
  `https://growpathai.com/home/commercial/analytics?release=4c8865d4b88831288b93108657b89e2638c6f51f&verify=analytics-heading-live-3`
- Live retest timestamp: `2026-07-24T12:53:42-04:00`

## Finding

The page exposed `Commercial Analytics` and all 14 metrics, breakdown, and
guidance sections as default level-one headings. That flattened the screen-reader
outline into 15 competing page titles.

## Fix

- `Commercial Analytics` explicitly exposes heading level 1.
- `Overview Metrics`, `Click and View Breakdown`, all eight breakdown headings,
  and the four guidance headings explicitly expose heading level 2.
- The Commercial workflow method and app-readable method registry now preserve
  the same one-title/level-two-section rule.
- The Commercial workflow regression suite checks all 15 headings and their exact
  levels.

## Verification

- Focused Analytics regression passed.
- The full Commercial workflow suite passed: 29 tests.
- Targeted ESLint and `git diff --check` passed.
- The full TypeScript scan still reports known unrelated baseline failures; none
  are in the four files changed by this fix.
- Manually dispatched Frontend CI run `30110049183` passed in 3 minutes 25 seconds
  after GitHub did not automatically attach a run to PR `#194`.
- Main Frontend CI run `30110298587` passed for merge
  `4c8865d4b88831288b93108657b89e2638c6f51f`.
- Main Production Build Preflight run `30110298930` passed in 3 minutes 51
  seconds for the same merge.
- Before deployment, repeated production inspection returned 15 headings with no
  explicit level.
- After deployment, two authenticated in-app Browser inspections returned exactly
  one level-one heading and 14 level-two headings.
- No analytics record, order, campaign, course, live, product, or account setting
  was created, changed, or deleted.

Evidence types completed: focused automated tests, full Commercial regression,
GitHub CI, production build preflight, and authenticated production in-app Browser
DOM inspection tied to the exact merge SHA and URL.

## Screenshot limitation

The in-app Browser screenshot command timed out or closed the target on the
original, fresh, and claimed production tabs, including one direct documented CDP
fallback. No screenshot file was created, and no stale or unrelated image is
claimed. Final-SHA screenshot/video evidence for this page remains open.

## Remaining Commercial Analytics work

Real event-backed storefront, product, campaign, course, live, trial, internal
order, revenue, currency, and external-link attribution must still be exercised
with intentional owner data and a public-user handoff. Desktop/mobile visual QA,
keyboard review, screenshot/video capture, and independent outside-user acceptance
also remain open.

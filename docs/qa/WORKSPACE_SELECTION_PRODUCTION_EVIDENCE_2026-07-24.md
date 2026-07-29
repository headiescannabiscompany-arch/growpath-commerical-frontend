# Workspace selection production evidence - 2026-07-24

## Acceptance status

Passed for production direct entry, hard reload, multi-workspace presentation, and
Personal-to-Commercial selection. The separate Facility Viewer invitation remains in
the deferred owner-input pass.

## Release under test

- Behavior commit: `49979df9503abc36abd3b4dfee58bf8d5061d1ba`
- Main merge commit: `bf46e0c07962bcf45f372c510d8b36d3cdbdee66`
- Pull request: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/pull/182`
- Render deployment: `dep-d9he6gn7f7vs738rapc0`
- Production URL: `https://growpathai.com`
- Deploy trigger: automatic deployment from `main`
- Deploy result: Live after 1 minute 48 seconds
- Deploy started: 2026-07-24 12:00:02 AM EDT
- Live retest completed: 2026-07-24 12:04 AM EDT

## Finding and fix

Before the fix, direct requests and hard reloads of both workspace selectors returned
HTTP 404 even though the Expo Router screens existed:

- `https://growpathai.com/account/workspace`
- `https://growpathai.com/account/mode`

The production export's explicit static fallback list omitted both routes. The fix adds
both fallback pages, adds both URLs to the release URL verifier, and adds a regression
test that guards the production fallback list.

## Local and CI verification

- Focused Jest: 3 suites, 14 tests passed.
- Targeted ESLint: passed.
- `git diff --check`: passed.
- Full production web export: passed.
- The export physically generated:
  - `dist/account/workspace/index.html`
  - `dist/account/mode/index.html`
- GitHub Frontend CI `30065475512`: passed in 3 minutes 15 seconds, including
  dependency installation, Expo checks, production dependency audit, lint, delivery
  guards, and the repository-wide test stage.

## Production verification

- Both workspace URLs returned HTTP 200 at 2026-07-24 12:03 AM EDT.
- A signed-in hard reload of `/account/workspace` rendered `Choose where you are
  working` instead of `Not Found`.
- The chooser showed the real account identity and separate available Personal,
  Commercial, and Facility choices.
- Direct entry to `/account/mode` rendered the same supported choices and explanatory
  mode boundaries.
- Both pages produced zero captured browser-console errors.
- Selecting `Manage Commercial Brand` navigated to
  `https://growpathai.com/home/commercial`.
- The Commercial landing rendered the real Commercial dashboard and identity with
  zero captured browser-console errors.

Evidence type: HTTP headers, signed-in in-app Browser DOM inspection, browser-console
inspection, and exact navigation result. No screenshot or video is claimed by this
record.

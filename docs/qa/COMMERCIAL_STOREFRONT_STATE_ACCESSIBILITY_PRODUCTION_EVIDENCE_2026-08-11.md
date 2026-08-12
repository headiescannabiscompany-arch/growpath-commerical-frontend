# Commercial Storefront State and Accessibility Production Evidence

Date: 2026-08-11

## Release

- Local source commit: `37b2322e9c66603b6243cdc36bf54c0f9ac55c9b`
- Pull request: `#471`
- Main merge SHA: `6381cd50346011a7e4c2b62e5d4d2d70e49c8782`
- Production URL: `https://growpathai.com/home/commercial/storefront`
- Frontend CI: `31546464797`, passed
- Production Build Preflight: `31546464805`, passed
- Pull-request audit: `31546442528`, passed

## Accepted source behavior

- Storefront loading is single-flight and cannot race an owner edit or write.
- Storefront saves, quick-product creation, media upload, device location, and
  setup-task creation cannot overlap.
- Load failures expose an in-page retry, while write, media, and location failures
  stay in the page and retain the owner's draft.
- Latitude, longitude, dispensary state, support email, HTTPS public handoffs, and
  non-negative product prices are validated rather than silently omitted.
- An incomplete quick product can remain a draft but cannot be published.
- The workspace exposes one level-one heading, explicit level-two workflow
  headings, named controls, locked fields during work, and accessible progress,
  error, and success state.

## Verification

- 68 focused Storefront, public-commerce, theme, workflow, and registry tests passed.
- All 94 Jest regression batches passed.
- TypeScript, targeted ESLint, `git diff --check`, and the complete delivery guard
  passed.
- GitHub's pull-request audit passed dependency install, Expo dependency checks,
  Expo Doctor, production dependency audit, lint, sensitive-copy guard, Browser
  workflow contract, delivery guard, and tests.
- At `2026-08-11T23:36:15Z`, the cache-busted production route returned HTTP 200
  with `last-modified: Tue, 11 Aug 2026 23:28:06 UTC` and production bundle
  `index-ec1e25fa43c41eb5b06d49272a274fad.js`.
- The served production bundle contains the exact new retry, latitude validation,
  product progress, and incomplete-publish blocker strings.

## Evidence boundary

This proves source, CI, production build, rollout, route availability, and served
bundle provenance. No Render deployment ID is claimed because the Render dashboard
was not inspected. The current callable tool set did not expose in-app Browser
control, and the visible signed-in account was in a Facility workspace without an
authorized Commercial workspace. Therefore populated signed-in Commercial
Storefront create/edit/reload and screenshot/video acceptance remain open and must
not be inferred from this deployment evidence.

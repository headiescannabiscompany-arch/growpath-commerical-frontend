# GrowPathAI release evidence — 2026-07-19

## Delivered release

- Production URL: `https://growpathai.com`
- Final deployed merge SHA: `e025c2cd3a8e028ed9ce78e92f3768031d01704c`
- Main release merge SHA: `8c564fc599a126067ed5a92c17615a24afd23262`
- Nested backend commit: `fea8f9a`
- Final production `Last-Modified`: `Sun, 19 Jul 2026 19:21:07 UTC`
- Live URL verification: passed at `2026-07-19T19:48:49Z`; evidence file
  `tmp/spec/live-url-checks/2026-07-19T19-48-49-110Z.json`

## Automated verification

| Evidence                                   | Result                                                                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #42 Frontend CI                         | Passed, including install, Expo dependency validation, Expo Doctor, production dependency audit, lint, copy guard, Browser contract, delivery guard, and tests |
| Main Frontend CI for `8c564fc5`            | Passed: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29700032621`                                                 |
| Main production preflight for `8c564fc5`   | Passed: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29700032640`                                                 |
| PR #43 focused regression                  | Passed 3 suites / 20 tests, then full PR CI passed                                                                                                             |
| Main Frontend CI for `e025c2cd`            | Passed: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29700354681`                                                 |
| Main production preflight for `e025c2cd`   | Passed: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29700354674`                                                 |
| Production routes and API health/readiness | Passed for privacy, terms, support, communities, account deletion, API health, readiness, and API health alias                                                 |

The nested backend dependency install did not complete locally. Its `cross-env` shim
and Mongoose dependency tree remained incomplete, so database integration tests are
not claimed as passed. The nested backend source commit was pushed separately.

## In-app Browser evidence

| Timestamp / session              | Account or role     | Checks and outcome                                                                                                                                                                            | Evidence type                                                                     |
| -------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 2026-07-19, pre-final deployment | Public / signed out | Production entry reviewed at desktop and mobile viewport                                                                                                                                      | In-app Browser screenshots in the release chat; not exported to a repository file |
| 2026-07-19, pre-final deployment | Personal Free seed  | Login succeeded, but account reported Pro/trialing; valid Free-plan evidence blocked by seed drift                                                                                            | In-app Browser DOM and screenshot                                                 |
| 2026-07-19, pre-final deployment | Personal Pro        | Workspace entry and entitlement presentation reviewed                                                                                                                                         | In-app Browser DOM and screenshot                                                 |
| 2026-07-19, pre-final deployment | Commercial          | Raw internal task/library tab labels found and fixed                                                                                                                                          | In-app Browser DOM and screenshot                                                 |
| 2026-07-19, pre-final deployment | Facility Owner      | Team surface reported OWNER role                                                                                                                                                              | In-app Browser DOM and screenshot                                                 |
| `2026-07-19T19:49:35.417Z`       | Commercial          | Final deployed tab list contained Dashboard, Storefront, Products, Feed / Campaigns, Courses, Lives, Orders, Analytics, Profile, and Tools; raw task/library tabs absent; zero console errors | In-app Browser DOM tied to final SHA and URL                                      |

Final-SHA screenshot capture timed out three times. No screenshot or video is claimed
for the final SHA; the final evidence is the visible DOM/role state and console log
inspection recorded above.

## Open acceptance blocks

- Personal Free requires a correctly entitled Free test account.
- Facility Manager, Staff, and Viewer require separate credentials; the shared-record
  cross-role chain cannot be completed with the Owner credential alone.
- Independent outside-user loop and submitted feedback still require an outside user.
- Production verification/reset email requires the live email configuration, verified
  Resend domain, and delivery logs.
- Stripe checkout, webhook-confirmed enrollment/entitlements, cancellation/expiry,
  refund, and dispute evidence require live Stripe configuration and test authority.
- Owner-supplied knowledge sources, reliability tiers, approved uses, exclusions,
  cross-check rules, and review dates remain owner input and were not fabricated.
- Full all-route visual/accessibility acceptance and final-SHA screenshot/video evidence
  remain open.

These blocks prevent marking final acceptance complete, but they do not invalidate the
delivered release or the automated and Commercial navigation evidence above.

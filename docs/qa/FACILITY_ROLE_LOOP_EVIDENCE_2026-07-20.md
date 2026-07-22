# Facility role-loop evidence - 2026-07-20

## Scope and environment

This record covers the governed Facility QA namespace in the networked staging
environment and the frontend/backend releases produced from the findings. It does not
claim that the Facility role loop was rerun with production Facility accounts.

- Staging API: `https://growpath-api-staging.onrender.com`
- Production API health target: `https://api.growpathai.com`
- Production frontend: `https://growpathai.com`
- Seed namespace: `growpath-qa-facility-acceptance`
- Shared Facility ID: `6a5ea11685cee9a1c3f9696d`
- Browser test surface: local Expo web build pointed at the staging API
- Latest deployed frontend merge SHA: `c638c9626ac86982b9c5e167616390118b54db3f`
- Deployed backend merge SHA: `7c8c21d9d9a18bafef45eccd0d33b2a8bfb486e5`

## Role sessions and shared-record result

| Role/session            | Account suffix                           | Checks performed                                                                                                   | Result                                                                                                                                                                                                         |
| ----------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Facility Owner          | `account-owner@qa.invalid`               | Opened the shared dashboard, rooms, equipment, inventory, tasks, SOP templates, team, and compliance surfaces      | Correct Facility selected; 10 rooms, 8 equipment records, 6 inventory records, 10 planned tasks, 6 SOP templates, and 5 team members were visible                                                              |
| Facility Manager        | `account-manager@qa.invalid`             | Reopened the shared Facility, reviewed team controls, created and assigned a task to Staff Grower, then signed out | Manager could assign operational work but could not see Owner-only invite/role/remove controls; task count increased from 10 to 11; sign-out returned to the public entry instead of reactivating preview auth |
| Facility Staff - Grower | `account-grower@qa.invalid`              | Opened the Manager-created task from the assigned queue and completed it                                           | Exact task detail route opened; persisted task status became `DONE`; completion identified the Grower account; open task count returned from 11 to 10                                                          |
| Facility Staff - Scout  | `account-scout@qa.invalid`               | Reviewed the same Facility dashboard and completed-task filter                                                     | Shared counts matched and the cross-role task was visible as `DONE`; Staff could create permitted tasks but could not assign them                                                                              |
| Facility Viewer         | `account-restricted-employee@qa.invalid` | Reviewed tasks, the completed task detail, and Team                                                                | Viewer saw current shared state and all 5 members; task mutation, task creation, assignment, invitation, role-change, and removal controls were absent after the fix                                           |

The shared workflow record was task
`6a5eb37ec9fd257ae2484ce0`, titled
`[QA role-manager 2026-07-20 19:46 ET] Verify shared task write`. The Manager
created and assigned it, the Grower completed it, and the Scout and Viewer observed the
persisted `DONE` state. The task retained two audit events for creation and completion.

This proves the Manager -> Staff -> Scout/Viewer operational chain against one shared
record in staging. The full five-step acceptance chain remains open because an Owner
did not create the same task and return after completion to confirm its final audit,
notification, and compliance consequences. A forced Viewer backend-mutation request
was also not retained as 403 evidence.

## Findings fixed and delivered

| Finding                                                                                                                 | Fix and merge                                                       | Verification                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staging Facility seed requests could cross Facility boundaries when a supplied Facility ID was not guarded consistently | Backend PR `#33`, merge `7c8c21d9d9a18bafef45eccd0d33b2a8bfb486e5`  | Backend CI passed; staging and production Render services showed the exact SHA live at 7:27 PM ET; both health targets returned HTTP 200                                                                 |
| Local browser sign-out could reactivate preview authentication instead of remaining signed out                          | Frontend PR `#59`, merge `e6ce1fb99130d3a07882e2c6b7fc4f379211fb9e` | Frontend CI passed; live at 7:33 PM ET; staging browser sign-out returned to the public entry                                                                                                            |
| Manager Team UI implied Owner-only invite/role/remove authority                                                         | Frontend PR `#60`, merge `df3975b2dc736c34f25ee7cf510f752301b4e2bc` | Frontend CI passed; live at 7:45 PM ET; Manager retained assignment controls without Owner controls                                                                                                      |
| The expanded task creator pushed the task queue behind the fixed tab bar, making task rows appear non-actionable        | Frontend PR `#61`, merge `58fa877ec68ad6b945b6c0de95cea6ab27a741c3` | Frontend CI passed; live at 8:05 PM ET; the queue stayed visible and opened the encoded task detail route                                                                                                |
| Viewer Team rows displayed false assignment affordances                                                                 | Frontend PR `#62`, merge `c638c9626ac86982b9c5e167616390118b54db3f` | 11 focused Team/role/task tests passed locally; full CI passed; Render deployment `dep-d9fbi157vvec73cd6b8g` was live at 8:12 PM ET; Viewer became read-only while Manager assignment remained available |

CI evidence:

- Backend PR `#33`: `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29786736220`
- Frontend PR `#59`: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29787301406`
- Frontend PR `#60`: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29787930497`
- Frontend PR `#61`: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29788947380`
- Frontend PR `#62`: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29789359878`

## Production follow-up - 2026-07-22

The production Facility Owner session was resumed against frontend merge
`93bb0217bed041d26aed286b8aad1965da1ccd6e` at `https://growpathai.com`.
This follow-up moved the production shared-record chain forward without claiming the
missing role sessions.

- The Owner reopened the Facility Team surface and confirmed two active members: one
  Owner and one Manager. Owner-only invite and role-management controls were present.
- The Owner sent the secondary test account a Manager invitation. The application
  reported confirmed email dispatch, but the active-member count remained two until
  acceptance, as expected.
- The secondary account signed in successfully, but its workspace switcher continued
  to show `Create Facility Account`; no in-app pending-invitation acceptance path was
  exposed. The invitation therefore still requires the delivered recipient email.
- The Owner created `[QA cross-role 2026-07-22] Verify shared task persistence`, due
  2026-07-23, and assigned it to the existing Manager. The exact task detail reloaded
  with status `OPEN`, the Manager assignment, and the Owner mutation controls intact.
- Genuine in-app Browser screenshot and DOM evidence were captured at
  `2026-07-22T22:17:21.853Z`. No task completion, role change, deletion, or operational
  grow action was performed.

The next production acceptance action is to open the delivered invitation in the
secondary account mailbox or supply credentials for the existing Manager, Staff, and
Viewer accounts. The same QA task must then be opened as Manager, completed by Staff,
observed as read-only by Viewer, and reopened by Owner for final audit confirmation.
The connected Gmail mailbox did not contain the recipient mailbox, and the installed
Chrome session was unavailable, so those role results are not inferred.

### Production Owner inventory loop - 2026-07-22

The same production Owner session completed the Facility inventory create, persistence,
adjustment, and cleanup loop at `https://growpathai.com/home/facility/inventory`.

- The Owner created `[QA inventory 2026-07-22] Verification marker` with quantity 1
  each and a release-only SKU. The list reported `1 items | 1 units on hand`, and the
  record survived a hard reload.
- A `+1` quantity adjustment persisted as 2 after reload. A `-1` adjustment restored
  the marker to 1 before cleanup.
- The live detail exposed raw database fields and internal identifiers and had no
  cleanup action. Frontend PR `#148`, merge
  `65409b6ce535d0bff4d07d7bc04652c8ed0c46ea`, replaced that payload with readable
  SKU and record-time information, clarified adjustments, and added confirmed
  removal. The full frontend regression passed: 301 suites, 1,165 tests, and one
  snapshot.
- The new production screen was observed at `2026-07-22T22:39:52.644Z`; screenshot
  and DOM evidence at `2026-07-22T22:40:05.767Z` showed readable record information,
  no raw identifiers, and the removal control.
- The first confirmed removal issued the canonical record-ID request but received 404
  because the backend treated every update/delete identifier only as an SKU. Backend
  PR `#55`, merge `3036d43901000b0697c7723bba7b9877c08cdf4e`, made Facility
  inventory update/delete accept either a record ID or SKU while preserving Facility
  scope, role gates, soft deletion, and audit details. Both database-backed inventory
  contract suites passed locally (19 tests), and both backend CI jobs, including the
  API security scan, passed.
- After the production API deployment, confirmed deletion returned to the empty list
  at `2026-07-22T23:05:56.281Z`. A hard reload at
  `2026-07-22T23:06:06.403Z` still showed `0 items | 0 units on hand` and the temporary
  marker was absent. Final screenshot evidence is tied to the two merge SHAs above.

This closes the production Owner inventory loop without leaving test inventory. It
does not close the separate Manager, Staff, Viewer, or cross-role task chain.

### Production Owner SOP and compliance loop - 2026-07-22

The Owner completed a template-backed SOP run and the compliance deviation lifecycle
on the production Facility.

- The Owner created `[QA SOP 2026-07-22] Sanitation evidence check` with three explicit
  checklist steps, started a template-backed run, reviewed all three steps as done,
  and completed the run. The detail became mutation locked and survived a hard reload
  with `3/3` reviewed steps and the completion timestamp intact.
- The Compliance surface showed the template plus the run-created, three step-updated,
  and run-completed audit events. Team was also reopened and still showed the active
  Owner and Manager with Owner-only invitation and role-management controls.
- The first deviation create attempt at `2026-07-22T23:22:09Z` exposed a production
  service defect. Render recorded an unhandled Mongo duplicate-key failure for the
  globally unique `DEV-2026-0001` reference and marked the API instance failed. The
  UI reported a connection/session-check problem, the API returned 502 during the
  restart, and no deviation record was saved.
- Backend PR `#56`, merge `0f330650992b6085cd2a791ddf740717d1091172`, replaced the
  Facility-local sequential reference with a globally collision-resistant public
  reference and routed deviation list/create/resolve failures through the API error
  boundary. Two database-backed suites passed locally (7 tests); the full GitHub test,
  lint, dependency-audit, and ZAP API scan gates passed. Frontend PR `#150`, merge
  `c0e4f4c382ade08d02b9ef55ca6bef6bc7f2efd4`, recorded the matching knowledge rule.
- Render showed backend `0f330650` live at 7:42 PM ET. The Owner then created
  `[QA compliance 2026-07-22] Verify controlled deviation write`, observed one open
  deviation and its creation audit event, resolved it, and hard reloaded. The final
  screen showed zero open deviations, one SOP template, 49 audit events, and both
  readable deviation audit entries; API health remained HTTP 200 at
  `2026-07-22T23:43:36Z`.
- Genuine in-app Browser screenshot and DOM evidence were captured after the hard
  reload on the two deployed merge SHAs above. The completed SOP run and resolved QA
  deviation remain as labeled audit evidence; no open test deviation remains.

This closes the production Owner SOP and compliance write/reload loop. Manager, Staff,
Viewer, forced-authorization, invitation-acceptance, and shared-record completion
remain separate acceptance items.

## Evidence limitations and remaining acceptance

- The role sessions used the in-app Browser against the local frontend connected to
  the staging API. Visible DOM state and persisted backend records were reviewed, but
  a raw screen-recording/video file was not exported.
- The final frontend SHA is confirmed live on Render and the production app still
  enforced the Facility-mode boundary for an existing Personal session. Production
  Facility credentials were not available, so the exact role chain is not claimed as
  production-retested.
- Owner final review, forced backend authorization evidence for restricted mutations,
  mobile/accessibility passes, and final-SHA screenshots/video remain open.
- Production Owner task creation and assignment now pass, but Manager/Staff/Viewer
  production sessions remain blocked on invitation acceptance or separate credentials.
- Public, valid Personal Free, Personal Pro, Commercial, and independent outside-user
  closure remain tracked separately. Email and Stripe delivery evidence still depends
  on production configuration and authorized test transactions.

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

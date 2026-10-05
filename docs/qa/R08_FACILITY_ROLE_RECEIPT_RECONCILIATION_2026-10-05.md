# R08 Facility role evidence reconciliation — October 5, 2026

## Result and boundary

Historical hosted passes below are retained, not rerun or presented as new
October production acceptance. The current app baseline is `9d2f24595fcb6a60a11925199c175b0d158c84b0`;
the checkout documentation head before this test-only change was `c95f7da2`.
No runtime code, permission, membership, credential, record, payment or deployment
changed. This receipt narrows A06; it does not close all of R08.

## Accepted evidence that must not be repeated by default

| Journey | Retained evidence | Scope |
| --- | --- | --- |
| Manager → Staff → Owner shared task | `FACILITY_ROLE_LOOP_EVIDENCE_2026-07-20.md`, section “Production Manager and Staff chain - 2026-07-23”; frontend `b2469b22326190ae7a0a8120b5c639b351466b62` | Actual production Manager reassignment, Staff completion/reload, Owner final state and corresponding assignment/completion audit events. Closed, not just a staging simulation. |
| Viewer team and task read-only navigation | `GIFT_SAFETY_UPGRADE_AND_NOTIFICATION_THEME_PRODUCTION_EVIDENCE_2026-07-31.md`, Team `508a69e6`, Tasks final `181a9034` | Actual signed-in production Viewer, readable four-member team and completed cross-role task; no invite/assign/change/remove or task-create affordances. |
| Viewer direct-route restrictions | Same receipt, Inventory final `063f32b0`, SOP `a027a1a1` | Production direct Inventory create and SOP Start routes were form-free read-only handoffs; completed SOP detail had no step/add/complete mutations. |
| Viewer operational reads | Same receipt, Rooms `a2c40372`, Compliance `68ea5bf9`, Grows `05c41bda`, Plants `0a3f2922`, Journal final `39b5a9a3`, Transfers `fdc9cdca` | Production role-specific controls and named loaded/empty states plus Night presentation. These were not authenticated forced-write API attempts or financial operations. |

The July 20 file's later prose still says a production Viewer account is missing.
That is superseded **for the later specifically recorded Viewer UI checks** by the
July 31 receipt. It remains valid that an exact forced-write server denial and
single-record Viewer observation/audit correlation were not proved by those UI checks.
Do not carry the obsolete “no Viewer account exists” blocker into the active queue.

The August 24 route-entry matrix is a historical candidate record, not a command to
repeat every route at every newer SHA. October A06-01..20 recovery receipts remain
closed in their own scope. Reopen only an affected path with a concrete regression
or a specifically identified missing acceptance transition.

## New automated transition evidence

Four cases added to `tests/unit/FacilityTeamRoute.test.tsx`:

1. Delayed native removal confirmation cannot send a removal after Owner → Viewer.
2. The same stale confirmation cannot send a removal after the session token changes.
3. Owner → Viewer clears an invitation draft; late success cannot display stale
   feedback or initiate another roster read. An already dispatched request is not
   claimed canceled.
4. A previous session's late roster cannot replace the new session's loaded roster.

Six suites / **68 tests passed**, including Team, Tasks, Reports access, Inventory
create, Plants and Journal. The four new tests exercise mocks; they do not change a
hosted user's role, send mail, remove a member, prove native-device operation or
replace backend authorization tests. Prettier and `git diff --check` passed.
Default ESLint ignores this test path; that invocation is not counted as lint proof.
An explicit `eslint --no-ignore tests/unit/FacilityTeamRoute.test.tsx` and full
`tsc --noEmit` subsequently passed with exit 0.

Read-only staging browser inventory confirmed the existing synthetic team still has
Owner, Manager, two Staff and Viewer. No sign-out, role edit, invitation or mutation
was performed. This inventory establishes fixture availability, not the sessions'
current credential availability or actual-role acceptance.

## October 5 actual staging Viewer acceptance — PASS

The user completed the existing synthetic Viewer sign-in in separate Chrome;
the in-app browser Owner session was preserved. No credential was retrieved,
printed or changed. These are current staging observations, not new production
certification. The previously recorded frontend staging baseline is `9d2f2459`;
this acceptance did not deploy either service or independently re-resolve their
deployment revisions.

- Facility: `6a5ea11685cee9a1c3f9696d`.
- Existing shared task: `6a5eb37ec9fd257ae2484ce0`,
  `[QA role-manager 2026-07-20 19:46 ET] Verify shared task write`.
- Actual Viewer detail and hard reload retained **Completed**, the July 20
  7:59:14 PM local update timestamp, and “You do not have permission to update
  tasks.” No update controls appeared. Back returned to the queue.
- The same task's entity history contained creation
  `6a5eb37ec9fd257ae2484ce4` and completion/update
  `6a5eb652c9fd257ae2484e9d`. Completion detail matched that task ID,
  `OPEN` → `DONE`, and `2026-07-20T23:59:14.166Z`.
  Its origin is **`legacy_unverified`**: this proves historical record
  correlation, not cryptographic verification of a modern audit chain.

### Bounded authenticated server denial — PASS

A temporary browser developer interception changed only a normal staging task
refresh into `PATCH` with body `{}` against
`/api/facility/6a5ea11685cee9a1c3f9696d/tasks/qa-viewer-denial-no-record`.
The existing Viewer session supplied authentication without reading its token.
The server returned HTTP **403** with:

```json
{"success":false,"error":{"code":"ROLE_REQUIRED","message":"Role required"}}
```

This was an intentionally invalid/nonexistent task identity, **not a write
attempt against the saved shared task**. Source inspection of
`routes/tasks.facility.js` confirmed OWNER/MANAGER/STAFF authorization precedes
the handler, and the handler validates the 24-hex task ID before record lookup
or mutation. The 403 therefore demonstrates the route's actual Viewer role
denial; it does not certify every write endpoint or valid-record mutation path.
CDP response metadata retained the original GET URL despite the explicit
method/URL override; the override and response are recorded separately here.

The UI displayed Permission denied / Role required and explicitly marked the
retained task as stale. All interception patterns were then cleared. Normal
Retry restored the saved task detail without an error, still Completed, with
the original Updated timestamp and no mutation controls. No saved task, member,
permission, account, payment or audit record was intentionally changed.

Local screenshot evidence under the workspace's `outputs/` directory:

- `Facility_Viewer_Shared_Task_2026-10-05.png`
- `Facility_Viewer_Task_Audit_2026-10-05.png`
- `Facility_Viewer_Server_Denial_2026-10-05.png`

These two bounded gaps (same-record Viewer correlation and task-route role
denial) are **closed**. Do not repeat them as a generic Facility acceptance loop.

## Still open — exact, bounded evidence

- One hosted canonical-session rejection → sign-in → Facility return belongs in
  A09 final walkthrough. It is not passed by the hard reload or automated tests.
  Preserve the existing Owner/Viewer sign-ins; do not shorten hosted token lifetime,
  retrieve signing secrets or repeatedly sign the owner out to manufacture evidence.
- A09 final owner walkthrough and other A01–A07 named gaps stay separate.

## Session-expiry contract clarification and regression proof

Source inspection found seven-day login/signup JWTs in backend `routes/auth.js`;
no first-party refresh-token renewal flow was found in the auth route/provider.
`retryMe` revalidates `/api/me`; it does not renew the token. Therefore the old
“token-refresh transition” wording must not create a requirement to implement
automatic renewal. The finite remaining hosted journey is rejection and sign-in
return, as described above.

Added four frontend cases for active Facility OWNER/MANAGER/STAFF/VIEWER sessions:
canonical revalidation returning 401 clears token, user, context and workspace
state; a subsequent retry does not send another authenticated request. These
are provider tests with mocked API responses, not browser expiry evidence.

Added two backend cases in `tests/middleware/auth.test.js`: create an already
expired JWT using a synthetic test secret and the real signing library, then use
the real verification implementation through canonical middleware and optional
identity resolution. Both reject before a user lookup. No hosted token or key is
read, minted, changed or exposed; all persistence methods remain mocks.

Verification: frontend auth-provider/transport **27 tests / 2 suites PASS**;
backend auth middleware **10 tests / 1 suite PASS**. Full frontend typecheck and
explicit test lint passed. The first backend invocation used repository-wide
DB setup and failed to launch MongoMemoryServer (`spawn EPERM`); it is not counted
as test proof. The successful invocation used the existing isolated unit config:
`node node_modules/jest/bin/jest.js --config tests/jest.inventory.unit.config.js --runInBand tests/middleware/auth.test.js`.
No database is required by this mocked-persistence suite. No runtime fix or
deployment is necessary; this closes automated expiry coverage, not the final
hosted sign-in-return check.

No new public Updates entry or deployment is needed for this test-only receipt.
Preserve the existing grouped Facility release history; do not label this an app
feature release or publish QA identities.

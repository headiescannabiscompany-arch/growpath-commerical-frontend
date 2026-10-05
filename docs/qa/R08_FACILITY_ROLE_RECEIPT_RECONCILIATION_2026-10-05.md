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

## Still open — exact, bounded evidence

- Hosted role/session expiry or refresh transition where its current behavior is not
  already evidenced. Automated transition checks above remain a separate layer.
- An authorized synthetic Viewer forced-write denial against the existing server,
  retaining the response and unchanged exact target. No production role grant or
  mutation is authorized by this receipt.
- Any same-record Viewer observation/audit correlation beyond the retained task-list
  UI receipt. Do not repeat the accepted Manager/Staff/Owner chain to obtain it.
- A09 final owner walkthrough and other A01–A07 named gaps stay separate.

No new public Updates entry or deployment is needed for this test-only receipt.
Preserve the existing grouped Facility release history; do not label this an app
feature release or publish QA identities.

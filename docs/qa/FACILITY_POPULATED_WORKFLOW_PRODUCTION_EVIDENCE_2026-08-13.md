# Facility populated-workflow production evidence — 2026-08-13

## Scope

This was a signed-in, read-only production review of retained Facility records and
their audit history after the SOP comparison follow-up links shipped. It did not
create, edit, delete, resolve, or otherwise mutate a production record.

Production frontend: `b8742f1a`

## Verified live states

- Facility Grows loaded retained grow `QA TEMP 2026-08-13 Facility Acceptance`.
- Facility Plants loaded retained plant `QA TEMP 2026-08-13 Plant A`, including its
  Veg stage and linked grow.
- Facility Grow Journal loaded retained entry
  `QA TEMP 2026-08-13 Acceptance observation` and its linked grow.
- Facility Inventory truthfully showed zero current items. The immutable audit log
  records both `Inventory Item Created` and `Inventory Item Deleted` for the approved
  temporary inventory record.
- Facility Compliance truthfully showed zero open deviations and zero pending
  verification. The immutable audit log records `Compliance Deviation Created` and
  `Compliance Deviation Resolved` for the approved temporary deviation.
- Facility SOP Runs loaded two completed runs with all 6 of 6 steps reviewed. A real
  comparison result opened the retained reference run, retained comparison run, and
  Facility Tasks queue through the three shipped follow-up links.
- The Owner-only AI Validation Lab loaded its protected owner state with its
  verify/compare/feedback/export controls. No action was invoked.
- Facility Audit Logs also retained the expected Grow Created, Grow Updated, Plant
  Created, Growlog Created, Task Created, Task Deleted, SOP Run Created, SOP step
  updates, and SOP Run Completed events for the approved acceptance chain.

## Remaining boundary

The retained grow, plant, and journal record were not deleted. The grow currently
provides Cannabis crop context used to expose Facility Harvest Readiness. Removing it
before an approved durable crop context replaces it could regress a separately
accepted production workflow. Cleanup therefore remains deliberately open and must
be performed only after Facility Harvest Readiness remains available through a proper
retained grow context.

This evidence does not claim a newly forced production 403, an exported cross-role
recording, or exhaustive mutation acceptance for every Facility route and role.

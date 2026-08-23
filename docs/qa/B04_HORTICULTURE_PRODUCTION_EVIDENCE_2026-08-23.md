# B-04 Horticulture production evidence — 2026-08-23

Canonical row: `B-04`  
Facility: `Triple Bag Genetics, llc` (`6a563bec2fb9f669d2319fa5`)  
Accepted actor: `jcindc2003@yahoo.com`, selected Facility `OWNER`  
Backend main: `7442cf8aa3a755504c3c7d00c4c48474cc74b466`  
Frontend main: `f4cbb5c0351fb7ab4313d3e7d79fcc93d0d9a890`

## Defect closed instead of bypassed

The first owner create returned a server error but the record appeared after reload. Source
inspection proved that all five Horticulture mutation routes wrote the domain record and then
called the shared audit writer with an incompatible two-argument signature. Backend PR `#228`
replaced that path with one MongoDB transaction containing both the version-fenced mutation
and the canonical actor/workspace/entity audit event. Create, update, care event, readiness
evaluation and archive now return success only after that transaction commits. An audit
failure rejects the transaction rather than leaving an unreported write.

Local backend evidence: 15 focused model/service/route assertions, 19 mount/export-contract
assertions, full backend lint, formatting, syntax and diff checks passed. Exact-main Backend
CI run `32661937390` passed its drift stopper and contract pack on `7442cf8a`.

The live crawl then found that the existing archive route had no product control and ordinary
record actions lacked named web button semantics. Frontend PR `#773` added the version-fenced
archive client, explicit cancel/confirm UI, retained-history explanation, and named disabled/
busy/selected button state for every Horticulture action. Six focused screen/API assertions,
TypeScript, repository and focused lint, static production-build verification, formatting and
diff checks passed. Exact-main Production Build Preflight run `32662516411` and full
Frontend CI run `32662516417` both passed on `f4cbb5c0`.

## Live owner acceptance

The existing synthetic `QA B04 OWNER 0823` record was reused; no duplicate was created.

- Adding the bounded owner inspection note succeeded and reported the server-recorded actor
  and time. A hard reload retained exactly one care-history entry.
- Readiness evaluation remained deterministic and blocked. It named the six missing facts:
  reviewed label, clear hold/quarantine review, customer media, care information, pick/pack
  review and a linked B-02 item. It did not reserve stock or claim fulfillment. A hard reload
  retained the result.
- The deployed archive action exposed a named confirmation. Cancel left the record active.
  Reopening and confirming removed only that record, stated that care/audit evidence was
  retained, and a hard reload kept it out of the active list.
- Facility Audit Logs showed separate append-only events for care creation, readiness
  evaluation and archive. The archive event linked to the same Horticulture entity and its
  immutable detail.

The synthetic record is archived and no longer clutters the active Horticulture list.

## Live Viewer denial

The authenticated production Viewer `john.collins15@alumni.morgan.edu`, explicitly shown as
`VIEWER` in the Triple Bag Genetics Team roster, opened the direct Facility Horticulture
Operations route. It failed closed with `Access denied` before loading any Horticulture
record or control. No record or audit event changed. Together with the retained Staff denial,
the denied Facility-role UI slice is accepted and must not be repeated.

## Exact remaining B-04 gates

Do not rebuild the Horticulture engine. The row remains partially open only for:

1. selected Facility `MANAGER` mutation/reload/audit acceptance;
2. Commercial owner create/link/reload/care/readiness/archive acceptance;
3. same-workspace B-02 item/lot and protected evidence linking, including cross-workspace
   denial;
4. one safely prepared `ready_for_human_confirmation` result proving it remains a review
   result rather than a reservation, order or availability promise; and
5. final-crawl improvement of Facility Audit Detail when a resolvable member name/role is
   available. The current event is immutable and scoped, but the primary detail displayed
   `Recorded facility member` instead of a readable actor and did not surface its role.

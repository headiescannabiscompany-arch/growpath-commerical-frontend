# B-04 Horticulture production evidence — 2026-08-23

Canonical row: `B-04`  
Facility: `Triple Bag Genetics, llc` (`6a563bec2fb9f669d2319fa5`)  
Accepted actor: `jcindc2003@yahoo.com`, selected Facility `OWNER`  
Backend main: `7442cf8aa3a755504c3c7d00c4c48474cc74b466`  
Frontend main: `f4cbb5c0351fb7ab4313d3e7d79fcc93d0d9a890`

Manager/link follow-up backend main: `23d0bf97f8104050a6d8e075313b73afad23562d`
Manager/link follow-up frontend main: `20e423c1d922fb6942e8565204104febc5514103`

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

## Live Manager, B-02 link and passing-readiness acceptance

The authenticated production Manager `exploringthegrowinguniverse@gmail.com`, explicitly
shown as `MANAGER` in the Triple Bag Genetics roster, created one bounded synthetic tomato-
starts record. The first live B-02 lot-link attempt exposed a real partial-update defect:
omitted `inventoryItemId` and `inventoryLotId` fields were normalized to `null`, so an
unrelated reviewed-field PATCH silently cleared an existing item link and a later lot-only
PATCH failed with a false item/lot mismatch.

Backend PR `#229` corrected the partial normalizer so omitted links remain untouched while an
explicit null/empty value still unlinks. Fourteen focused service/route tests passed; exact-
main Backend CI run `32665071473` passed on `23d0bf97`. Production then linked existing B-02
item `QA B02 OWNER 0823-863080` and its `LOT-0823-863080`, and every subsequent label,
quarantine, fulfillment and care-history update preserved both links.

The first reload retained the links and readiness but exposed a UI hydration gap: a persisted
lot remained hidden until the item button was pressed again. Frontend PR `#775` now hydrates
lots for persisted item links on load. Five focused Horticulture assertions and TypeScript
passed; the complete PR gate passed in `11m8s`, and exact-main Frontend CI plus Production
Build Preflight passed on `20e423c1`. The live reload then displayed the linked item at
`11 each` and linked lot at `3 each` without another action.

After reviewed label, clear quarantine, media, care-card and packing flags plus one bounded
inspection, evaluation returned `Ready for human fulfillment confirmation` with no reasons.
The screen continued to state that this does not reserve inventory, promise availability,
choose a substitute or complete an order. Reload retained that result and both links without
changing the B-02 item or lot balance. The Manager then archived the synthetic record; reload
returned the active list to empty. Audit IDs retained care, updates, evaluation and archive;
archive audit `6a8b5f10a096d5b7b0f04a5e` points to archived entity
`6a8b58be6fc138a825ba7eda` and Manager user `6a56c0eb670cd965167adbc0`.

This closes Facility Manager mutation/reload/audit, same-workspace B-02 item/lot linking and
the safe passing-readiness result. Neither defect nor this acceptance slice should be rebuilt
or repeated.

## Exact remaining B-04 gates

Do not rebuild the Horticulture engine. The row remains partially open only for:

1. Commercial owner create/link/reload/care/readiness/archive acceptance;
2. protected evidence linking and cross-workspace item/lot/evidence denial;
3. final-crawl improvement of Facility Audit Detail when a resolvable member name/role is
   available. The current event is immutable and scoped, but the primary detail displayed
   `Recorded facility member` instead of a readable actor and did not surface its role.

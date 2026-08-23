# B-02 production acceptance checkpoint — 2026-08-23

Matrix row: `B-02`  
Related rows: `F-05`, `C-03`, `B-01`, `B-04`, `B-05`, `B-08`, `B-09`  
Status: owner core ledger, one reviewed import, exports and Facility Inventory AI accepted;
remaining multi-role, import retry and paid reconciliation gates stay open

## Frozen production candidate

- Frontend behavior SHA: `88699a8257f2b009e73e8d67f6c82aeec9d2d33a`.
- Backend behavior SHA: `be00d33ff66fea5322fa6e7cac68fe21298d4753`.
- Canonical evidence merge: `41ecdcb7123128899f64e49952e14f8955086ecb`.
- Facility workspace: Triple Bag Genetics, signed-in Facility Owner.

This is a bounded production checkpoint, not full acceptance of `B-02`, `F-05` or `C-03`.
The named synthetic records remain pending confirmed cleanup after the remaining role and
history checks.

## Owner ledger lifecycle accepted

The Owner created `QA B02 OWNER 0823-863080` (`QA-B02-0823-863080`) and verified after
reload:

- opening receipt, item and lot balances;
- signed adjustment and consumption;
- full-balance move and transfer;
- hold and release;
- server-owned occurrence time and retained reported history metadata;
- unit-change rejection after stock history existed;
- clearing optional private item cost, currency and vendor fields without converting an
  unknown value to zero;
- append-only movements and audit evidence for every accepted mutation.

The populated record exposed deterministic unallocated/lot evidence rather than an AI-made
stock conclusion. No Storefront or public projection exposed authorized cost, vendor,
movement or audit fields.

## Reviewed CSV import accepted

The Owner pasted and reviewed `qa-b02-valid-0823-1619.csv` with one row, explicitly selected
the existing-field conflict policy and `Received amounts` quantity meaning, confirmed the
review, and applied it once.

- Import: `6a8b1e8333d14e8ff9190f1e`.
- Apply attempt: `daf2f636-5f26-4007-8659-09c311b6d7f7`.
- Item: `6a8b1e9f33d14e8ff9190f39` (`QA-CSV-0823-1619`).
- Movement: `6a8b1ea033d14e8ff9190f3f`, `receive +5 each`.
- Result: one applied row, zero existing-SKU conflicts, quantity persisted as `5 each` after
  reload.

The source item name began with `=`. The ordinary inventory export emitted
`'=QA Formula Safety`, proving spreadsheet-formula neutralization without changing the
numeric quantity. The already-applied review disables confirm/apply in the UI; replaying an
applied draft is therefore not manufactured through an unsafe direct request. Partial apply,
resume and same-key server idempotency remain automated evidence until a safe live fixture
can reproduce them.

## Full audit export accepted

The Owner downloaded the private full-audit CSV. It contained 38 rows and a terminal
`export_summary` row marked `COMPLETE`:

- 2 items;
- 1 lot;
- 9 movements;
- 2 import records;
- 22 audit events;
- 1 export manifest and 1 terminal summary;
- zero rows flagged as changed after export start.

The manifest and terminal summary shared request ID
`aab4e550-f8f0-4a67-a344-9820996e8739`, fixed membership cutoffs, start/cutoff/read times,
completion time and matching emitted counts. The export described itself as live mutable
state plus immutable history rather than a database point-in-time snapshot. Formula-looking
text was neutralized in both ordinary and full-audit exports.

## Facility Inventory AI accepted

The specialized Facility Inventory Risk flow loaded the server-authorized B-02 projection,
not a grow summary. Its deterministic and provider-facing result used the one authorized
active inventory record, kept unlike units separate, cited the inventory record, and stated
that use rate, par level, supplier lead time and unrecorded counts were unknown. It performed
no inventory write. The implementation and live evidence are recorded in
`FACILITY_INVENTORY_AI_PRODUCTION_EVIDENCE_2026-08-23.md`.

## Exact remaining production gates

1. Facility Manager mutation plus Staff/Viewer denial and forced backend `403` evidence;
   full-audit access must follow audit-read permission independently of inventory write.
2. Two similarly named Commercial workspaces and two Facility workspaces must prove record,
   private-field and audit isolation after reload.
3. Older-movement pagination needs a safe populated history; do not manufacture dozens of
   meaningless production movements merely to cross the page boundary.
4. Rejected, duplicate/conflicting and resumable partial CSV imports need safe live fixtures;
   do not bypass the reviewed UI to force an already-applied draft.
5. One authorized paid Storefront reconciliation must prove failure visibility, retry and
   exactly-once decrement without initiating an unapproved real charge.
6. After those checks, zero/archive only the named synthetic balances and records through
   confirmed, audited cleanup; retain immutable ledger/audit evidence.

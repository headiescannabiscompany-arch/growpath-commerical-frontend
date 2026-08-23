# B-02 production acceptance checkpoint — 2026-08-23

Matrix row: `B-02`  
Related rows: `F-05`, `C-03`, `B-01`, `B-04`, `B-05`, `B-08`, `B-09`  
Status: owner core ledger, one reviewed import, exports and Facility Inventory AI accepted;
remaining multi-role, import retry and paid reconciliation gates stay open

## Frozen production candidate

- Frontend behavior SHA: `88699a8257f2b009e73e8d67f6c82aeec9d2d33a`.
- Backend behavior SHA: `be00d33ff66fea5322fa6e7cac68fe21298d4753`.
- Exact backend post-merge run `32650803500` passed on that SHA. Its containerized test job
  completed install, drift stopper and the contract pack successfully; debug-only open-handle
  steps were correctly skipped because their preceding gates passed.
- Canonical evidence merge: `41ecdcb7123128899f64e49952e14f8955086ecb`.
- Owner-membership evidence merge: `6791268981826f1154dae0db1a780a33e1fff676`.
- Exact post-merge Frontend CI run `32653375100` passed on that merge SHA in
  `9m30s`. Install, Expo Doctor, production dependency audit, lint, TypeScript,
  sensitive-copy guard, Browser workflow contract, delivery guard and the full test step
  all completed successfully. The only annotation was GitHub's action-runtime notice that
  `actions/checkout@v4` and `actions/setup-node@v4` were being forced from Node 20 to Node 24;
  it did not fail the gate.
- At `2026-08-23T17:19:04Z`, production `/health`, `/ready` and `/api/health` all returned
  HTTP 200; readiness reported the database connected. Backend uptime placed the current
  process start at approximately `2026-08-23T16:10:38Z`, about one minute after backend
  merge `be00d33f` at `16:09:32Z`. The public endpoint no longer publishes its Git
  fingerprint, so this timing correlation is deployment evidence but is not mislabeled as a
  direct SHA header.
- The production frontend response was last modified at `2026-08-23T17:01:14Z`, about two
  minutes after frontend merge `67912689` at `16:59:08Z`, and served bundle
  `index-b00e54ff415ca6b258ada3205c0e36fb.js`. Exact Render-deploy identity remains a separate
  dashboard record; the public response does not expose a commit header.
- Facility workspace: Triple Bag Genetics, signed-in Facility Owner.

The production profile identified account `jcindc2003@yahoo.com`, plan `Facility`, Facility
`Triple Bag Genetics, llc` (`6a563bec2fb9f669d2319fa5`) and Facility-owned AI balance. The
Team page explicitly identified the same account as `Triple Bag Genetics — OWNER` and
retained the expected Manager, Staff and Viewer roster. The populated inventory route exposed
Owner-only create/import controls plus audit export, confirming this was not merely a
Facility URL reached by a lower role.

This is a bounded production checkpoint, not full acceptance of `B-02`, `F-05` or `C-03`.
The named synthetic records remain pending confirmed cleanup after the remaining role and
history checks.

### Current owner-session boundary — 2026-08-23 18:12 UTC

The pre-existing in-app tab initially retained the previously authorized Triple Bag Genetics
dashboard view, including the Facility name and aggregate counts. A fresh Facility navigation
then failed closed with `Access denied`, and Personal Profile reported a blank email plus
`Not authenticated`. No new Facility data loaded after that boundary check. The tab was left
at `/login?next=%2Fhome%2Ffacility%2Fdashboard` for the owner to sign in as
`jcindc2003@yahoo.com`.

This is an exact authentication blocker for the remaining role mutations, not evidence that
the owner or role implementation was removed. Do not treat a retained pre-logout page as a
current authenticated session, and do not repeat or rebuild the accepted owner ledger until
the owner login is restored.

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

These are evidence gaps, not permission to rebuild the accepted ledger. The local behavior
that each live check exercises is already named below so later work resumes at acceptance:

| Gate | Retained automated evidence | Exact live evidence still needed |
| --- | --- | --- |
| Facility roles | `tests/facility/rolePolicy.test.ts` keeps inventory writes at Manager-or-higher; `BusinessInventoryImportPanel.test.tsx` proves the read-only import state; `FacilityInventoryRoute.test.tsx` proves separate `AUDIT_READ` visibility | Existing Manager makes and reloads one reversible audited change; existing Staff and Viewer see read-only inventory and receive backend `403` for a forced write; each role's audit-export visibility matches its permission |
| Workspace isolation | Business-inventory API/screen suites pin explicit Commercial or Facility scope; backend B-02 route suites cover workspace authorization | Two similarly named Commercial workspaces and two Facilities load distinct items/private fields/audit after navigation and reload |
| Older history | `BusinessInventoryOperations.test.tsx` and `FacilityInventoryItemDetailRoute.test.tsx` prove explicit older-page loading, append and de-duplication | A naturally populated item with more than one server page loads the older page without manufacturing meaningless production movements |
| Import failure/retry | `BusinessInventoryImportPanel.test.tsx` covers failed apply refetch/re-review, interrupted-response recovery, duplicate reviewed resume/withdrawal, audited conflicts, raw duplicate rejection, applied-duplicate preservation, single-flight preview, malformed headers/rows and semantic locking after partial apply | Safe production fixtures visibly exercise rejected, duplicate/conflicting and resumable partial states without bypassing review or replaying a committed row |
| Paid reconciliation | `tests/routes/payments.webhook.test.js` proves signed paid-event fulfillment, idempotent ledger retry, duplicate delivery with one sales-accounting write, inventory exception visibility and no ledger call for an unlinked product | One owner-authorized Stripe test/live Storefront operation in the correct environment proves the provider round trip and exactly-once decrement; production exposes no unsigned admin/synthetic webhook bypass, so this cannot be manufactured without weakening the boundary or initiating an unapproved charge |
| Cleanup | Ledger/archive tests preserve immutable movements and audit | Owner confirms cleanup; only the named synthetic records are zeroed/archived and then reloaded while immutable history remains |

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

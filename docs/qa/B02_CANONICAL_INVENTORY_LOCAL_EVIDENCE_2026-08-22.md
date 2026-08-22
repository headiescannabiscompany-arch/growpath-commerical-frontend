# B-02 canonical inventory local acceptance evidence

Updated: 2026-08-22  
Matrix row: `B-02`  
Related rows: `F-05`, `C-03`, `B-01`, `B-04`, `B-05`, `B-08`, `B-09`  
Status: implemented and locally accepted; guarded production migration, deployment and
live role/workflow acceptance remain open

## Frozen starting point

- Frontend baseline: `9d8add797744053cb3a2c5e81b48ba604cd5eeb2` on
  `codex/matrix-construction-scaffold`.
- Backend baseline: `3d47c6659abf62aba017a5cc128fb6e933d5ec09` on
  `codex/shared-public-copy-v1`.
- Frontend implementation commit: `1d2834502bb0a27c9ece37dc3a8af13fd74496b5`.
- Backend implementation commit: `f00d674631de166c50d391ecb697b65c0cc045e0`.
- Canonical evidence reconciliation: the commit containing this document.

This record is local implementation evidence. It is not a deployment record and does not
claim that production data was migrated or that Commercial/Facility workflows were accepted
live.

## Coherent assembly completed

- One Commercial/Facility item, lot/batch and append-only movement ledger owns receiving,
  adjustment, relocation, transfer, hold, release, consumption and audited balance changes.
- Commercial and Facility UI use the same canonical business-inventory client and operations,
  while retained Facility compatibility routes enforce the same scope, role, transaction,
  history, unit, archive and audit rules rather than operating as a second ledger.
- Opening balances, manual changes, imports, Facility transfers and paid Storefront
  reconciliation use idempotent ledger movements. A failed transaction does not publish a
  false balance.
- Item and lot alerts are deterministic: low/out of stock, held, expired/near-expiry,
  unallocated quantity, lot-total discrepancy and source age. They are record checks, not AI
  conclusions or autonomous reorder actions.
- Authorized cost, currency and vendor remain private workspace data. Missing cost/currency
  remain unknown; cost requires an explicit three-letter currency. Legacy migration does not
  invent USD.
- Adjustments store an absolute movement quantity equal to the signed delta's magnitude.
  Move/Transfer/Hold/Release cover the selected item or lot's full balance. A stocked or
  historically used SKU cannot change its unit.
- Server occurrence time is authoritative. A user-reported historical date is separately
  retained as provenance metadata.
- Item detail keyset-paginates movement history by occurrence time and stable ID. Commercial
  and Facility screens append and de-duplicate older pages through an explicit **Load older
  movements** action.

## Reviewed import and export boundaries

- CSV import is source-digested and bounded, then follows preview → detected-column mapping →
  conflict/quantity review → explicit confirmation → apply.
- Optional blank mappings are disabled rather than silently falling back. Conflicts,
  invalid/duplicate rows, unit/location/closed-lot mismatches and hidden issue counts stay
  visible.
- Apply rows commit independently with version fences, before/after evidence, a durable row
  checkpoint and a server apply-attempt ID. Retry never repeats a committed row or changes
  reviewed meaning after a partial apply.
- Full audit CSV is workspace-scoped, spreadsheet-formula-safe, bounded/keyset streamed and
  private/no-store. It covers active and archived items, lots, immutable movements, import
  lifecycle/provenance and row before/after events. A terminal summary row, timestamps,
  membership cutoffs, changed-after-start flags and emitted counts disclose completion and
  live-state consistency limits.
- System, user and legacy-unverified audit origins are distinct. User notes cannot claim a
  system action; audit and movement records reject query, document and bulk rewrites.

## Authorization and privacy acceptance contract

- Commercial access follows the paid Commercial capability and is owner-scoped.
- Facility Owner/Manager may mutate inventory. Facility Staff are read-only. Full-audit
  export follows Facility audit-read permission, which is deliberately separate from
  inventory write permission.
- Every data query and audit event carries explicit workspace type and ID. Facility scope
  cannot be inferred from a client-supplied body/header on the non-Facility mount.
- Public Storefront/discovery responses never expose authorized cost, currency, vendor or
  internal balance/audit history.

## Local automated evidence

- Frontend B-02 lane: **12 suites, 81/81 tests passed**.
- Frontend TypeScript: `npx.cmd tsc --noEmit` passed.
- App-readable knowledge registry: **1 suite, 8/8 tests passed**.
- Guarded migration lane: **2 suites, 20/20 tests passed**. It covers dry-run defaults,
  owner/SKU collision checks, baseline movements, provenance/idempotency, explicit index
  planning/application/post-verification, blank legacy currency and apply/quiesce gates.
- Backend B-02 lane: **12 suites, 185/185 tests passed** with the deterministic
  `tests/jest.inventory.unit.config.js` run and explicit inventory route, ledger, model,
  audit, Storefront reconciliation and migration test paths. The final business-inventory
  route rerun passed **82/82**, and the final migration follow-up passed **16/16**.
- Syntax, conflict-marker, formatting and diff checks are rerun after final integration.

No dependency installation was attempted. Broad unrelated application suites that require
an unavailable `helmet` dependency or a real MongoDB index harness are not substituted for
the deterministic B-02 lane; production migration and index verification remain explicit
deployment gates.

## Production acceptance still required

1. Run the guarded migration in dry-run mode against the intended production database;
   review owner/SKU collisions, cross-owner rows, planned writes, baseline movements and
   index differences. Apply only with the explicit database, apply and quiesce gates.
2. Deploy the exact SHAs and verify the served frontend/backend fingerprints.
3. Exercise two similarly named Commercial workspaces plus two Facility workspaces as
   Owner, Manager, Staff and audit-capable Viewer/QA. Prove denial, no cross-tenant data and
   reload persistence.
4. Exercise empty and populated item/lot histories; receive, adjust, hold/release,
   move/transfer, consume, unit/archive guards, older-page loading and private-field clearing.
5. Exercise rejected, duplicate, conflicting, partially applied and resumed CSV imports;
   verify terminal audit export and formula neutralization.
6. Exercise one paid Storefront reconciliation, provider retry/idempotency and failure
   recovery without double decrement or false availability.
7. Clean up only the named acceptance records and append the production evidence. Then narrow
   or close `B-02`; do not claim all of `F-05` or `C-03` from this packet alone.

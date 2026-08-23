# B-01 canonical business-foundation local evidence

Date: 2026-08-22  
Matrix row: `B-01`  
Status: implemented and locally accepted; guarded migration, exact-SHA deployment and
multi-workspace/multi-role production acceptance remain open

## Decision

B-01 is the shared contract already consumed by B-02 through B-09, Commercial and Facility;
it is not another product surface or data store. Its local acceptance is closed by mapping
each foundation invariant to the retained, passing assemblies below. No duplicate
organization, location, role, approval, import-provenance, credit or audit implementation was
added.

Current integration baseline at this evidence update:

- Frontend `07fa2575f5a2400784a0ef4060fbc4f086b82e79`
- Backend `71496c08a1f35ec42721df01755c85f09d9fff8e`

## Invariant-to-evidence map

| B-01 invariant | Accepted implementation evidence |
| --- | --- |
| Selected organization/workspace identity scopes every business read and write | B-02's canonical Commercial/Facility ledger queries and audit records carry explicit workspace type/ID; B-03's own-Commercial and selected-Facility authorization foundation invalidates stale results/actions when scope changes. |
| Location exists only where the selected operation requires one | Solo Commercial calculators work without fabricated Facility/location/approval records; inventory lots/movements use reviewed canonical locations and reject closed or mismatched locations. |
| Server membership/role and field permissions are authoritative | Commercial owner scope and Facility Owner/Manager write, Staff read-only and separate audit-read rules are enforced at backend routes; current role change invalidates cached provider/action state. |
| Stable record identity, version/conflict behavior and idempotency survive reload/retry | B-02 item/lot/movement/import row identities, version fences and apply-attempt checkpoints; B-03 stable revision/review records and durable provider-operation idempotency. |
| Approval is explicit and bounded to the proposed action | Inventory import uses preview/mapping/conflict review/confirm/apply; Business Desk outputs remain drafts or ready-for-human-confirmation and never autonomously contact, order, publish, price, control equipment or certify compliance. |
| Import provenance distinguishes source, mapping, occurrence and user-reported history | Source digest, detected/explicit mapping, issue counts, row before/after evidence, server apply time and separate user-reported date are retained; missing currency and tax remain unknown. |
| AI-credit ownership and settlement follow the active workspace | Personal/Commercial charges stay account-owned; Facility operations charge the selected Facility; denied, failed, stale-scope and refunded operations cannot silently consume another workspace's credits. |
| Audit is workspace-scoped, actor-attributed, origin-labeled and exportable without leaking secrets | Append-only inventory movement/import audit, Business Desk action/provider receipts, protected-source redaction, formula-safe bounded audit export and Admin evidence boundaries are retained. |
| Similar names never imply shared ownership | Existing two-workspace/two-Facility and cross-account denial fixtures use IDs and memberships, not display names, for authorization. |

## Retained automated evidence

This evidence synthesizes already executed product gates rather than rerunning or cloning
them:

- B-02: frontend 12 suites / 81 assertions, app-readable knowledge 1 / 8, backend
  12 / 185, guarded migration 2 / 20, plus final route and migration follow-ups recorded in
  `B02_CANONICAL_INVENTORY_LOCAL_EVIDENCE_2026-08-22.md`.
- B-03: combined own-Commercial/Admin-Commercial/two-Facility authorization, scope-change,
  credit/refund/retry, prompt-injection, protected-field and no-external-action acceptance;
  explicit-currency, unknown-tax and subscription-ownership packets recorded in the canonical
  matrix and construction scaffold.
- Batch 5 corroboration: 465 frontend assertions and 207 backend assertions across the shared
  scope/role/import/integration/navigation foundation plus Commercial and Facility assemblies,
  as recorded in `CANONICAL_REMAINING_WORK_2026-08-08.md`.

These passing gates jointly cover the complete local B-01 contract. Repeating them under a new
foundation name would add cost without adding evidence.

## Exact remaining production gate

On one frozen deployed frontend/backend pair:

1. Use two intentionally similarly named Commercial workspaces and two Facilities.
2. Exercise Commercial owner, Platform Admin in its explicit Admin-brand Commercial
   workspace, Facility Owner, Manager, Staff and audit-capable Viewer/QA.
3. Prove direct-URL and API denial across workspaces, then change one membership permission
   and prove stale UI/provider/action state is invalidated after reload.
4. Run one reviewed inventory import from preview through apply/retry and one reviewed
   Business Desk provider operation; verify exact source, mapping, revision, actor, workspace,
   credit settlement/refund and audit evidence.
5. Verify similar names never change record ownership, no protected source/credential appears
   in UI/API/export, and cleanup touches only the named acceptance records.
6. Record exact SHAs, deployment IDs, accounts/roles, start/end state and recovery evidence.

The guarded B-02 production migration remains its own prerequisite. Until these actions are
recorded, B-01 is `implemented; local acceptance passed`, not `live accepted`.

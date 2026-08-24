# Buried feature and supporting-operation reconciliation

Date: 2026-08-22

This record supports Batch 0 of the canonical construction scaffold. It distinguishes a
user-facing capability that needs a visible entry from an internal backend operation used by
an existing canonical workflow. It does not close the owning workflow's production mutation
or live-acceptance gates.

## Current inventories

- Frontend filesystem inventory: 315 routes across 328 route files.
- Backend exported inventory: 319 route signatures.
- Full-surface static audit: 315 frontend routes, 225 directly parsed backend declarations,
  zero errors and zero warnings.
- System-foundation audit: 32 of 32 foundations present.
- Legacy feature matrix: 226 rows — 39 canonical user-facing rows, 121 compatibility rows,
  65 internal supporting operations and one deprecated route.

## The former 65 planned rows

Every formerly planned row is present in the backend route inventory. None is treated as a
new product. Each now has `rowStatus: supporting_operation`, remains internal and
non-user-visible, and names its owning canonical matrix rows:

| Operation family | Canonical owners |
| --- | --- |
| Facility membership, invites, ownership transfer, selection and settings | `F-01`, `A-05` |
| Facility and personal grow logs | `P-02`, `F-05` |
| Facility compliance summaries and recommendations | `F-03` |
| Inventory compatibility operations | `B-02`, `C-03`, `F-05` |
| Room compatibility operations | `F-01`, `F-06` |
| Follow/follower/profile compatibility operations | `S-01`, `S-02`, `P-11`, `C-02` |
| Course authoring, lessons, completion and drop-off operations | `S-07`, `C-04` |
| Health and readiness operations | `A-03` |

The validator requires supporting operations to be functional, internal, complete,
non-user-visible, UI-less and mapped to a canonical owner. The legacy matrix policy now
disallows planned endpoints, preventing generated backend names from silently becoming a
second backlog.

## Final route-to-entry record

The required final-candidate visibility/navigation record now lives in
`R03_FINAL_ROUTE_ENTRY_MATRIX_2026-08-24.md`. It names every canonical user-facing story's
workspace/role, visible label, canonical URL, Back path, state contract and intentional
supporting/alternate-path boundary. Privacy-, safety- and authorization-hidden records remain
protected and are not product-discoverability defects.

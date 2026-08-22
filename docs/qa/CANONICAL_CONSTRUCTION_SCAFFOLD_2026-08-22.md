# GrowPathAI canonical construction scaffold

Updated: 2026-08-22  
Baseline frontend: `689474493cd82a866e6c8b20df781950c37fb378`

Batch 0 retained work is tracked in
[`RETAINED_WORK_RECONCILIATION_2026-08-22.md`](./RETAINED_WORK_RECONCILIATION_2026-08-22.md).

## Purpose and authority

This is the construction view of
`CANONICAL_PRODUCT_ACCEPTANCE_MATRIX_2026-08-21.md`. It turns every matrix row into a
repeatable, dependency-aware implementation packet so GrowPathAI can be finished without
guessing, circling, or rebuilding accepted behavior.

This document does **not** own product scope, status, or execution order. The canonical
matrix remains the only product queue. `CANONICAL_USER_STORY_ACCEPTANCE_2026-08-21.md`
defines behavior, `CANONICAL_REMAINING_WORK_2026-08-08.md` owns detailed evidence and
remainders, method documents own domain behavior, and production-evidence records prove
named live slices. If they disagree, stop and reconcile the owning document before code.

The older `FRONTEND_ROUTE_MAP.md` and `FRONTEND_ENDPOINT_TO_SCREEN_MATRIX.md` introduced
the “3D printable” goal. This scaffold extends that goal from screens to complete user
stories: route, data, permissions, states, writes, recovery, tests, deployment and live
acceptance must fit together as one packet.

## Construction state machine

Every matrix row moves through the same states. Skipping a state does not make the work
faster; it creates the repeated work this scaffold exists to prevent.

1. **Inventory** — locate current routes, visible entries, UI components, API clients,
   backend routes/models/services, tests, method documents and retained evidence.
2. **Reconcile** — compare the current implementation and evidence with the canonical
   user story. Mark each acceptance slice `proven`, `present-unproven`, `missing`,
   `regressed`, `blocked` or `not-applicable`.
3. **Contract** — describe only the exact missing behavior, affected roles/data states,
   privacy/security boundary, persistence/recovery behavior and evidence needed.
4. **Construct** — make the smallest coherent frontend/backend/domain change that closes
   the contracted gap. Preserve newer working architecture and existing requested tools.
5. **Verify locally** — focused unit/contract/integration checks, corruption scans, export
   sanity and applicable security/configuration guards pass.
6. **Integrate** — commit, review and merge one coherent packet. Record frontend/backend
   SHAs; do not leave required halves in unrelated worktrees.
7. **Deploy** — prove the exact candidate is served. A successful deployment is not live
   acceptance.
8. **Accept live** — exercise the named role, populated and empty states, writes, reload,
   duplicate protection, Back/cancel/error/retry, privacy/authorization, theme, viewport,
   accessibility and cleanup. Record exact evidence.
9. **Close or narrow** — only the canonical matrix changes status. If one slice remains,
   narrow it precisely; never reopen the whole row without a reproduced reason.

## Required construction packet

Before editing product code, create or update one packet with these fields:

| Field              | Required content                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Matrix identity    | One primary matrix ID; related IDs are dependencies, not hidden scope                                      |
| Baseline           | Frontend/backend SHAs and current matrix status                                                            |
| User and entry     | Intended workspace/role, visible label, canonical URL and Back path                                        |
| Existing assembly  | Routes, components, clients, backend routes/models/services, tests and retained evidence                   |
| State coverage     | Loading, empty, populated, disabled, permission, offline, error and stale/conflict states                  |
| Data contract      | Ownership IDs, source/provenance, validation, response envelope, persistence and migrations                |
| Write contract     | Confirmation, idempotency, audit, rollback/withdrawal and irreversible-action warning                      |
| Safety contract    | Role/workspace isolation, privacy, secrets, cannabis visibility, commerce/legal and AI evidence boundaries |
| Exact gap          | `present-unproven`, `missing`, `regressed` or `blocked`; no vague “tighten” task                           |
| Build slices       | Ordered frontend, backend, domain/registry, migration and documentation changes                            |
| Automated evidence | Named focused tests plus applicable repository gates                                                       |
| Live evidence      | Account/role, starting data, action, persisted result, recovery, viewport/theme/accessibility and cleanup  |
| Completion         | Matrix update, evidence link and any precisely narrowed remainder                                          |

No packet may silently introduce another product, remove a requested capability, declare
legal/compliance certainty, invent domain facts, publish private material, or enable an
external write/control merely because a provider API exposes it.

## Dependency-ordered construction

The batches below apply the canonical matrix order. Rows within a batch may be inspected
in parallel, but writes merge in dependency order and each row closes independently.

### Batch 0 — preserve and reconcile retained work

- Preserve the integrated Plant ID, device, Hosted Live/OBS, Commercial parity, Nature and
  unified-reporting architecture named in the matrix old-work closure queue.
- Inventory every remaining dirty/unmerged worktree. Integrate or deliberately reject its
  unique changes before removal; a branch name is not evidence of unfinished product work.
- Reconcile all `partial`, `implemented` and `open` rows against current code and retained
  evidence. Route loading, empty-state evidence and green tests cannot close a write or
  populated workflow.
- Output: a packet record for every non-live-accepted row, with no undefined “tightening.”

### Batch 1 — ordinary Plant ID to private result, optional Grow and optional Nature

Primary rows: `P-03`, `P-04`, `P-05`, `P-06`, `N-01`, `N-03`, `N-04`.  
Dependencies: `P-07`, `A-05`.  
Construction boundary: identify-only never creates a Grow or pin; Grow and Nature are
separate reviewed branches; exact coordinates remain private; publication is explicit and
withdrawable. Legacy Cary/Maydale recovery is optional and house/potted records stay private.
Close the future workflow with one new ordinary observation rather than depending on legacy
media.

### Batch 2 — identity, workspace, Admin and commercial-authority foundation

Primary rows: `P-11`, `C-05`, `A-01`, `A-02`, `A-03`, `A-04`, `A-05`.  
Dependencies: all later mutating and cross-role rows.  
Construction boundary: preserve Platform Admin authority while entering an explicitly
selected Admin-brand Commercial workspace; never merge Living Soil Labs or Triple Bag
Genetics ownership. Reporting, investigation and security cases retain evidence and audit.
Preservation is not disclosure. Approval/disclosure UI remains unavailable until the
backend and reviewed operating procedure satisfy the lawful-request contract.

### Batch 3 — grow workspace and evidence-aware AI

Primary rows: `P-01`, `P-02`, `P-07`, `P-08`, `P-09`, `P-10`.  
Dependencies: Batch 1 privacy/source contracts and Batch 2 session isolation.  
Construction boundary: crop-aware grows remain open-world and sourced; unsupported crops
stay editable. AI uses selected evidence, preserves originals and exact source-bound derived
views, exposes uncertainty/counter-evidence, and requires confirmation before writes.
Timeline sharing/export is separate from the private editor. Harvest Readiness and
Diagnosis/IPM are repaired against their existing architectures rather than replaced.

### Batch 4 — community, media, Lives, courses and sharing

Primary rows: `S-01` through `S-08`.  
Dependencies: Batch 2 identity/reporting; `P-07` media evidence; `R-01` only where paid
enrollment is exercised.  
Construction boundary: reuse the retained Hosted Live/OBS, GrowPath chat/overlay and replay
architecture. Outside providers use documented embeds/handoffs; GrowPath messages are not
claimed as outside giveaway entries. Sharing uses stable viewer URLs, copy/native share and
reviewed provider targets without silently cross-posting or exposing private data. Course
cover/banner/hero roles are deliberate and nonduplicated.

### Batch 5 — Commercial and Facility completion

Primary rows: `C-01` through `C-04`, `F-01` through `F-07`.  
Dependencies: Batches 2–4 and Batch 6 shared business foundation where applicable.  
Construction boundary: Commercial retains applicable Personal capabilities; Facility roles
remain authoritative at the backend. Storefront, courses, social and owner tools remain
discoverable without polluting staff navigation. Facility records, credits, rooms, grows,
plants, assignments, SOP evidence, inventory and imports remain facility-scoped. Provider
keys stay server-side/encrypted and imports require preview, explicit mapping and idempotency.

### Batch 6 — lightweight business operations and AI

Primary rows: `B-01` through `B-09`.
Dependencies: Batch 2 identity/audit and existing Commercial/Facility/social assemblies.  
Construction boundary: establish identity/audit/import provenance, complete B-02 as the one
lot-aware inventory/receiving/movement/export engine, then build B-03's four reusable engines
and eight Small Business Desk tools. B-04/B-05 consume B-02; they do not create parallel
inventory. Continue with horticulture help, reviewed facility intelligence, creator
essentials, truthful external commerce handoff and realistic acceptance. Do not reintroduce
regulator/POS, serialized recall recipients, ML forecasting, full CRM/ERP/accounting,
dynamic pricing, marketplace/payout/tax or cross-platform analytics without the documented
paying-customer reconsideration gate. AI produces reviewable drafts/tasks, never autonomous
contact, ordering, equipment control, compliance certification, pricing, publishing or
legal decisions.

### Batch 7 — money, notifications and data rights

Primary rows: `R-01`, `R-02`.  
Dependencies: relevant course/storefront/profile/session assemblies.  
Construction boundary: prove success, cancellation, failure, duplicate attempt, webhook
reconciliation, entitlement, receipt and refund/return boundaries. Gift subscription remains
disabled until separately defined. Notification categories persist independently; real iOS
and Android receipt/tap evidence is required.

### Batch 8 — freeze, crawl, independent review, hats and stores

Order is fixed: `R-03` → `R-04` → `R-05` → `R-06`.

1. Freeze exact frontend/backend SHAs only after all in-scope functional packets are closed
   or carry an owner-approved, time-bounded exception.
2. Run one complete cross-role, route/action, populated/empty, persistence, recovery,
   security, visual, responsive, theme and accessibility crawl. A defect returns to its
   owning matrix packet; the crawl does not redefine behavior.
3. Give Roberto a separate reviewer identity. Itemize and deliberately accept/reject every
   finding; owner approval precedes production.
4. Pause for owner review, then complete the rights/specification/sample/non-sale hat work.
5. Begin App Store and Play Store work last, including credentials, Sentry, builds,
   physical-device smoke, privacy/data-rights, listing, submission, monitoring and rollback.

## Story-to-assembly index

This table guarantees every canonical row has a construction home. Paths are ownership
surfaces to inspect, not proof that the story is complete.

| IDs           | Primary assembly surfaces                                                                                    | Construction packet focus                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `P-01`        | Personal home routes/screens, featured-feed services/components                                              | Eligible mixed feed, active-grow actions, sparse state, stable links               |
| `P-02`        | Personal/Commercial grow routes, grow APIs/models, lifecycle registry, integrations, timeline/archive/export | Crop-aware create/import, attached history, reversible archive, ownership          |
| `P-03`–`P-06` | Species/Crop ID, saved ToolRuns, Create Grow draft, field-observation draft/publish APIs                     | Three independent branches, evidence identity, explicit save/publish/withdrawal    |
| `P-07`        | Shared result/evidence panels, media upload/crop manifests, ToolRun APIs, AI policy/registries               | Originals/derived views, export, provenance, uncertainty, retry/next action        |
| `P-08`        | Harvest Readiness screens/services/calculators, trichome fixtures/evaluation                                 | Ordinary-phone range, glare/unreadable share, harvest/wait evidence, optional Grow |
| `P-09`        | Diagnosis/IPM screens, ETGU/GPT verification, method/source registries                                       | Ranked differential, counter-evidence, decisive follow-up, safe treatment boundary |
| `P-10`        | Grow timeline routes/components/export/share viewer and grow-history APIs                                    | Zoomable persisted events, revocable link, redacted viewer export                  |
| `P-11`        | Profile, billing, credits/storage, preferences, data rights, auth/workspace session                          | Truthful plan/actions, category settings, export/delete/logout/isolation           |
| `S-01`        | Forum/Q&A routes, comments/follows/media/reports/notifications                                               | Exact deep links, moderation/visibility consistency, owner/outside-user loop       |
| `S-02`–`S-03` | Video directory/library/upload/editor/player/comments/storage/course links                                   | Public/following/library, persisted lifecycle, storage, discovery and permissions  |
| `S-04`–`S-05` | Live directory/studio/session/player/chat/overlay, hosted-live backend/provider                              | State lifecycle, OBS credentials, volume/chat/share, isolation, replay/retention   |
| `S-06`        | Shared action targets, viewer routes, preview metadata and platform handoffs                                 | Appropriate targets, review/cancel, privacy-safe stable links, no false cross-post |
| `S-07`        | Course builder/detail/lessons/media/enrollment/checkout routes and APIs                                      | Media hierarchy, author lifecycle, access/payment return and progress              |
| `S-08`        | Discover sections/search/filters/cards/deep links                                                            | Useful mixed discovery, correct records, empty/populated Nature preview            |
| `C-01`        | Commercial shell/navigation and shared Personal route adapters                                               | Capability parity without duplicate navigation or wrong workspace writes           |
| `C-02`        | Commercial profile/storefront editor/public brand route                                                      | Identity/media/slug/sections/contact/social/location/publication and roles         |
| `C-03`        | Product/inventory/media/public cards and regulated-commerce gates                                            | Truthful availability plus independently authorized handoff/transaction levels     |
| `C-04`        | Commercial courses/content/campaigns/analytics/navigation                                                    | Complete owner workflows and coherent entries                                      |
| `C-05`        | Workspace selector/session plus Admin-brand Commercial context                                               | Explicit brand identity with retained Platform Admin authority                     |
| `F-01`        | Facility onboarding/dashboard/rooms/grows/plants/team and backend ownership                                  | Create/import/invite/role/audit with two-facility isolation                        |
| `F-02`        | Tasks/assignments/source links/evidence/completion and audit                                                 | Actionable links, permitted completion, Viewer denial, persisted evidence          |
| `F-03`        | SOP library/uploads/approval/assignment/runs/compare/compliance/audit                                        | Versioned execution, exceptions/corrective action and immutable history            |
| `F-04`        | Facility AI directory/shared tool adapters/credits/write gates                                               | Full applicable tools, Facility context/credits and role-safe writes               |
| `F-05`        | Inventory/transfers/reports/logs/journals/export routes and APIs                                             | Canonical locations, populated states, scope, mutation and export                  |
| `F-06`        | Integration center/provider adapters/import preview/mapping/history                                          | Customer keys, supported models, freshness, idempotency, no secret leakage         |
| `F-07`        | Facility owner/admin “More” and contextual social/course/storefront entries                                  | Owner reachability without staff navigation pollution                              |
| `B-01`        | Workspace/organization/location/role/audit/import provenance contracts                                       | Multi-tenant base shared by all retained business tools                            |
| `B-02`        | Commercial/Facility inventory, product/SKU, lot/batch, movement/import/export                                | Core ledger, simple evidence-linked flags, reviewed task/draft only                |
| `B-03`        | Small Business Desk calculator, extraction, record-assistant and reviewed draft/action engines               | Eight shipping tools; deterministic math and explicit save/export/handoff          |
| `B-04`        | Plant/product intake, labels, nursery batch/hold/care/fulfillment records                                    | Evidence-aware help and operational history without invented advice                |
| `B-05`        | Device/room/crop/SOP/task/maintenance/quality evidence assemblies                                            | Freshness/anomaly/review workflows; never autonomous control                       |
| `B-06`        | Creator assets, Lives, community, sharing, reports/moderation                                                | Approved sources, transparent state and human-controlled publishing                |
| `B-07`        | Storefront publication and external commerce handoff gates                                                   | Informational inventory by default; no native automation or assumed legality       |
| `B-08`        | Shared AI result, approval, audit, redaction and idempotency contracts                                       | Evidence/uncertainty/confirmation boundary on every business result                |
| `B-09`        | Cross-role business fixtures and live acceptance packs                                                       | Similar-name isolation, stale/conflict/import/error/share scenarios                |
| `N-01`        | Discovery Nature globe/list/search/filter/cards and public observation APIs                                  | Honest zero state, clustering/search, photo/date/description identity cards        |
| `N-02`        | Discover Nature preview                                                                                      | Preserve live-accepted zero/populated preview; regression-only work                |
| `N-03`–`N-04` | Location privacy/precision/publication/withdrawal and legacy review                                          | Exact/private/sensitive boundaries, no inferred location, optional recovery        |
| `A-01`–`A-03` | Admin control center, contextual controls, reports/security/account/content APIs                             | Tallies/deep links, case lifecycle, safe evidence, ownership and audit             |
| `A-04`        | Lawful-request frontend/backend models/routes/audit/export and operating contract                            | Preservation separate from approval/disclosure; enforced state/custody gates       |
| `A-05`        | Auth/profile/workspace contexts, storage reset, route guards, backend authorization                          | Identity-to-identity cleanup, expiry/reload/logout and direct-URL isolation        |
| `R-01`        | Billing/checkout/webhooks/enrollment/entitlements/receipts/refunds                                           | Full money lifecycle, duplicate protection and truthful unsupported states         |
| `R-02`        | Notification preferences, in-app/email/device delivery and deep links                                        | Independent categories, suppression, exact record, physical-device evidence        |
| `R-03`        | Route inventories, automated suites, live crawl/evidence tooling                                             | One frozen candidate; complete professional acceptance, no new scope               |
| `R-04`        | Reviewer identity, findings ledger, preview branch and owner decision record                                 | Isolated review with explicit accept/reject and production approval                |
| `R-05`        | Brand assets, specification/rights records, research-trial/storefront presentation                           | BLVNK approval, correct art, zero stock/not for sale, rights boundaries            |
| `R-06`        | Store build/config/privacy/listing/submission/monitoring/rollback artifacts                                  | Stores last; physical devices and release gates remain mandatory                   |

## Packet execution record

Use one subsection per actively constructed matrix row in the detailed remainder ledger or
a linked evidence document. Do not create another independent status list.

```md
### <ID> — <story>

- Baseline/status:
- Intended user, visible entry, canonical URL and Back path:
- Existing frontend assembly:
- Existing backend/data assembly:
- Required method/source/visibility contracts:
- Retained tests/evidence:
- Proven acceptance slices:
- Exact missing or regressed slice:
- Frontend build slice:
- Backend/data build slice:
- Automated checks:
- Deployment evidence:
- Live acceptance scenario and cleanup:
- Matrix/evidence update:
```

## Worktree and release discipline

- One packet has one integration owner and one primary branch. Parallel investigation may
  not create competing implementations of the same row.
- Start from current `origin/main`. Before coding, search merged code, retained branches and
  evidence; preserve the newer correct implementation.
- Dirty or unmerged work is retained until its unique diff is integrated or deliberately
  rejected. Clean merged worktrees are disposable; branches and worktree directories are
  separate decisions.
- Do not deploy every exploratory edit. Integrate coherent packets, run focused checks, then
  batch deployments where risk permits without obscuring exact SHA evidence.
- Never mark a row closed from chat, source inspection, a route load, an empty state, local
  tests or deployment alone.

## Entry gate for construction completion

The construction phase ends only when every in-scope row through `R-02` is live accepted or
has an owner-approved exception naming risk, scope, expiry and release impact; no retained
worktree contains an unclassified unique product change; and the canonical ledger contains
no undefined functional item. Only then may `R-03` freeze the candidate and begin the final
crawl. `R-04`, `R-05` and `R-06` remain strictly ordered after it.

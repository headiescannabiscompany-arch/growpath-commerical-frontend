# GrowPathAI canonical product acceptance matrix

Updated: 2026-08-24

This is the single product contract and execution order for finishing GrowPathAI.
Detailed historical evidence remains in `CANONICAL_REMAINING_WORK_2026-08-08.md`, but
that evidence ledger cannot create, reorder, reopen, or close a story in this matrix.
Chat history is not a substitute.

## Completion rule

A story is complete only when the intended user can find it, understand inputs/privacy/
cost/permissions, complete the primary action and next step in production, reload without
data loss or duplication, recover through back/cancel/error/retry, and use it across
applicable themes/devices/accessibility/roles. Tests and live evidence must identify the
exact frontend/backend SHAs and URL. `Local`, `implemented`, `merged`, `deployed`, and
`live accepted` are distinct states.

Status vocabulary is fixed:

- `open`: acceptance evidence is missing and implementation may also be missing.
- `partial`: at least one named acceptance slice is proven, but the complete story is not.
- `implemented`: the named behavior exists and has focused automated evidence, but is not
  yet production-accepted.
- `deployed`: the exact change is served in production, but the complete user path has not
  yet been accepted.
- `live accepted`: the complete story passed its role, state, persistence, recovery and
  presentation checks in production. Only this closes a row.
- `blocked`: an external credential, legal decision, third-party service or owner action is
  explicitly named; unrelated rows continue.

Each row's evidence record must contain: frontend and backend SHA as applicable, deployment
ID or served-bundle proof, production URL, date/time, account/workspace/role, starting data
state, action exercised, persisted/reloaded result, back/cancel/error recovery, viewport and
theme, accessibility evidence appropriate to the control, cleanup, and any remaining slice.
Route loading, source inspection, a green test suite or an empty-state check alone cannot
close a populated or mutating story.

## Document ownership

- This matrix owns product stories, status and execution order.
- `CANONICAL_CONSTRUCTION_SCAFFOLD_2026-08-22.md` is the derived build-packet and
  dependency view. It cannot add, reorder, reopen or close a matrix row.
- `CANONICAL_USER_STORY_ACCEPTANCE_2026-08-21.md` defines the acceptance scenarios for
  each matrix ID; it contains no independent status or execution order.
- `CANONICAL_REMAINING_WORK_2026-08-08.md` is the detailed evidence and remainder ledger.
- `USER_REQUEST_LEDGER_2026-08-13.md` preserves request and completion history.
- `ADMIN_SAFETY_AND_LAWFUL_REQUEST_CONTRACT_2026-08-21.md` refines A-01 through A-05
  preservation, lifecycle, disclosure-gate, deep-link and account-isolation behavior without
  changing their status here.
- Method documents in `docs/knowledge/methods` own durable domain behavior; matching
  registries in `src/knowledge` make those rules available to the app.
- Production-evidence documents prove a named slice; they never create a second queue.
- `CANONICAL_PARITY_LIVE_EVIDENCE_2026-08-21.md` records the exact-SHA production slices
  exercised after the workspace/Nature parity merge, including the reproduced grow-link
  defect and the positive-role acceptance that remains.
- `P08_HARVEST_READINESS_CANONICAL_EVIDENCE_2026-08-24.md` freezes the current P-08
  implementation, no-rewrite boundary, exact deployment order and live acceptance script. It
  is evidence for this row and cannot create or close a second queue.
- A new request must map to an existing row or add one new row here before implementation.
- A regression reopens only the affected acceptance slice, not the entire product area.

## Old-work closure queue

No new product scope starts until these retained batches are reconciled. Each batch moves
through `retained -> integrated -> locally verified -> deployed -> live accepted`. Reopen
completed architecture only for a reproduced regression, a missing matrix requirement, or
an integration break caused by a later batch.

[x] Plant ID standalone/grow/Nature recovery is reconciled on frontend `main` through
`fa2e3f7c` / `4f64f910`; the older retained branch adds no missing product behavior.
[x] Device-integration frontend/backend repairs and atomic Facility ownership transfer are
integrated through frontend `21387a82` and backend `c7b7674`.
[x] Hosted-Live lifecycle and durable replay expiry are integrated through frontend
`21387a82` and backend `c7b7674`, preserving the accepted OBS/chat/overlay/player design.
[x] Commercial grow/tool parity and Nature publication/privacy are reconciled on current
main through backend `d9adff2` and `504ba78` plus their current frontend surfaces.
[x] Historical backend PR `#26` is closed without deleting its branch after the retained
file-by-file reconciliation proved that PRs `#210` and `#211` recovered its only material
gaps and current services supersede or deliberately reject every other draft path. The clean
patch-equivalent `r03-integration-grow-selection` and merged `forum-owner-controls`
worktrees, plus the merged PR `#756` worktree, were removed without deleting their branches
or Git history. Three more clean temporary worktrees—`batch5-local-closure`,
`matrix-construction-scaffold` and `p11-profile-storage-frontend`—were removed only after
their exact HEAD commits were proven ancestors of current `main`. Dirty hat, trichome and
root evidence directories remain untouched. Backend pruning removed six already-broken
registrations whose gitdir targets did not exist. Three further clean registrations
(`backend-shared-public-copy`, patch-equivalent `p07-label-evidence-backend`, and
`backend-admin-cleanup`) were removed only after ancestor/patch-equivalence proof; Windows
reported long-path deletion errors for the first two directories, so any resulting disk
remnants are non-product cleanup residue rather than hidden implementation. The open
`s02-video-creator-filter` backend worktree and the three dedicated backend trichome evidence
worktrees remain registered and untouched. The merged frontend
`workspace-contextual-tools-accessibility` worktree was also retired after its only dirty
item proved to be a redundant 411 MB untracked backend snapshot: all 623 non-dependency
files (608 unique blobs) were reachable from backend Git refs, `node_modules` was generated,
and `uploads` was empty. The redundant snapshot and the now-clean merged worktree were
removed without deleting either repository's branches or history.
[x] Unified reporting and the Admin control center are signed-in production accepted. The
Platform Owner session loaded the control center and its bounded Harvest system queue; frontend
merge `940c7bb69d50f353074a90c2eedbf7a7f6c760e8` and backend merge
`d3fec55c2191e65a30a835dba510cae0964825f8` displayed failed operation
`6a8d51854cf08c2ed47a99d1`, its 3/7 progress and seven held credits without private media or
provider payloads. The owner recorded an audited OOM/no-result/no-resend refund, reload removed
the settled item from the active queue, and `/ready` remained healthy. Preserve this accepted
queue/action path; other Admin rows retain only their explicitly named open slices.
[ ] Reconcile every remaining `partial` or `open` row against merged code and retained
evidence, then implement only its exact missing acceptance behavior.
[ ] Freeze candidate SHAs, run the final cross-role and professional presentation crawl,
pause for independent review, then stop at the owner-directed GrowPathAI-only hat gate;
app-store releases remain last.

Clean worktrees only after their retained commit is integrated or deliberately rejected and
the worktree is clean. Branch deletion is separate from routine disk cleanup.

## Cross-cutting user-story rules

Every applicable story must preserve these invariants without repeating them in every row:

1. The capability is discoverable from the correct workspace and role, with one canonical
   route, a working Back path and no duplicate primary navigation.
2. Empty, loading, disabled, error, offline, permission-denied and populated states explain
   what happened and provide a truthful next action.
3. Writes are explicit, idempotent where appropriate, ownership-scoped, persisted after
   reload, auditable when regulated, and reversible or clearly irreversible.
4. Media preserves useful source detail, ownership and privacy; derived crops/frames remain
   linked to the source and are not presented as independent evidence.
5. AI separates observations, user statements, inferences and verified facts; it exposes
   uncertainty, counter-evidence, missing evidence and the best next collection step.
6. Personal, Commercial, Facility and Admin data never leak across roles or workspaces.
7. Day/Night/Auto, mobile/tablet/desktop, keyboard, focus, screen reader and text scaling
   remain usable on the final candidate.
8. Public sharing is a separate opt-in from saving private work, and withdrawal is tested.
9. Costs, credits, storage, quotas, external-provider handoffs and legal boundaries are
   visible before the user commits an action.
10. Completed behavior is not reopened without a reproduced regression, changed requirement
    or final-candidate cross-cutting failure.
11. A requested capability is not removed merely because its current implementation is weak.
    Repair its workflow, placement, evidence and results. Retire a route or component only when
    it is a true duplicate or superseded implementation and the complete capability remains
    discoverable through the canonical path with migration or redirect coverage.

## Personal and grow workflows

| ID   | User story                                                                                                           | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | Home provides a useful mixed feed, active-grow context and frequent actions                                          | live accepted; final-candidate regression only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| P-02 | Create/manage a crop-aware grow with photos, records, tasks, devices/imports, timeline, archive/export               | crop context, journal/task persistence, calendar date, timeline routes, archive/restore, CSV export and integration entry live accepted; retained-photo and real provider/import attachment remain open                                                                                                                                                                                                                                                                                                                                  |
| P-03 | Identify a plant and save its photos/result without requiring a grow, Field Study or public pin                      | ordinary-photo no-grow result/save/reload live accepted; final-candidate regression only                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| P-04 | Optionally open a reviewed create-grow draft from a usable Plant ID; explicit save creates it                        | live create accepted; owner archive cleanup/final regression open                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| P-05 | Optionally publish a dated/described/photo-backed, privacy-safe Nature pin; explicit opt-in and withdrawal           | implemented; local acceptance passed; publish/withdraw live acceptance open                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| P-06 | House/potted observations remain private; no place is inferred from date or proximity                                | private no-location/no-Nature Plant ID live accepted; public Nature publish/withdraw regression remains under P-05                                                                                                                                                                                                                                                                                                                                                                                                                     |
| P-07 | AI tools expose evidence, zoom views, uncertainty, missing evidence, follow-ups, save/retry and correct next actions | Plant ID provider/storage/reload and exact inspection-view actions live accepted; remaining module-specific action mutations stay open under their owning rows                                                                                                                                                                                                                                                                                                                                                                         |
| P-08 | Harvest Readiness works from ordinary phone media with sample ranges and reasons to harvest/wait                     | explicitly deferred until every other pre-hat functional row is closed: max-80 extraction/restore, 512 MiB guard, standalone context and exact quote are live; operation `6a8d51854cf08c2ed47a99d1` proved 3/7-batch progress before a Render 512 MiB OOM, was not resent, and its seven held credits were refunded through the live audited Admin queue after the bounded-memory repair deployed; paid result, full-resolution role sufficiency, private Feed review/export and live deletion/privacy/cleanup acceptance remain open |
| P-09 | Diagnosis/IPM rank hypotheses, counter-evidence and next checks without false certainty                              | implemented; local acceptance passed; provider/live acceptance open                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| P-10 | Grow timeline is visual, zoomable, private/shareable/exportable and viewer-friendly                                  | live accepted; final-candidate regression only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| P-11 | Profile supports plan/credits, billing/cancel, notifications, theme, export/delete, logout and workspace switch      | Admin Commercial account/profile/billing/privacy/workspace/logout presentation live accepted; other account types, provider mutation and multi-account isolation remain open                                                                                                                                                                                                                                                                                                                                                          |

## Community, media, courses and discovery

| ID   | User story                                                                                                         | Status                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| S-01 | Forum/Q&A supports posts, comments, follows, media, reporting and notifications                                    | owner lifecycle live accepted; outside-user/report-notification loop open                                                       |
| S-02 | Videos support public/following/library discovery, comments, creators/storefronts and storage usage                | populated public discovery/player and truthful following/comment empty states live accepted; follow/comment mutation open       |
| S-03 | Video upload/edit/interests/visibility/reuse/course attachment/archive persists                                    | live owner lifecycle and course reuse accepted; archive/outside-user acceptance open                                            |
| S-04 | Lives/Premieres expose upcoming/live/replay, player volume, chat, creator follow/share and honest empty states     | live private-premiere lifecycle and empty directory accepted; public/provider acceptance open                                   |
| S-05 | GrowPath-hosted OBS Live supports reusable private RTMPS, chat overlay, signed playback, stop and replay           | implemented; local acceptance passed; two-account provider/live acceptance open                                                 |
| S-06 | Lives, videos, AI results, journals, timelines, forum and Nature have appropriate internal/external share actions  | saved AI-result sharing/export live accepted; remaining stable-public-link acceptance open                                      |
| S-07 | Courses support deliberate cover/banner hierarchy, lessons/media, edit/publish/archive and paid enrollment returns | provider and GrowPath-video reuse live accepted; publish/payment/outside-user acceptance open                                   |
| S-08 | Discover provides useful storefront/course/video/forum/live/Nature previews, filters, links and empty states       | populated video plus Nature/Feed/store/course/live empty-state composition accepted; remaining populated-family acceptance open |

## Commercial and Facility

| ID   | User story                                                                                                        | Status                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| C-01 | Commercial retains Personal capabilities plus brand tools                                                         | implemented; local acceptance passed; multi-capability/live acceptance open   |
| C-02 | Brand owner manages storefront identity/media/slug/sections/contact/social/location/publication                   | implemented; local acceptance passed; populated/live acceptance open          |
| C-03 | Products expose media/inventory/pricing and only lawfully authorized transaction or external-handoff capabilities | implemented; local acceptance passed; migration/provider/live acceptance open |
| C-04 | Commercial courses/content/campaigns and analytics work without duplicate navigation                              | implemented; local acceptance passed; provider/live acceptance open           |
| C-05 | Admin brand can explicitly use Commercial tools while retaining Platform Admin                                    | live accepted; final-candidate regression only                                |
| F-01 | Facility Owner sets up rooms/grows/plants/team with role-aware create/edit/import/assignment/audit                | implemented; local acceptance passed; multi-role/live acceptance open         |
| F-02 | Assigned staff work links to the required record/action and persists evidence/completion                          | implemented; local acceptance passed; assigned-role/live acceptance open      |
| F-03 | SOP/compliance supports approve/assign/run/compare/evidence/exceptions and audit history                          | implemented; local acceptance passed; populated/live acceptance open          |
| F-04 | Facility has the full applicable AI toolset, correct credits/context and role/write gates                         | Inventory Risk live accepted; remaining provider/credit/tool acceptance open  |
| F-05 | Inventory/transfers/reports/logs have correct routes, populated states and exports                                | deployed; guarded migration accepted; populated/live acceptance open          |
| F-06 | Reviewed sensor/controller imports map rooms/history safely and protect API keys                                  | implemented; local acceptance passed; device-provider/live acceptance open    |
| F-07 | Owner/admin can reach social/course/storefront tools without polluting staff navigation                           | implemented; local acceptance passed; owner-role/live acceptance open         |

## Business operations and AI

See `BUSINESS_OPERATIONS_AI_REQUIREMENTS_2026-08-21.md` for the complete tool
inventory, safety boundaries and mandatory production scenarios.

| ID   | User story                                                                                                    | Status                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-01 | Scoped organization/location/role, stable record, import-provenance and audit foundation                      | implemented; local acceptance passed; multi-workspace/live acceptance open                                                                                                                  |
| B-02 | One complete inventory/lot/receiving/movement/hold/consumption/import/export engine reused by B-04 and B-05   | deployed; owner/Manager, Inventory AI, reviewed import, exports and Commercial/Facility cross-mode isolation accepted; forced-role, same-type isolation, history, retry/reconciliation open |
| B-03 | Small Business Desk ships price/margin, quote, lead, job, receipt, vendor, cash-flow and Ask AI tools         | deployed; STAFF/VIEWER denial plus Facility MANAGER and Commercial OWNER create/reload/archive accepted; provider/isolation live gates open                                                 |
| B-04 | Horticulture/nursery evidence-aware help, basic care history and fulfillment readiness                        | deployed; Facility roles and Commercial OWNER lifecycle/item/lot/readiness accepted; protected-evidence/cross-workspace/actor-display open                                                  |
| B-05 | Reviewed device/crop/room/SOP/maintenance intelligence with no autonomous equipment control                   | deployed; Manager setup boundary accepted; Pulse credential/provider and TrolMaster adapter live acceptance open                                                                            |
| B-06 | Creator essentials: approved assets, lives, community, sharing, reporting and moderation                      | implemented; local acceptance passed; provider/live acceptance open                                                                                                                         |
| B-07 | Truthful storefront and external lawful-commerce handoff only; no native payment, tax or promotion automation | implemented; local acceptance passed; regulated provider/live gates open                                                                                                                    |
| B-08 | Evidence, review, idempotency, redaction and audit boundary for every business AI result                      | implemented; cross-cutting local acceptance passed; provider/live acceptance open                                                                                                           |
| B-09 | Realistic multi-tenant/role/import/error/public-sharing business acceptance scenarios                         | implemented; local acceptance passed; final multi-account/live acceptance open                                                                                                              |

Full regulator/POS adapters, serialized recall workflows, advanced forecasting, full CRM/ERP/accounting,
dynamic pricing, marketplace/payout/tax tooling, and cross-platform creator analytics are
**removed from the active roadmap**. They are not completion blockers; the detailed
reconsideration rule is owned by `BUSINESS_OPERATIONS_AI_REQUIREMENTS_2026-08-21.md`.

B-02 local construction and verification evidence is retained in
`B02_CANONICAL_INVENTORY_LOCAL_EVIDENCE_2026-08-22.md`. It does not close the guarded
production migration, deployment or live multi-role workflow gate.

B-06 through B-09 local construction and verification evidence is retained in
`B06_B09_CANONICAL_LOCAL_EVIDENCE_2026-08-22.md`. These rows must not be rebuilt to satisfy
their remaining provider, production, regulated-policy or multi-account live gates.

B-01 local construction is accepted. The locally accepted B-02 ledger (frontend `1d283450`,
backend `f00d674`) implements authenticated Commercial/Facility workspace scope, role and
field permissions, stable records, reviewed import provenance, idempotent writes and
workspace-scoped audit/export. The active B-03 foundation (frontend authorization
foundation `0539d29a`; backend record/workspace foundation `a364e7e` and durable
provider/credit foundation `2d7a583`) adds own-workspace/selected-Facility authorization,
solo calculators without fabricated Facility/location/approval records, stable
revision/review controls, protected-source provenance, correct AI-credit ownership and
audited/idempotent actions. `B01_CANONICAL_FOUNDATION_LOCAL_EVIDENCE_2026-08-22.md`
maps every B-01 invariant to those already accepted assemblies and the consolidated Batch 5
role/scope lanes. This closes local construction without creating a second identity, role,
approval, import or audit system. Combined two-organization/two-Facility multi-role
production acceptance, the guarded B-02 migration, exact-SHA deployment, and live
isolation/reload/import/approval/credit/audit scenarios remain open.

B-03 is no longer an unstarted row. Frontend `85253d5e` retains the reviewed Business Ask
provider/evidence/citation/KPI/draft workflow, frontend `dc97e836` retains the explicit IANA
cash-flow contract, and backend `2d7a583` retains durable provider operations, exact source
binding, credit settlement, protected receipt loading, fail-closed scanner health,
privacy/deletion and legal-hold serialization. These commits are retained inputs, not a
reason to rebuild their engines; the later acceptance paragraph records their completed local
integration and exact remaining live gates.
Backend draft PR `headiescannabiscompany-arch/growpath-commerical#206` pins provider/security
candidate `2d7a583`; its 2026-08-22 Actions attempt ran zero steps because GitHub reported a
failed account payment or insufficient Actions spending limit. That is an external CI runner
block, not passing or failing code evidence. The later focused local acceptance supersedes
that missing runner evidence for construction, but required release CI must still run once on
the final integrated candidate after billing/minutes are restored.

B-03 local construction acceptance is now closed. Frontend `181ea060` and backend
`9166c66` pass the combined own-Commercial/Admin-Commercial/two-Facility role, isolation,
scope-change, credit/refund/retry, prompt-injection, protected-field and no-external-action
packet. Explicit-currency and unknown-tax packets retain separate currency and preserve blank
tax as unknown rather than zero. Subscription ownership corrections frontend `862ae85b` and
backend `dcc0209c` prevent duplicate purchase actions, source-mismatched cancellation and
cross-Facility entitlement leakage before live money testing. Focused evidence includes 5
frontend plus 3 backend combined-acceptance tests, 58 explicit-currency tests, 18 frontend plus
91 backend unknown-tax tests, and 67 frontend plus 127 backend subscription-safety tests;
TypeScript/lint/format/source checks passed where applicable. Exact-SHA deployment, real
provider operations, production reload/isolation/credit/audit, and role-specific live mutation
remain open and are the only B-03 completion gates; do not rebuild the eight tools.

Frontend merge `9c55b6bca924cded23d8f7d0d09700d8b509c3d4` passed the complete Frontend
CI gate and Render deployment `dep-da50siuq1p3s73at3cpg` succeeded on 2026-08-22.
Production loaded that candidate at `https://growpathai.com/`. In the selected Triple Bag
Genetics Facility, `headiescannabiscompany@gmail.com` was visibly identified as `STAFF` and a
direct request for `/home/facility/business-desk` failed closed before Desk data loaded. The
same live team surface identified `jcindc2003@yahoo.com` as `OWNER`,
`exploringthegrowinguniverse@gmail.com` as `MANAGER`, and
`john.collins15@alumni.morgan.edu` as `VIEWER`. This closes the live `STAFF` denial slice;
Owner/Manager mutation, Viewer denial, provider operation, reload/isolation, credit/refund and
audit evidence remain open and require the corresponding authorized sessions. Do not use the
account-level `User` label on Profile as a substitute for the Facility membership role.

The 2026-08-23 retention audit proves the B-03 assembly remains present after later merges.
Frontend authorization, eight-tool, currency, combined-acceptance, subscription-ownership and
Facility-billing commits `0539d29a`, `85253d5e`, `dc97e836`, `181ea060`, `862ae85b`,
`9c55b6bc` and `8d397f64` are all ancestors of current frontend candidate
`6791268981826f1154dae0db1a780a33e1fff676`. Backend workspace/record, durable-provider,
combined-acceptance, subscription-ownership and Facility-membership commits `a364e7e`,
`2d7a583`, `9166c66`, `dcc0209c`, `fbdd874c` and `687d635a` are all ancestors of current
backend candidate `be00d33ff66fea5322fa6e7cac68fe21298d4753`. This is retention evidence,
not a substitute for the still-open authorized-role/provider live scenarios.
The same audit confirms B-04 frontend `31156f2a`, B-05 frontend `21387a82` and
`99b5ab32`, B-04 backend `e89eec03`, and B-05 backend `c7b7674c` and `a05eff28` are
ancestors of those current candidates. Their remaining work is likewise authenticated
provider/device/live acceptance, not reconstruction.

The same live pass found that the Facility Profile's billing action opened Personal Account
billing while Triple Bag Genetics separately reported `FACILITY (trialing)`. The ownership
correction is now deployed: frontend `8d397f648f1399e10f92e6dec64de20ce67b81ba`
(`dep-da519qvavr4c73eobbcg`) adds `/home/facility/billing`; backend
`fbdd874ceadf27a4d0b950b5f1fad5ecc702ed0d` (`dep-da515heq1p3s73at9ln0`) limits status to
a safe Facility projection; and backend `687d635a49a5f9ec68dbe2a6674745f4bf9c6b7f`
(`dep-da51e53l550s73fvcud0`) authorizes canonical Facility memberships without allowing a
revoked member to regain access through a stale legacy role. Production acceptance on
2026-08-22 showed Triple Bag Genetics, `trialing`, and an explicit read-only `STAFF` message,
with no Personal plan, checkout or cancellation controls. Local evidence includes TypeScript,
lint, delivery guard, the 20-suite / 255-test subscription-and-gift packet, and the exact
canonical authorization suite (8/8). Read-only Facility billing is live accepted. Owner
checkout/cancellation visibility still requires an OWNER session; no financial action was
performed.

The 2026-08-23 STAFF regression on the same Facility proved that B-02 inventory and licensed
transfer history remain readable while inventory mutation/import, Business Desk and
Horticulture Operations fail closed. The empty inventory route identified zero items and
offered no create or AI-review mutation; the transfer route resolved after its authenticated
load and showed zero records, zero drafts, `$0.00` shipped sales and the bounded STAFF
fulfillment role. This extends the accepted STAFF denial/read-only slice without closing the
OWNER/MANAGER mutation, import, audit, isolation or provider gates.

The 2026-08-23 Manager pass separately authenticated
`exploringthegrowinguniverse@gmail.com`, verified its explicit Triple Bag Genetics
`MANAGER` membership, and used the existing B-02 owner item for one reversible hold/release
cycle. Both states survived reopening, both immutable audit events were present, and the
item returned to `11 each`. This closes the Manager mutation/reload/audit slice without
rebuilding the ledger. Staff/Viewer forced-write denial, permission-specific audit export,
workspace isolation, naturally paginated history, interrupted import resume, paid
reconciliation and cleanup remain open. Audit Detail still presents the actor as
`Recorded facility member` instead of the available readable name/role and remains a final-
crawl presentation defect.

The subsequent authenticated `headiescannabiscompany@gmail.com` Staff pass loaded the
populated two-item inventory, retained the correct `11 each` and `5 each` balances, exposed
no create/full-audit/movement controls, disabled reviewed import with truthful role copy and
allowed Facility Audit Logs independently of inventory write permission. This closes the
populated Staff UI and audit-read slice. Staff forced backend `403` remains open because the
available Browser execution surface could not use the app transport without inspecting or
duplicating stored credentials; no unauthenticated response was mislabeled as role evidence.

The authenticated `john.collins15@alumni.morgan.edu` Viewer pass then loaded the same
populated items, lots and immutable movement history with every save/movement action disabled,
no create/remove control and reviewed import disabled. Viewer correctly retained Full Audit
CSV and Audit Logs under its separate `AUDIT_READ` capability. This closes the populated
Viewer UI/audit-read slice. Only authenticated Staff and Viewer forced backend `403` probes
remain in the B-02 role gate.

The same authenticated Viewer session opened the direct Facility Business Desk and
Horticulture Operations routes. Both failed closed at the route boundary with `Access
denied` before either workspace tool surface or data loaded. This closes the B-03 and B-04
live Viewer-denial slices without reopening their implementations or changing data.

The authenticated Triple Bag Genetics Manager subsequently opened all eight Business Desk
launches, created one no-contact-data Lead Follow-up record, reopened the route and verified
revision 1, then archived it with a reason. The active list returned to empty and Facility
Audit Logs retained separate `Business Desk.Record.Create` and
`Business Desk.Record.Archive` events. This closes the Facility Manager mutation/reload/
archive/audit slice. Business Ask truthfully reported that provider-backed help is not
configured for this workspace and disabled Ask, so provider/credit/refund acceptance remains
an exact configuration blocker rather than a manufactured success.

The same Manager session closed B-04 Facility Manager mutation, existing B-02 item/lot link,
care, passing-readiness, reload, archive and audit acceptance. The pass found and closed two
current-candidate defects rather than bypassing them: backend main `23d0bf97` preserves
inventory links across partial updates, and frontend main `20e423c1` hydrates a persisted
linked lot after reload. The accepted result remained explicitly for human confirmation and
did not reserve or decrement the item (`11 each`) or lot (`3 each`). B-04 now remains open
only for protected-evidence/cross-workspace denial and Audit Detail actor-name/role
presentation: the subsequent Living Soil Labs Commercial owner pass linked its isolated B-02
item/lot, retained passing readiness and care history after full hydration without changing
the `5 each`/`2 each` balances, and confirmed archive cleanup.

The same Commercial owner created a bounded no-contact-data Lead Follow-up record, reloaded
revision 1, and archived it with a reason; the active list returned to empty. Commercial
Business Ask loaded the correct workspace but truthfully disabled asking because provider-
backed help is not configured. This closes the B-03 Commercial owner record lifecycle while
retaining provider/credit/refund and remaining isolation as exact gates.

The B-05 Manager setup boundary also loaded correctly. Pulse presented encrypted grow-scoped
API-key verification/discovery and made no connection without a key. TrolMaster truthfully
reported developer-access/key-storage planning and that its read-only adapter is not yet
implemented. No credential, device, mapping, room or reading changed. Pulse credential-backed
acceptance and TrolMaster adapter implementation/verification remain exact blockers.

The 2026-08-23 B-04 owner pass is retained in
`B04_HORTICULTURE_PRODUCTION_EVIDENCE_2026-08-23.md`. Backend main `7442cf8a` fixes the
observed write-then-audit-error defect by committing every Horticulture mutation and audit
event in one transaction. Frontend main `f4cbb5c0` exposes version-fenced, explicitly
confirmed archive and named action semantics. In the selected Triple Bag Genetics Facility,
the owner added care history, reloaded it, received six truthful blocked-readiness reasons,
reloaded that result, canceled one archive confirmation, then confirmed archive and reloaded
the empty active list. Facility Audit Logs retained care, evaluation and archive events. This
closes the Facility OWNER care/blocked-readiness/archive/audit slice without claiming Manager,
Commercial, B-02/evidence-link, passing-readiness or actor-name presentation acceptance.

Deployment reconciliation on 2026-08-23 proved that the retained B-03 frontend acceptance
commit `181ea060` and subscription correction `862ae85b`, B-04 frontend implementation
`31156f2a` and B-05 frontend integration `21387a82` are all ancestors of the exact deployed
frontend candidate `ffaee89e`. The corresponding B-03 backend acceptance `9166c66` and
subscription correction `dcc0209c`, B-04 backend implementation `e89eec03` and B-05 backend
integration `c7b7674c` are ancestors of exact deployed backend `324d4025`. The rows therefore
remain open only for their named authorized-role, provider, device, credit, audit, persistence
and isolation acceptance slices; deployment is not a reason to rebuild them.

Facility Inventory Risk is live accepted on frontend `88699a82` and backend `be00d33f`.
Production loaded one server-authorized Triple Bag Genetics B-02 item, displayed the correct
stock/evidence counts without a grow selector, and returned an inventory-specific answer with
unknown supplier timing, use rate, par level and unrecorded counts. It did not combine unlike
units, propose a stock write or fall back to the Facility grow summary. The final response
used the cross-record heading `Referenced records` and referenced the exact QA inventory item.
Provider presentation remained `Limited context answer`, so the broader real-provider gates
stay open. See `FACILITY_INVENTORY_AI_PRODUCTION_EVIDENCE_2026-08-23.md`.

## Nature, Admin and release

| ID   | User story                                                                                                             | Status                                                                                                                                                                                                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-01 | Globe supports zoom/cluster/list/search/filter plus photo/date/description cards and an honest zero-pin state          | implemented; local acceptance passed; populated/live acceptance open                                                                                                                                                                                                             |
| N-02 | Discover shows a compact Nature preview even with zero public pins                                                     | live accepted                                                                                                                                                                                                                                                                    |
| N-03 | Exact/private/sensitive/cannabis location and visibility boundaries hold                                               | implemented; local acceptance passed; public/private live regression open                                                                                                                                                                                                        |
| N-04 | Legacy park records remain private unless individually reviewed and republished; never infer a house or park location  | implemented; local acceptance passed; final-candidate privacy regression open                                                                                                                                                                                                    |
| A-01 | Admin control center exposes accounts, reports, security, moderation, billing/content/system queues and deep links     | populated Harvest system queue and notification-to-closed-moderation exact deep link live accepted; remaining cross-queue/final regression open                                                                                                                                  |
| A-02 | Admin can investigate, assign, note, resolve/reopen and retain audit/account/content context                           | authenticated audited Harvest reconciliation accepted; report/support assignment-resolution-reopen live slice remains open                                                                                                                                                       |
| A-03 | Security issues show severity/tally/details/status/owner/evidence without secrets                                      | implemented; local acceptance passed; Sentry/live acceptance open                                                                                                                                                                                                                |
| A-04 | Emergency and lawful data requests follow documented preservation/escalation/disclosure procedures                     | implemented; local safety acceptance passed; legal operating/live acceptance open                                                                                                                                                                                                |
| A-05 | Free/Pro/Commercial/Facility/Admin sessions, roles, expiry, reload, logout and workspace switching remain isolated     | implemented; local acceptance passed; multi-account/live acceptance open                                                                                                                                                                                                         |
| R-01 | Subscriptions (including gifts), paid courses/products, returns/webhooks/receipts and management work where authorized | implemented; local acceptance passed; production provider/live acceptance open                                                                                                                                                                                                   |
| R-02 | Email/device notifications respect preferences and deliver supported events                                            | implemented; local acceptance passed; email/device live acceptance open                                                                                                                                                                                                          |
| R-03 | Initial crawl, proof-based dead-code cleanup, and final full acceptance pass on new frozen SHAs                        | partial; cleanup, exact-main gates, public/Admin-owned Personal/Commercial/Admin crawl and route-entry matrix passed on frontend `7f758970` / backend `e572552c`; Free, Commercial-owner, Facility Owner/Staff/Viewer, logout/expiry and physical responsive/keyboard chain open |
| R-04 | Independent reviewer suggestions are isolated, itemized and deliberately accepted/rejected                             | open                                                                                                                                                                                                                                                                             |
| R-05 | Owner-directed GrowPathAI-only hat designs/specifications/rights/BLVNK approval and non-sale trials complete           | open; stop gate                                                                                                                                                                                                                                                                  |
| R-06 | App Store and Play Store credentials/builds/smoke/privacy/listing/submission/monitoring complete                       | open                                                                                                                                                                                                                                                                             |

## Frozen Plant ID stories

1. **Identify only:** save the candidate, evidence and uncertainty. Create no grow and no public pin.
2. **Optional grow:** only a usable common identity opens a prefilled draft. The user reviews and saves it. Nature is unchanged.
3. **Optional Nature:** separately add/recover location, date and description; explicitly publish photos and an approximate public point. A Field Study is optional.

Declining either branch leaves the standalone Plant ID intact. Same-day proximity is not
location evidence. The separate house crape myrtle and all potted-house records, including
Dipladenia/Mandevilla, are excluded from the Cary/Maydale publication batch.

## Reconciled evidence and no-rebuild boundaries

These row annotations name what is retained and the one exact gate that remains. They do
not change the statuses above, treat an unrun production action as complete, or create a
second queue. `Production mutation`, `production read-only`, `final-candidate crawl`, and
`optional owner recovery` are action types, not completion states.

R-01 and R-02 local construction evidence and exact remaining gates are retained in
`R01_R02_CANONICAL_LOCAL_EVIDENCE_2026-08-22.md`. Money, gift, notification and data-rights
features must not be rebuilt to satisfy provider or physical-device evidence. Gift checkout
remains fail-closed until the enablement gates in that record pass.

A-01 through A-05 local construction evidence and exact remaining live gates are retained in
`A01_A05_CANONICAL_LOCAL_EVIDENCE_2026-08-22.md`. The backend safety contract is enforced, but
the frontend continues to withhold lawful-request approval/disclosure until the reviewed
operating procedure and production fail-closed evidence exist. Do not rebuild Admin to obtain
populated, provider, authenticated or multi-account evidence.

- **P-03 — retained evidence:** frontend `4829d2ff`, backend `1144dadc`, and ToolRun
  `6a77f67895931a1ea2ab10d9` already prove multi-photo/private-video analysis, server-frame
  extraction, an uncertain saved result, exact-evidence reload, correction provenance, and
  no-grow operation. **Remaining gate:** on the frozen candidate, complete one authorized
  ordinary upload/analyze/save/reload plus back/error/retry path and prove that no Grow,
  Field Study, or public pin is created. **Next action:** production mutation. **Do not
  rebuild:** upload transport, frame extraction, evidence receipts, Saved Runs, or correction.
- **P-04 — retained evidence:** frontend `dbedf296` and Render deploy
  `dep-d9vrbmh42hec739hkcug` prove the reviewed-draft safety boundary; the crop-aware Tomato
  and unmatched-crop setup paths are also live. **Remaining gate:** use an eligible confirmed
  Plant ID to inspect its prefilled source/provenance/lifecycle fields, cancel once with no
  creation, then save, reload, and archive one disposable Grow. **Next action:** production
  mutation and cleanup. **Do not rebuild:** the crop registry, manual crop setup, draft
  navigation, or lifecycle model.
- **P-05 — retained evidence:** the separate Nature draft, required photo, date, description,
  and private-source-location inputs, explicit approximate-pin consent, sensitive-species and
  cannabis boundaries, and withdrawal path are implemented; production already proves the
  disabled-until-complete state and the honest empty globe. **Remaining gate:** publish one
  non-sensitive ordinary observation, reload its Saved Run and public photo/card/pin, then
  withdraw it and verify disappearance after reload. **Next action:** production mutation,
  public read, withdrawal, and cleanup. **Do not rebuild:** direct publication, approximate
  projection, withdrawal, or the optional Field Study boundary.
- **P-06 — retained evidence:** Grow creation and Nature publication are separate, proximity
  inference is forbidden, and the house crape myrtle plus every potted-house record remain
  excluded. **Remaining gate:** before and after the P-05 publication, prove that only the
  explicitly selected observation becomes public and that Grow save, house records, and
  nearby/same-date records remain private. **Next action:** production privacy assertion
  coupled to P-05. **Do not rebuild:** private-by-default storage or the no-inference rules.
- **P-10 — retained evidence:** production now proves the visual timeline,
  Lifecycle/Month/Week/Day views, source links, exact review/cancel, frozen publication,
  public viewing/report/share, cannabis fail-closed behavior, withdrawal and permanent old-link
  invalidation. A real viewer-friendly HTML export also downloaded successfully. Inspection
  found one raw saved-AI JSON payload in that otherwise private-safe file. Frontend merges
  `e3d33b53` and `c32c8676` now apply the shared bounded formatter to the HTML/text export and
  private on-screen preview. Exact Render deployments succeeded, both complete CI jobs passed,
  and the real production package shows a readable private-record handoff with no visible raw
  JSON or `evidenceFingerprint`. **Remaining gate:** ordinary final-candidate regression only,
  including one fresh OS-level download in a download-enabled browser. **Next action:** final
  crawl regression. **Do not rebuild:** event aggregation, visual/zoom controls, source links,
  reviewed public-copy lifecycle or existing export entry points.
- **N-01 — retained evidence:** the production globe, controls, search/review filters, broad
  fallback viewport, compact/public entry points, and honest zero-pin list are accepted.
  **Remaining gate:** reuse the P-05 observation to verify the populated map and list,
  photo/date/description/identity card, search/filter, public viewport, and applicable
  responsive/accessibility states; test clustering only with legitimate density, never
  fabricated records. **Next action:** populated production read plus final-candidate crawl.
  **Do not rebuild:** the globe, map/list runtime, filters, or zero-pin state.
- **N-02 — retained evidence:** the current candidate renders the compact Discover Nature
  globe with zero pins and opens the canonical Nature experience. **Remaining gate:** none;
  its status stays `live accepted`, with only ordinary final-crawl regression coverage.
  **Next action:** final-candidate regression check. **Do not rebuild:** the preview or its
  canonical link; the older duplicate-preview removal is superseded history.
- **N-03 — retained evidence:** exact/private projection, selected public precision,
  sensitive-species handling, cannabis interest/consent, and identity-redaction rules are
  implemented and their pre-publish boundary is live. **Remaining gate:** during P-05 prove
  the exact source point never appears in the public response/card/viewport, the selected
  approximation is honored, and the relevant consent/visibility views do not expose private
  cannabis data. **Next action:** production privacy/security acceptance. **Do not rebuild:**
  the projection or visibility policy.
- **N-04 — retained evidence:** current production has not guessed, merged, or published the
  legacy Cary, Maydale, house, duplicate, or unresolved records. **Remaining gate:** a
  final-candidate read-only privacy regression; individual legacy recovery is an optional,
  owner-triggered action and does not block P-03 through P-06 or future Nature pins. If used,
  each result requires a newest defensible nonduplicate identity and a known place. **Next
  action:** final-candidate read-only check or optional owner recovery. **Do not rebuild:**
  legacy selection, deduplication, uncertainty, or no-location-inference rules.
- **S-05 — retained evidence:** reusable private RTMPS, OBS ingest, signed playback and
  viewer volume, GrowPath chat/overlay, stop, recording-ready replay, retention, and key
  rotation have production evidence and remain accepted. **Remaining gate:** one bounded
  two-account concurrent run proving inputs, keys, chat, playback, stop/replay, limits, and
  cleanup never cross accounts, followed by the final role/load isolation check. **Next
  action:** production concurrency/security acceptance. **Do not rebuild or replace:** the
  Cloudflare/OBS channel, player, chat overlay, lifecycle, stop, or replay architecture.
- **S-05 — preserved historical credential evidence:** on 2026-08-15 the running Render
  process, not merely a masked dashboard field, matched the expected Cloudflare Stream
  credential class and account; a direct create/delete probe succeeded. Production then
  provisioned and cleaned a reusable private OBS channel without consuming ingest minutes,
  and a separate signed-in account failed closed at the exact private-session URL. Frontend
  merge `5c3f9201` and Render deploy `dep-da03lou7bikc73bmgf9g` corrected private-draft
  labeling and kept public sharing hidden until publication after the focused 16/16 Live
  Session packet and full gate passed. This evidence was recovered from superseded PR `#666`
  before that stale PR was retired; it supplements, but does not replace, the remaining
  concurrent two-account isolation gate above.
- **S-01 — 2026-08-23 production read-only increment:** Forum's honest `For You` empty state
  and populated `All Discussions` loaded the retained three-photo QA thread
  `6a5ba41e6459013643be5c24`, its tags, share actions, media, like, report and comment
  composer. The detail comments endpoint returned three visible comments while the feed card
  initially reported four, proving a stale legacy `commentCount`. Production acceptance then
  reproduced self-report controls on the actual Expo Router detail while the first correction
  had reached only the legacy screen. Frontend PR `#756` corrected the canonical route,
  passed full Frontend CI run `32633299388` in 11m22s, and merged as
  `bd2925bf9eb0d4d5f2894c93450fe175fc814d24`; Render deploy
  `dep-da5cmb3l550s738651gg` published that SHA in 2m06s. The retained owner thread now says
  `Your post`, exposes no post self-report, gives each of its three owner comments the
  confirmed `Delete your comment` action, and logs no browser error. Focused route tests 7/7,
  TypeScript and lint also passed locally. No retained comment was deleted during live
  read-only acceptance. Backend PR `#225` and frontend PRs `#758`/`#759` subsequently merged,
  passed their exact-head and merged-SHA gates, and deployed as backend `324d4025` plus
  frontend `ffaee89e`. A disposable owner thread then passed create, comment, validated
  reply, comment edit, post edit, reload, accessible confirmed delete, detail-unavailable and
  feed-removal checks. Exact SHAs, CI runs, Render deploys and cleanup IDs are retained in
  `FORUM_OWNER_LIFECYCLE_LOCAL_EVIDENCE_2026-08-23.md`. **Remaining gate:** use an outside
  account for follow/comment/reply/edit/delete/report and prove Admin/email delivery.
  **Do not rebuild:** feed separation, thread detail, media, sharing, comment composer, owner
  detection or the accepted owner lifecycle.
- **S-01 through S-08 — local acceptance:** these rows now carry `implemented; local
acceptance passed` in the canonical matrix. The frozen Batch 4 candidate passes 143 frontend
  and 154 backend assertions covering Forum/comments, video upload/library/detail, Lives and
  Studio, hosted publication/lifecycle/limits, OBS, GrowPath chat/overlay, signed playback and
  replay, Commercial Lives, courses and ownership, enrollment/payment lifecycle, stable share
  actions, reporting notifications, storage and workspace isolation. **Remaining gates:**
  configured production storage/provider behavior; video upload/playback/comments/premiere;
  the S-05 two-account concurrency/security run; honest outside-provider states; course
  publish/enroll/payment/archive; report-to-Admin/email delivery; and public-link privacy/reload.
  **Next action:** authenticated production/provider acceptance followed by final-candidate
  crawl. **Do not rebuild:** the locally accepted community, media, course, sharing or retained
  Hosted Live/OBS architecture unless a current regression is reproduced.
- **S-02/S-03 — 2026-08-23 production increment:** frontend PR `#751` merged as
  `2ac47ea87c2ce8da230cb5b7230384de14ee7acf` after full frontend CI passed
  (`32627752627`, job `97165635806`) and deployed as Render
  `dep-da5at6jl550s7384vsg0`. Production acceptance confirmed the populated public video,
  direct creator-profile link and creator library, owner storage/library, exact retained
  GrowPath upload, editable metadata, playback, comment surface, and share actions. A
  fabricated creator route reproduced a fail-open API defect: it returned the real creator's
  video because production discovery ignored `ownerId`. Backend PR `#224` was corrected,
  rebased and passed exact-head Backend CI plus the exhaustive 2,973-test/security gate. It
  merged as `7cb1d63b0adca565d01c694638a15e3c8c05c536`, passed main Backend CI run
  `32642310611`, and deployed successfully as Render `dep-da5f9ks9v7es73f5alkg`.
  Production then proved a fabricated owner ID returned an empty video list rather than
  unrelated videos. **Next action:** use a non-owner account for Follow/Following/comment/
  reply/edit/delete/report plus course attach/detach and archive/reopen. **Do not rebuild:**
  the merged creator route, retained video library/editor/player/comments/share surfaces,
  or storage contract.
- **S-03/S-04/S-07 — 2026-08-23 production increment:** the retained draft course
  `QA Provider Media 4d4520bd` proved a privacy-aware YouTube lesson embed, then attached a
  published GrowPath video, loaded its protected playback, detached it without deleting the
  library asset, and was restored to its original provider URL, thumbnail, summary, rights,
  embed, caption and transcript state. A private premiere draft proved create, reload,
  preview, attached-video playback destination, GrowPath chat/OBS-overlay presentation and
  cleanup. Those runs reproduced two truthful-workflow defects: the premiere preview claimed
  no destination beside an attached video, and asynchronous library loading could reset
  unsaved lesson edits. Frontend PR `#753` fixed both defects plus the misleading unfiltered
  zero-session directory message, passed full frontend CI run `32630651823` in 11m38s, and
  merged as `54908d5f0e3203847aac4de113139ee6f19a4b8c`. Render deploy
  `dep-da5brgid0e5s73bh8hd0` published that SHA in 2m14s;
  production `/lives` now correctly states that no sessions are published and directs a
  creator to Live Studio. **Remaining gates:** one state-changing production regression for
  attached-video premiere copy and unsaved course-edit preservation; public publish/replay,
  outside-user course enrollment, payment return and archive/reopen. **Do not rebuild:** the
  accepted provider embed, GrowPath video reuse, protected playback, private premiere or
  empty-directory surfaces.
- **S-06/P-07 — 2026-08-23 production increment:** Saved Tool Runs reopened the newest
  retained four-photo Plant ID result and displayed its low-confidence/unusable-image
  decision, explicit limitations, missing evidence, suggested retakes, source-verification
  boundary, exact evidence asset IDs and eight retained AI inspection views. The live surface
  exposed focused Ask AI, save-to-grow-log, task, archive, forum/share, readable-summary copy,
  rerun-with-saved-evidence, private/device/media/manual location choices, Nature publication,
  notes, map access and per-view View/Save actions. `Copy Summary` reported success and
  `Export inspection evidence` completed the retained-view package without a console error.
  **Remaining gates:** public-link reload/privacy for each public content family and the
  state-changing save/task/share/publish actions under their owning rows. **Do not rebuild:**
  the accepted saved-result, evidence review, inspection-view or export surfaces.

- **P-03/P-06/P-07 — 2026-08-25 ordinary-photo private acceptance:** The owner selected one
  ordinary iPhone JPEG through the production Plant ID picker and explicitly approved only
  this private AI review. The no-grow run completed once and saved ToolRun
  `6a8da60400316df4aa358de3` plus module record `6a8da60400316df4aa358dec` without a blind
  retry. The result retained evidence asset `4e6720b546d91a5587455720`, reported one usable
  image, a medium-confidence Cannabis/Cannabaceae working candidate, no scientific species,
  explicit lookalike/source-verification limits and the missing whole-plant, leaf-underside
  and flower/seed views. Saved Runs reopened the exact record and preserved the candidate,
  limitations, evidence ID, two source-bound 1600 x 1600 AI inspection views, and their
  View/Save/export actions. The saved record explicitly reported `Nature status: Not
  published` and `No device location saved`; publish remained disabled and no grow, Field
  Study, location or public pin was created. **Do not rebuild or spend another credit:** the
  ordinary-photo no-grow result/save/reload and private-location boundary are live accepted.
  Public Nature publish/withdraw remains P-05, and mutations such as correction, follow-up,
  grow/task/forum/share remain under their owning acceptance slices.

- **P-02 — 2026-08-25 crop-aware grow production increment:** Existing QA tomato grow
  `6a86c181e4f8953edcc6ec11` loaded its crop identity, climate-dependent lifecycle summary,
  calendar, plants, journal, tasks, AI Tools, automation, timeline, comparison, integrations,
  report and share entry points under the same grow ID. A temporary private journal record
  created and reloaded on that grow, exposing a real date-only rendering defect: August 25
  displayed as August 24 in America/New_York. Frontend PR `#797` replaced the UTC-derived
  default with local calendar parts, preserved date-only/midnight-UTC calendar values,
  passed the full 11m47s CI suite, merged as
  `844f84eee6b35e3380511fa1079ca137e2caecdf`, and deployed successfully as Render deploy
  `dep-da6qmkbm8hqs738uqlv0` in 2m07s. Production then saved and reloaded August 25 as August
  25. A temporary grow-sourced task created, completed, survived reload as `Done`, retained
  its exact grow source link, and was deleted. The QA grow archived into the explained
  retained-history surface, reduced the active list, restored to the same ID, and recovered
  every route. The post-fix journal appeared as one grow-scoped export row; `Export CSV`
  completed with `CSV download prepared`, and the journal was deleted afterward. The
  integration surface reopened with the same tomato grow selected and truthfully separated
  implemented read-only providers from access-required, contract-pending and gateway-required
  providers without equipment controls. **Do not rebuild:** crop context, journal/task
  persistence, calendar-day handling, archive/restore, timeline/report routes, CSV export and
  the reviewed integration entry are live accepted. **Remaining P-02 slices:** retained-photo
  attachment/reload/export and one authorized real provider or file-import attachment with
  provenance; provider-specific acceptance also remains under F-06/B-05.

- **Non-Harvest closure — 2026-08-25 production increment:** The authenticated
  `admin@growpathai.com` identity explicitly entered Commercial mode and retained a visible
  Platform Administration route while loading brand, storefront, product, course, live,
  campaign, order, analytics and operations entry points. Notification Center displayed the
  saved device/category preferences and two delivered in-app moderation notices; `View Source`
  opened the exact closed Forum moderation case as a focused Admin investigation without a
  mutation. Public Videos showed two accessible creator videos, a truthful zero-result
  Following filter, a playable GrowPath-upload detail, creator link, report/share controls and
  an empty Discussion state. Commercial Discover composed those populated video cards with
  truthful zero-pin Nature and empty Feed/storefront/product/course/live sections. Forum `For
You` truthfully showed no matches while `All Discussions` loaded retained text, photo and
  reply-count records. Account Profile and Billing exposed verified email, workspace/plan,
  brand separation, workspace switching, logout, export/delete and the truthful reason
  cancellation is unavailable for the current trialing/non-cancellable provider state. These
  read-only slices do not close the remaining external comment/follow, provider mutation,
  other-role or multi-account gates.

## Immediate execution order

1. Preserve the completed integrated-candidate Personal, paid-Commercial and Platform-Admin
   read-only evidence. Keep incomplete mutation/provider/role scenarios as explicit open
   slices rather than repeating already-proven route checks.
2. Preserve the accepted P-03 ordinary-photo no-grow run and P-06 private/no-location
   boundary. Close P-05 and N-01/N-03 with a separate public-safe production observation
   using retained-media metadata, authorized device GPS, or a reviewed manual pin. Legacy
   Cary/Maydale recovery is optional and does not block the future workflow.
3. Reconcile every `partial` row against retained evidence; close only live-accepted slices.
   P-10 is live accepted and needs only ordinary final-candidate regression; its visual,
   export, review/cancel/publish/view/withdraw lifecycle must not be rebuilt.
4. Complete only the lightweight business foundations and acceptance boundaries retained in
   B-01 through B-09 for existing GrowPath workflows. Do not reintroduce the removed POS,
   regulator, serialized-recall, forecasting, CRM/ERP/accounting, dynamic-pricing,
   marketplace/payout/tax, or cross-platform analytics projects.
5. Implement and accept every remaining in-scope functional gap. A started item may remain
   open only with its exact dependency, blocker, retained evidence and next action recorded;
   an unfinished implementation is never silently abandoned or treated as complete.
   Complete all non-P-08 rows first. P-08 Deep video review is deliberately parked—not
   removed, hidden or declared complete—and resumes only after those rows close.
6. Return to P-08 and complete its existing canonical live script without rebuilding the
   accepted extraction, quote, durable-operation, memory-bound or Admin-reconciliation work.
7. Run an initial frozen-SHA professional crawl, classify every defect and cleanup candidate,
   then remove only code proven unreachable, superseded or duplicate. Name the superseding
   path; check routes, imports, deep links, providers, workers, webhooks, migrations, fixtures
   and production-data compatibility; use small reversible commits and preserve evidence.
8. Freeze the resulting frontend/backend SHAs and rerun affected gates plus the complete
   route/action, role, security, visual, accessibility, responsive-device and recovery crawl.
   Only this post-cleanup pass is final release evidence.
9. Isolate and deliberately accept or reject independent reviewer suggestions.
10. Pause for owner review and stop before hats; resume with the owner and complete only
    the GrowPathAI collection.
11. Complete App Store and Play Store work last.

# GrowPathAI canonical product acceptance matrix

Updated: 2026-08-21

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
[~] Unified reporting and the Admin control center are deployed as frontend `00f36429` and
backend `ed85270`; signed-in Admin production acceptance remains open and must not cause
a rewrite.
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

| ID   | User story                                                                                                           | Status      |
| ---- | -------------------------------------------------------------------------------------------------------------------- | ----------- |
| P-01 | Home provides a useful mixed feed, active-grow context and frequent actions                                          | partial     |
| P-02 | Create/manage a crop-aware grow with photos, records, tasks, devices/imports, timeline, archive/export               | partial     |
| P-03 | Identify a plant and save its photos/result without requiring a grow, Field Study or public pin                      | partial     |
| P-04 | Optionally open a reviewed create-grow draft from a usable Plant ID; explicit save creates it                        | implemented |
| P-05 | Optionally publish a dated/described/photo-backed, privacy-safe Nature pin; explicit opt-in and withdrawal           | implemented |
| P-06 | House/potted observations remain private; no place is inferred from date or proximity                                | implemented |
| P-07 | AI tools expose evidence, zoom views, uncertainty, missing evidence, follow-ups, save/retry and correct next actions | partial     |
| P-08 | Harvest Readiness works from ordinary phone media with sample ranges and reasons to harvest/wait                     | partial     |
| P-09 | Diagnosis/IPM rank hypotheses, counter-evidence and next checks without false certainty                              | partial     |
| P-10 | Grow timeline is visual, zoomable, private/shareable/exportable and viewer-friendly                                  | partial     |
| P-11 | Profile supports plan/credits, billing/cancel, notifications, theme, export/delete, logout and workspace switch      | partial     |

## Community, media, courses and discovery

| ID   | User story                                                                                                         | Status  |
| ---- | ------------------------------------------------------------------------------------------------------------------ | ------- |
| S-01 | Forum/Q&A supports posts, comments, follows, media, reporting and notifications                                    | partial |
| S-02 | Videos support public/following/library discovery, comments, creators/storefronts and storage usage                | partial |
| S-03 | Video upload/edit/interests/visibility/reuse/course attachment/archive persists                                    | partial |
| S-04 | Lives/Premieres expose upcoming/live/replay, player volume, chat, creator follow/share and honest empty states     | partial |
| S-05 | GrowPath-hosted OBS Live supports reusable private RTMPS, chat overlay, signed playback, stop and replay           | partial |
| S-06 | Lives, videos, AI results, journals, timelines, forum and Nature have appropriate internal/external share actions  | partial |
| S-07 | Courses support deliberate cover/banner hierarchy, lessons/media, edit/publish/archive and paid enrollment returns | partial |
| S-08 | Discover provides useful storefront/course/video/forum/live/Nature previews, filters, links and empty states       | partial |

## Commercial and Facility

| ID   | User story                                                                                                        | Status  |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ------- |
| C-01 | Commercial retains Personal capabilities plus brand tools                                                         | partial |
| C-02 | Brand owner manages storefront identity/media/slug/sections/contact/social/location/publication                   | partial |
| C-03 | Products expose media/inventory/pricing and only lawfully authorized transaction or external-handoff capabilities | partial |
| C-04 | Commercial courses/content/campaigns and analytics work without duplicate navigation                              | partial |
| C-05 | Admin brand can explicitly use Commercial tools while retaining Platform Admin                                    | partial |
| F-01 | Facility Owner sets up rooms/grows/plants/team with role-aware create/edit/import/assignment/audit                | partial |
| F-02 | Assigned staff work links to the required record/action and persists evidence/completion                          | partial |
| F-03 | SOP/compliance supports approve/assign/run/compare/evidence/exceptions and audit history                          | partial |
| F-04 | Facility has the full applicable AI toolset, correct credits/context and role/write gates                         | partial |
| F-05 | Inventory/transfers/reports/logs have correct routes, populated states and exports                                | partial |
| F-06 | Reviewed sensor/controller imports map rooms/history safely and protect API keys                                  | partial |
| F-07 | Owner/admin can reach social/course/storefront tools without polluting staff navigation                           | partial |

## Business operations and AI

See `BUSINESS_OPERATIONS_AI_REQUIREMENTS_2026-08-21.md` for the complete tool
inventory, safety boundaries and mandatory production scenarios.

| ID   | User story                                                                                                    | Status                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| B-01 | Scoped organization/location/role, stable record, import-provenance and audit foundation                      | partially implemented/evidenced through B-02/B-03; dedicated acceptance and live gates open  |
| B-02 | One complete inventory/lot/receiving/movement/hold/consumption/import/export engine reused by B-04 and B-05   | implemented; local acceptance passed; deployment/live acceptance open                        |
| B-03 | Small Business Desk ships price/margin, quote, lead, job, receipt, vendor, cash-flow and Ask AI tools         | implemented; local acceptance passed; deployment/live acceptance open                        |
| B-04 | Horticulture/nursery evidence-aware help, basic care history and fulfillment readiness                        | implemented; local acceptance passed; deployment/live acceptance open                        |
| B-05 | Reviewed device/crop/room/SOP/maintenance intelligence with no autonomous equipment control                   | implemented; combined local acceptance passed; deployment/authenticated live acceptance open |
| B-06 | Creator essentials: approved assets, lives, community, sharing, reporting and moderation                      | implemented; local acceptance passed; provider/live acceptance open                          |
| B-07 | Truthful storefront and external lawful-commerce handoff only; no native payment, tax or promotion automation | implemented; local acceptance passed; regulated provider/live gates open                     |
| B-08 | Evidence, review, idempotency, redaction and audit boundary for every business AI result                      | implemented; cross-cutting local acceptance passed; provider/live acceptance open            |
| B-09 | Realistic multi-tenant/role/import/error/public-sharing business acceptance scenarios                         | implemented; local acceptance passed; final multi-account/live acceptance open               |

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

B-01 is no longer unstarted. The locally accepted B-02 ledger (frontend `1d283450`,
backend `f00d674`) implements authenticated Commercial/Facility workspace scope, role and
field permissions, stable records, reviewed import provenance, idempotent writes and
workspace-scoped audit/export. The active B-03 foundation (frontend authorization
foundation `0539d29a`; backend record/workspace foundation `a364e7e` and durable
provider/credit foundation `2d7a583`) adds own-workspace/selected-Facility authorization,
solo calculators without fabricated Facility/location/approval records, stable
revision/review controls, protected-source provenance, correct AI-credit ownership and
audited/idempotent actions. This is partial implementation and feature-specific local
evidence, not dedicated B-01 acceptance. A frozen B-01 evidence packet, combined
two-organization/two-Facility multi-role acceptance, the B-02 production migration,
exact-SHA deployment, and live isolation/reload/import/approval/credit/audit scenarios
remain open.

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

## Nature, Admin and release

| ID   | User story                                                                                                             | Status                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| N-01 | Globe supports zoom/cluster/list/search/filter plus photo/date/description cards and an honest zero-pin state          | partial                                                                           |
| N-02 | Discover shows a compact Nature preview even with zero public pins                                                     | live accepted                                                                     |
| N-03 | Exact/private/sensitive/cannabis location and visibility boundaries hold                                               | implemented                                                                       |
| N-04 | Legacy park records remain private unless individually reviewed and republished; never infer a house or park location  | implemented                                                                       |
| A-01 | Admin control center exposes accounts, reports, security, moderation, billing/content/system queues and deep links     | implemented; local acceptance passed; populated/live acceptance open              |
| A-02 | Admin can investigate, assign, note, resolve/reopen and retain audit/account/content context                           | implemented; local acceptance passed; authenticated mutation/live acceptance open |
| A-03 | Security issues show severity/tally/details/status/owner/evidence without secrets                                      | implemented; local acceptance passed; Sentry/live acceptance open                 |
| A-04 | Emergency and lawful data requests follow documented preservation/escalation/disclosure procedures                     | implemented; local safety acceptance passed; legal operating/live acceptance open |
| A-05 | Free/Pro/Commercial/Facility/Admin sessions, roles, expiry, reload, logout and workspace switching remain isolated     | implemented; local acceptance passed; multi-account/live acceptance open          |
| R-01 | Subscriptions (including gifts), paid courses/products, returns/webhooks/receipts and management work where authorized | implemented; local acceptance passed; production provider/live acceptance open    |
| R-02 | Email/device notifications respect preferences and deliver supported events                                            | implemented; local acceptance passed; email/device live acceptance open           |
| R-03 | Initial crawl, proof-based dead-code cleanup, and final full acceptance pass on new frozen SHAs                        | open                                                                              |
| R-04 | Independent reviewer suggestions are isolated, itemized and deliberately accepted/rejected                             | open                                                                              |
| R-05 | Owner-directed GrowPathAI-only hat designs/specifications/rights/BLVNK approval and non-sale trials complete           | open; stop gate                                                                   |
| R-06 | App Store and Play Store credentials/builds/smoke/privacy/listing/submission/monitoring complete                       | open                                                                              |

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
- **P-10 — retained evidence:** frontend `e699e5fe` and the current populated 60-event Grow
  prove the visual timeline, Lifecycle/Month/Week/Day views, source links, and export/share
  entry points. **Remaining gate:** persist an export and exercise share review/cancel,
  publish a revocable privacy-safe viewer link, open it as a viewer, withdraw it, and reload
  every state. **Next action:** production mutation, public/private read, and cleanup. **Do
  not rebuild:** event aggregation, visual/zoom controls, source links, or existing export
  and share entry points.
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
- **S-01 through S-08 — local acceptance:** the frozen Batch 4 candidate passes 143 frontend
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

## Immediate execution order

1. Preserve the completed integrated-candidate Personal, paid-Commercial and Platform-Admin
   read-only evidence. Keep incomplete mutation/provider/role scenarios as explicit open
   slices rather than repeating already-proven route checks.
2. Close P-03 through P-06 and N-01/N-03 with a new ordinary production observation using
   retained-media metadata, authorized device GPS, or a reviewed manual pin. Legacy
   Cary/Maydale recovery is optional and does not block the future workflow.
3. Reconcile every `partial` row against retained evidence; close only live-accepted slices.
   P-10 remains explicitly open for persisted export plus share review/cancel/publish/
   withdrawal even though the visual timeline and deep link are live.
4. Complete only the lightweight business foundations and acceptance boundaries retained in
   B-01 through B-09 for existing GrowPath workflows. Do not reintroduce the removed POS,
   regulator, serialized-recall, forecasting, CRM/ERP/accounting, dynamic-pricing,
   marketplace/payout/tax, or cross-platform analytics projects.
5. Implement and accept every remaining in-scope functional gap. A started item may remain
   open only with its exact dependency, blocker, retained evidence and next action recorded;
   an unfinished implementation is never silently abandoned or treated as complete.
6. Run an initial frozen-SHA professional crawl, classify every defect and cleanup candidate,
   then remove only code proven unreachable, superseded or duplicate. Name the superseding
   path; check routes, imports, deep links, providers, workers, webhooks, migrations, fixtures
   and production-data compatibility; use small reversible commits and preserve evidence.
7. Freeze the resulting frontend/backend SHAs and rerun affected gates plus the complete
   route/action, role, security, visual, accessibility, responsive-device and recovery crawl.
   Only this post-cleanup pass is final release evidence.
8. Isolate and deliberately accept or reject independent reviewer suggestions.
9. Pause for owner review and stop before hats; resume with the owner and complete only
   the GrowPathAI collection.
10. Complete App Store and Play Store work last.

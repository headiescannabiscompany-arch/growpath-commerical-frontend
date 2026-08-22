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

| ID   | User story                                                                                                    | Status                                  |
| ---- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| B-01 | Scoped organization/location/role, stable record, import-provenance and audit foundation                      | defined; not started                    |
| B-02 | One complete inventory/lot/receiving/movement/hold/consumption/import/export engine reused by B-04 and B-05   | partial; coherent build/acceptance open |
| B-03 | Small Business Desk ships price/margin, quote, lead, job, receipt, vendor, cash-flow and Ask AI tools         | defined; not started                    |
| B-04 | Horticulture/nursery evidence-aware help, basic care history and fulfillment readiness                        | defined; not started                    |
| B-05 | Reviewed device/crop/room/SOP/maintenance intelligence with no autonomous equipment control                   | partial; business acceptance open       |
| B-06 | Creator essentials: approved assets, lives, community, sharing, reporting and moderation                      | partial; business acceptance open       |
| B-07 | Truthful storefront and external lawful-commerce handoff only; no native payment, tax or promotion automation | partial; regulated gates open           |
| B-08 | Evidence, review, idempotency, redaction and audit boundary for every business AI result                      | defined; cross-cutting acceptance open  |
| B-09 | Realistic multi-tenant/role/import/error/public-sharing business acceptance scenarios                         | defined; final acceptance open          |

Full regulator/POS adapters, serialized recall workflows, advanced forecasting, full CRM/ERP/accounting,
dynamic pricing, marketplace/payout/tax tooling, and cross-platform creator analytics are
**removed from the active roadmap**. They are not completion blockers; the detailed
reconsideration rule is owned by `BUSINESS_OPERATIONS_AI_REQUIREMENTS_2026-08-21.md`.

## Nature, Admin and release

| ID   | User story                                                                                                            | Status        |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ------------- |
| N-01 | Globe supports zoom/cluster/list/search/filter plus photo/date/description cards and an honest zero-pin state         | partial       |
| N-02 | Discover shows a compact Nature preview even with zero public pins                                                    | live accepted |
| N-03 | Exact/private/sensitive/cannabis location and visibility boundaries hold                                              | implemented   |
| N-04 | Legacy park records remain private unless individually reviewed and republished; never infer a house or park location | implemented   |
| A-01 | Admin control center exposes accounts, reports, security, moderation, billing/content/system queues and deep links    | partial       |
| A-02 | Admin can investigate, assign, note, resolve/reopen and retain audit/account/content context                          | partial       |
| A-03 | Security issues show severity/tally/details/status/owner/evidence without secrets                                     | partial       |
| A-04 | Emergency and lawful data requests follow documented preservation/escalation/disclosure procedures                    | partial       |
| A-05 | Free/Pro/Commercial/Facility/Admin sessions, roles, expiry, reload, logout and workspace switching remain isolated    | partial       |
| R-01 | Subscriptions, paid courses/products, returns/webhooks/receipts and management work where authorized                  | open          |
| R-02 | Email/device notifications respect preferences and deliver supported events                                           | partial       |
| R-03 | Final production route/action and visual/accessibility/device crawl passes on frozen SHAs                             | open          |
| R-04 | Independent reviewer suggestions are isolated, itemized and deliberately accepted/rejected                            | open          |
| R-05 | Owner-directed GrowPathAI-only hat designs/specifications/rights/BLVNK approval and non-sale trials complete           | open; stop gate |
| R-06 | App Store and Play Store credentials/builds/smoke/privacy/listing/submission/monitoring complete                      | open          |

## Frozen Plant ID stories

1. **Identify only:** save the candidate, evidence and uncertainty. Create no grow and no public pin.
2. **Optional grow:** only a usable common identity opens a prefilled draft. The user reviews and saves it. Nature is unchanged.
3. **Optional Nature:** separately add/recover location, date and description; explicitly publish photos and an approximate public point. A Field Study is optional.

Declining either branch leaves the standalone Plant ID intact. Same-day proximity is not
location evidence. The separate house crape myrtle and all potted-house records, including
Dipladenia/Mandevilla, are excluded from the Cary/Maydale publication batch.

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
5. Implement the remaining in-scope functional gaps, then run one final frozen-SHA
   professional route/action, visual, accessibility, responsive-device and recovery crawl.
6. Isolate and deliberately accept or reject independent reviewer suggestions.
7. Pause for owner review and stop before hats; resume with the owner and complete only
   the GrowPathAI collection.
8. Complete App Store and Play Store work last.

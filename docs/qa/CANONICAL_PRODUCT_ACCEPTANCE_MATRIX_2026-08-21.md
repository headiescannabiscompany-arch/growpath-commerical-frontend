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
- `CANONICAL_USER_STORY_ACCEPTANCE_2026-08-21.md` defines the acceptance scenarios for
  each matrix ID; it contains no independent status or execution order.
- `CANONICAL_REMAINING_WORK_2026-08-08.md` is the detailed evidence and remainder ledger.
- `USER_REQUEST_LEDGER_2026-08-13.md` preserves request and completion history.
- Method documents in `docs/knowledge/methods` own durable domain behavior; matching
  registries in `src/knowledge` make those rules available to the app.
- Production-evidence documents prove a named slice; they never create a second queue.
- A new request must map to an existing row or add one new row here before implementation.
- A regression reopens only the affected acceptance slice, not the entire product area.

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

## Personal and grow workflows

| ID   | User story                                                                                                           | Status                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| P-01 | Home provides a useful mixed feed, active-grow context and frequent actions                                          | partial                                |
| P-02 | Create/manage a crop-aware grow with photos, records, tasks, devices/imports, timeline, archive/export               | partial                                |
| P-03 | Identify a plant and save its photos/result without requiring a grow, Field Study or public pin                      | partial                                |
| P-04 | Optionally open a reviewed create-grow draft from a usable Plant ID; explicit save creates it                        | implemented; live acceptance open      |
| P-05 | Optionally publish a dated/described/photo-backed, privacy-safe Nature pin; explicit opt-in and withdrawal           | implemented; populated acceptance open |
| P-06 | House/potted observations remain private; no place is inferred from date or proximity                                | defined; park-batch acceptance open    |
| P-07 | AI tools expose evidence, zoom views, uncertainty, missing evidence, follow-ups, save/retry and correct next actions | partial                                |
| P-08 | Harvest Readiness works from ordinary phone media with sample ranges and reasons to harvest/wait                     | partial                                |
| P-09 | Diagnosis/IPM rank hypotheses, counter-evidence and next checks without false certainty                              | partial                                |
| P-10 | Grow timeline is visual, zoomable, private/shareable/exportable and viewer-friendly                                  | production acceptance open             |
| P-11 | Profile supports plan/credits, billing/cancel, notifications, theme, export/delete, logout and workspace switch      | partial                                |

## Community, media, courses and discovery

| ID   | User story                                                                                                         | Status                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| S-01 | Forum/Q&A supports posts, comments, follows, media, reporting and notifications                                    | partial                                          |
| S-02 | Videos support public/following/library discovery, comments, creators/storefronts and storage usage                | partial                                          |
| S-03 | Video upload/edit/interests/visibility/reuse/course attachment/archive persists                                    | owner lifecycle accepted; outside-user loop open |
| S-04 | Lives/Premieres expose upcoming/live/replay, player volume, chat, creator follow/share and honest empty states     | partial                                          |
| S-05 | GrowPath-hosted OBS Live supports reusable private RTMPS, chat overlay, signed playback, stop and replay           | live accepted; concurrency matrix open           |
| S-06 | Lives, videos, AI results, journals, timelines, forum and Nature have appropriate internal/external share actions  | partial                                          |
| S-07 | Courses support deliberate cover/banner hierarchy, lessons/media, edit/publish/archive and paid enrollment returns | partial                                          |
| S-08 | Discover provides useful storefront/course/video/forum/live/Nature previews, filters, links and empty states       | partial                                          |

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

## Nature, Admin and release

| ID   | User story                                                                                                                  | Status                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| N-01 | Globe supports zoom/cluster/list/search/filter plus photo/date/description cards and an honest zero-pin state               | empty accepted; populated open |
| N-02 | Discover shows a compact Nature preview even with zero public pins                                                          | live accepted                  |
| N-03 | Exact/private/sensitive/cannabis location and visibility boundaries hold                                                    | populated proof open           |
| N-04 | Legacy park records use newest non-duplicate reviews, honest uncertainty and known-place coordinates; never house inference | in progress                    |
| A-01 | Admin control center exposes accounts, reports, security, moderation, billing/content/system queues and deep links          | partial                        |
| A-02 | Admin can investigate, assign, note, resolve/reopen and retain audit/account/content context                                | partial                        |
| A-03 | Security issues show severity/tally/details/status/owner/evidence without secrets                                           | partial                        |
| A-04 | Emergency and lawful data requests follow documented preservation/escalation/disclosure procedures                          | operational review open        |
| A-05 | Free/Pro/Commercial/Facility/Admin sessions, roles, expiry, reload, logout and workspace switching remain isolated          | partial                        |
| R-01 | Subscriptions, paid courses/products, returns/webhooks/receipts and management work where authorized                        | open                           |
| R-02 | Email/device notifications respect preferences and deliver supported events                                                 | partial                        |
| R-03 | Final production route/action and visual/accessibility/device crawl passes on frozen SHAs                                   | open                           |
| R-04 | Independent reviewer suggestions are isolated, itemized and deliberately accepted/rejected                                  | open                           |
| R-05 | Hat designs/specifications/rights/BLVNK approval and non-sale trials complete                                               | next-to-last                   |
| R-06 | App Store and Play Store credentials/builds/smoke/privacy/listing/submission/monitoring complete                            | last                           |

## Frozen Plant ID stories

1. **Identify only:** save the candidate, evidence and uncertainty. Create no grow and no public pin.
2. **Optional grow:** only a usable common identity opens a prefilled draft. The user reviews and saves it. Nature is unchanged.
3. **Optional Nature:** separately add/recover location, date and description; explicitly publish photos and an approximate public point. A Field Study is optional.

Declining either branch leaves the standalone Plant ID intact. Same-day proximity is not
location evidence. The separate house crape myrtle and all potted-house records, including
Dipladenia/Mandevilla, are excluded from the Cary/Maydale publication batch.

## Immediate execution order

1. Close P-03 through P-06 and N-04 with Cary/Maydale production evidence.
2. Reconcile every `partial` row against retained evidence; close only live-accepted slices.
3. Implement remaining functional gaps.
4. Run the final frozen-SHA crawl and professional visual/accessibility pass once.
5. Resolve independent review, then hats, then app stores last.

# GrowPathAI Full System TODO

This checklist tracks the current full-system build. Keep it updated before and after every implementation slice.

Legend:

- `[ ]` Not started
- `[~]` Partial or existing foundation needs reconciliation
- `[x]` Verified complete against current definition of done
- `[blocked]` Waiting on external credentials, hardware, source data, or product decision

## Phase 0 - Audit And Guardrails

- [x] Create current implementation audit comparing planned modules to frontend routes, API clients, backend routes, backend models, tests, and docs.
- [x] Convert audit into a machine-readable report and a short markdown report.
- [x] Keep release surface policy: release surfaces visible, beta opt-in only, hidden/planned/disabled not visible.
- [x] Add or update validation so planned modules cannot leak into public navigation.
- [x] Record all module decisions in this TODO and ledger before implementation changes.
- [x] Apply the Facility workspace visual polish standard across Personal, Commercial, public storefront, tools, courses, lives, feed/campaigns, forum, tasks, alerts, and schedule surfaces so all user types feel equally professional.

## Phase 1 - Foundation Contracts

- [x] ToolRun canonical contract.
- [x] ToolRun backend model and `/api/tools` create/list/reload route contract.
- [x] ToolRun update/archive route contract.
- [x] SourceRecord/provenance model.
- [x] Product/Ingredient canonical model, provenance fields, and CRUD/archive route contract.
- [x] Recipe model, provenance fields, nutrient recipe persistence, update, archive, revise, clone, and use route contract.
- [x] Nutrient recipe backend model and `/api/tools/recipes` create/list/revise/clone/use route contract.
- [x] Personal grow/log/task backend CRUD restored from previous backend.
- [x] Grow timeline route restored with grow, plant, log, photo, task, tool, diagnosis, feedback, automation, and telemetry events.
- [x] Task source-object links restored for ToolRun, Diagnosis, and GrowLog sources.
- [x] Photo/media metadata and source links restored for grow logs.
- [x] Crop profile/taxon base model.
- [x] Shared result UI contract and action state machine.
- [x] Ownership tests for grow, plant, task, log, recipe, tool run, diagnosis, telemetry, and integration records.

## Phase 2 - Soil And Nutrient System

- [x] NPK / Nutrient Recipe Calculator.
- [x] Nutrient Release Chemistry.
- [x] Compatibility Checker.
- [x] Nutrient Source Comparison.
- [x] Soil Builder.
- [x] Dry Amendment Mix Builder.
- [x] Topdress Planner.
- [x] pH / EC Range Check.
- [x] Feeding Schedule.
- [x] Product / Ingredient Library UI and backend reconciliation.

## Phase 3 - Plant Diagnosis / IPM / Crop ID

- [x] AI Diagnosis.
- [x] ETGU Diagnosis Rules.
- [x] Grow Log Auto-Tagging approval flow.
- [x] IPM Scout.
- [x] Organism Library.
- [x] Species / Crop Identification.
- [x] Crop Profile Database.
- [x] Treatment and next-check task flow.

## Phase 4 - Genetics / Pheno / Stress / Crop Steering

- [x] Genetics Inventory.
- [x] Pheno Matrix foundation.
- [x] Pheno Hunt Projects.
- [x] Pheno Plant Records.
- [x] Stage Scorecards.
- [x] Stress Testing.
- [x] Crop Steering foundation.
- [x] Keeper / Reject / Retest decisions.
- [x] Breeding lane links.
- [x] Pheno reports.

## Phase 5 - Propagation / Tissue Culture

- [x] Clone Rooting Troubleshooter.
- [x] Tissue Culture Projects.
- [x] TC Batch / Vessel tracking.
- [x] TC SOPs.
- [x] TC Media Recipes.
- [x] TC Contamination Diagnosis.
- [x] TC Storage / Acclimation / Cost tracking.

## Phase 6 - Harvest / Dry / Cure / History

- [x] Harvest Readiness AI.
- [x] Dry / Cure Guard.
- [x] Run-To-Run Comparison.
- [x] Auto Grow Calendar.
- [x] Harvest batch and dry/cure records.
- [x] PDF/export/report surfaces.

## Phase 7 - Business / Production

- [x] Inventory foundation.
- [x] Soil & Nutrient Batch Planner.
- [x] Batch cost calculator.
- [x] Ingredient pull sheets.
- [x] Production task creation.

## Verification Ledger

- [x] Current implementation audit run.
- [x] Backend ownership suite run for ToolRun and NutrientRecipe foundation routes.
- [x] Backend personal workspace CRUD/timeline suite run.
- [x] Frontend route/surface validation run.
- [x] Production render/export verified message observed: `Production web export verified: dist uses https://api.growpathai.com`.
- [x] Release preflight passed after personal backend CRUD/timeline port.
- [x] Soil/nutrient V1 tool backend tests run for pH/EC, Topdress, Dry Amendment Mix, Soil Builder, Nutrient Source Comparison, and Dry/Cure Guard.
- [x] Tool route inventory and frontend runtime contract passed after adding six new personal tool routes.
- [x] Backend tests run for Stress Testing, Clone Rooting, Run-To-Run Comparison, Auto Grow Calendar, Tissue Culture, Soil & Nutrient Batch Planner, and Facility Insights Summary.
- [x] System audit rerun after the next tool slice: 33 modules, 25 partial, 8 present-foundation, 0 missing, 0 trace-only.
- [x] Full surface audit rerun after adding ten personal tool routes: 162 frontend route files, 148 routes, 38 backend route declarations, 0 errors, 0 warnings.
- [x] Backend tests run for IPM Scout, Species/Crop ID, Genetics Inventory, Harvest Readiness, Inventory, Crop Steering Projects, and Pheno Hunt.
- [x] Feature status tests verify these modules are release routes and removed/internal-only tools have no user-facing route.
- [x] Backend CRUD tests run for ToolRun update/archive, ProductIngredient read/update/archive, and NutrientRecipe update/archive.
- [x] Backend provenance schema restored and ingredient/recipe source records verified in tools route tests.
- [x] Crop knowledge backend CRUD added and verified for crop profiles, organisms, regional alerts, taxa, and plant growth profiles.
- [x] Release preflight now includes focused backend route tests for tools and crop knowledge plus the crop knowledge frontend API unit test.
- [x] Tool workflow E2E covered by `e2e/personal-core-loop.spec.ts` and `e2e/toolrun-log-release.spec.ts`; both are now release preflight gates.
- [x] Tool workflow E2E: grow -> tool -> ToolRun -> log -> task -> timeline -> reload.
- [x] Diagnosis workflow E2E: photo -> diagnosis -> accepted tags -> log -> follow-up task.
- [x] Recipe workflow E2E: recipe -> revision -> feeding event -> grow history.
- [x] Production export sanity check.
- [x] Route pollution guard: stale underscored `/home/_personal` and `/home/_facility` route files removed, and `scripts/inventory-ui-routes.cjs` now fails on underscored non-layout files under `src/app`.
- [x] Forum/Q&A route naming guard: `/forum` and `/forum/post/:id` are canonical discussion routes; `/communities` and workspace `community` entry points are documented/tested as Forum/Q&A compatibility/support surfaces, not Feed/Campaigns.
- [x] Personal logs/tasks route contract reconciled: `/home/personal/logs` remains a grow-scoped stale-link redirect, while `/home/personal/tasks` is the functional out-of-nav Task Center/Schedule route.
- [x] AI function count canonicalized: hardened tool-function spec Section 5 now has a generated 44-function / 15-tool inventory and a guard that also blocks the known `cultivarId` typo regression.
- [x] V1 feature/backend matrix quality hardened: every row now carries `rowStatus`, and validation blocks duplicate feature IDs, malformed modes, unexplained duplicate UI routes, and user-visible unknown-mode rows.
- [x] ID policy clarified: API IDs are opaque strings, `_id` is a Mongo/persistence compatibility fallback, and docs now reject UUID-only wording.
- [x] Auth bootstrap route guard hardened: token-present `/api/me` failures render a retryable session error in auth and route-access guards instead of redirecting, silently falling back, or spinning forever.
- [x] Personal grows endpoint canonicalized: `/api/personal/grows` is the list/create/timeline/photo route family, with `/api/grows/:id/entries` left only as explicit legacy entry-helper compatibility.
- [x] AI transport envelope canonicalized: `{ tool, fn, args, context }` with bare `fn` is the current contract, while obsolete `functionName` / `inputs` envelopes are rejected.
- [x] Facility context source locked: production facility context comes from `/api/facility/:facilityId/...` path params, with a guard blocking `X-Facility-Id` style headers.
- [x] Facility STAFF write policy reconciled: STAFF can write tasks and grow logs, while grows/plants/inventory writes are MANAGER+ and privileged facility surfaces remain blocked.
- [x] ToolRun canonical contract guard added: backend model aliases, route DTO normalization, grow ownership, archived filtering, save-log/task source linking, frontend normalization, immutable snapshot fallback, and ToolRun action helpers are validated by `npm run validate:toolrun-contract` and release preflight.
- [x] SourceRecord/provenance contract guard added: citation, license, review dates, commercial/training-use flags, access/review metadata, region/crop scope, confidence, schema embedding, route patching, frontend API types, and backend tests are validated by `npm run validate:source-record-contract` and release preflight.
- [x] Product/Ingredient contract guard added: reusable ingredient model fields, source records, list/detail/create/update/archive route coverage, active filtering, favorite sorting, frontend API helpers, Ingredient Library UI fields, and backend/UI test evidence are validated by `npm run validate:product-ingredient-contract` and release preflight.
- [x] NutrientRecipe contract guard added: recipe model fields, provenance, ownership, list/detail/create/update/archive/revise/clone/use routes, version lineage, use history, frontend API helpers, NPK UI controls, and backend/UI test evidence are validated by `npm run validate:nutrient-recipe-contract` and release preflight.
- [x] Crop profile/taxon contract guard added: plant taxon, crop profile, plant growth profile models, source provenance, curation status, crop environment/nutrition targets, plant growth overlays, route CRUD/archive coverage, frontend API helpers/types, and backend/API tests are validated by `npm run validate:crop-profile-contract` and release preflight.
- [x] Shared result UI/action contract guard added: canonical result sections, copy/reuse/Ask AI actions, pending labels, disabled action state, success/error feedback, AI prompt safety copy, and live feedback region are validated by `npm run validate:tool-result-surface-contract` and release preflight.
- [x] Genetics/pheno/stress/crop-steering contract guard added: ToolRun-backed genetics inventory, pheno hunt, stress testing, and crop steering calculators/routes; durable GrowPath module records; plant growth pheno overlays; Pheno Matrix weighted scoring and growth-profile saves; keeper/retest/stress/steering task flows; and focused backend/UI test evidence are validated by `npm run validate:genetics-pheno-contract` and release preflight.
- [x] Propagation/tissue-culture contract guard added: ToolRun-backed Clone Rooting and Tissue Culture routes/calculators, durable clone/TC module records, clone follow-up schedules, TC batch/vessel/SOP/media/contamination/acclimation/storage/cost tracking, workflow tasks, and focused backend/UI test evidence are validated by `npm run validate:propagation-tc-contract` and release preflight.
- [x] Harvest/dry-cure/history contract guard added: ToolRun-backed Harvest Readiness, Dry/Cure Guard, Run-To-Run Comparison, and Auto Grow Calendar routes/calculators; harvest batch/dry-cure CRUD and timeline events; harvest review and dry/cure batch save actions; next-run/calendar task flows; and CSV export-ready report surfaces are validated by `npm run validate:harvest-history-contract` and release preflight.
- [x] Run-To-Run Comparison depth hardening: removed demo comma-separated run rows and the arbitrary overall score; added an ownership-scoped two-to-five-grow history endpoint, explicit reference/scope/objective selection, matching-unit comparisons, non-synthetic telemetry filtering, missing-evidence reporting, cautious association language, shared Tools/grow workspace UI, and saved log/task actions. Focused frontend, nested-backend, and production-backend database tests pass; full frontend guard and 295 suites / 1,121 tests pass.
- [x] Business/production contract guard added: inventory ownership stays on commercial/facility surfaces while the personal inventory calculator remains backend-only, and Soil & Nutrient Batch Planner cost estimates, margin, ingredient pull sheets, QA/mixing sheets, AI brief, and production task creation are validated by `npm run validate:business-production-contract` and release preflight.
- [x] Visual polish contract guard added: shared radius tokens, shared page/back shells, shared ToolResult surfaces, representative Personal/Commercial/Facility page shells, Feed-vs-Forum visual language, and existing visual/back-route tests are validated by `npm run validate:visual-polish-contract` and release preflight. This guard prevents known polish regressions; final taste review still belongs to human screenshot QA.

## Live / Manual Workflow Acceptance

- [x] Automated deferred workflow gate passed: `npm run verify:deferred-user-checks` runs delivery scan, connected workflow verifier, system audit, email config shape check, recent autonomous workflow tests, and backend tool persistence.
- [x] Production multi-workspace selection now survives direct entry and hard reload. Before frontend PR `#182`, `/account/workspace` and `/account/mode` both returned HTTP 404 because the production export omitted their static fallbacks. Merge `bf46e0c07962bcf45f372c510d8b36d3cdbdee66` deployed Live as `dep-d9he6gn7f7vs738rapc0`; both routes returned HTTP 200, rendered the signed-in Personal/Commercial/Facility choices with zero browser-console errors, and `Manage Commercial Brand` reached the real Commercial dashboard. See `docs/qa/WORKSPACE_SELECTION_PRODUCTION_EVIDENCE_2026-07-24.md`.
- [x] Production Commercial storefront empty-state preview guard passed. Frontend PR `#184` merged as `140e8ec4fa2d19b0bcf14995fae32e2bb9fbaf09` and deployed live as `dep-d9hf82j7uimc73dljipg`; the signed-in Commercial page disabled both public preview actions until a real slug exists, displayed truthful setup guidance, and exposed no `/store/your-brand` link. See `docs/qa/COMMERCIAL_STOREFRONT_EMPTY_STATE_EVIDENCE_2026-07-24.md`.
- [x] Production Commercial Products/Profile placeholder-URL cleanup passed. Frontend PR `#186` merged as `950f70f048112da2140c46c143620e044b362ec5` and deployed live as `dep-d9hfgeks728c73c03rbg`; zero-product Products and blank Profile now explain the saved slug/product requirements and expose neither `your-brand-slug` nor `/products/product-id`. See `docs/qa/COMMERCIAL_STOREFRONT_EMPTY_STATE_EVIDENCE_2026-07-24.md`.
- [x] Local login, email verification UI, forgot/reset password UI, subscription checkout wrapper, course checkout wrapper, public storefront course checkout routing, backend commercial checkout behavior, and backend course behavior have focused passing tests.
- [x] Resend verification UI no longer claims an email was sent when the backend reports `emailSent: false`; support/contact now sends through the backend email route when delivery is configured and still lists direct inboxes as fallback.
- [x] Support/contact page now includes an in-app support email form wired to `POST /api/support/contact`; backend support mail routes to the topic alias and copies `johnc@growpathai.com` by default when email delivery is configured.
- [x] Browser smoke passed for registration through forum-group selection, commercial/facility walkthrough-to-checkout, and the personal grow core loop using `scripts/run-playwright-expo.cjs`.
- [x] Role walkthrough matrix added for personal free, personal pro, commercial free, commercial paid, facility free, and facility paid.
- [x] Gmail-connected verification found live GrowPath reset and verification emails in the connected mailbox.
- [blocked] Transactional email delivery cannot be marked complete from this workspace because production email env is absent locally: `REQUIRE_EMAIL_VERIFICATION`, `EMAIL_PROVIDER`, and `RESEND_API_KEY` were reported missing by `npm run verify:email-delivery-config`.
- [blocked] Live verification/reset email delivery requires the live API backend environment plus Resend verified domain/send logs.
- [x] Support/contact receiving verified live: Resend reports configured delivery and connected Gmail contains delivered GrowPath Support mail, including two real Facility Report Bug submissions from the owner account. Independent outside-user feedback is still zero and remains a field-validation requirement.
- [x] Production Personal Pro saved-photo diagnosis transport, visual context, refinement, writeback, and billing passed: frontend merges through `be65d3aa53094900d5c0bb62ed90be4628699042` preserved selected photos and visual provenance through follow-up, while backend merges through `09a9f7536b57dbbc29d908e7137856a2c42c152d` enforced ownership, kept blank measurements missing, and labeled empty-context photo identity `visual_suggestion`. Seven live diagnosis requests each persisted the exact three-credit deduction (`93 -> 90 -> 87 -> 72`) with zero refunds. Final result/follow-up retained high-confidence `Cannabis` / `Cannabis sativa` without strain inference; exact grow log `6a5f04d84622b8f588e8c10a`, source-linked task `6a5f04e14622b8f588e8c110`, and ToolRuns were reviewed in Journal, while `Unsure` feedback and automation events were reviewed in the full grow Timeline.
- [x] Production Personal Pro IPM structured-scout, GPT-review billing, and connected writeback passed: a truthful no-pest baseline stayed `monitoring_and_differential_needed` with no confirmed organism or pesticide-rate advice. PR `#84` made the one-credit GPT review explicit; ToolRun `6a5f0ce94622b8f588e8c2fb`, uncertain decision, log `6a5f0d204622b8f588e8c310`, and three source-linked tasks persisted. Profile hard reload proved `71 -> 70`, 16 billed requests, and zero refunds. PRs `#85`-`#87` plus the production Render `/home/*` rewrite closed stale reads and deep-route 404s; Journal, Tasks, and full Timeline hard reloads retained the exact July 21 records on final live merge `f72b5fbb7b60371d8994ae306737b58ca30cd4b3`.
- [x] Production Personal Pro IPM saved-photo prefill passed against actual image bytes: backend merge `9ec163618eb22ce6b9e7f16a3f6228fe0237657b` enforced owned/AI-usable evidence and produced visual cannabis/leaf observations; frontend merge `ab71b8404a6dc6e11f5932038d46599a653e6cfa` removed inferred scout counts and unknown placeholders. Final live evidence retained five defensible fields, left counts/history/trap/environment unknowns blank, and persisted the exact disclosed one-credit change `67 -> 66`, 20 billed requests, and zero refunds.
- [x] Production Personal Pro IPM fresh-file upload passed: frontend merge `91ca611e0af6c01571a33410cd3aeb95c9c32970` carries the picker disclosure into an AI-usable evidence record while record-only media remains non-AI-usable by default. Render deploy `dep-d9fmh0h9rddc73cotla0` persisted new evidence `6a5f6a3e9a4ebf90c8c78619`, produced four defensible visual/follow-up fields, left unsupported scout measurements blank, and charged exactly one credit (`66 -> 65`, 21 billed requests, zero refunds).
- [x] Production Personal Pro diagnosis fresh-file transport, exact billing, persistence, feedback, and source reopening passed: evidence `6a5f8deb9a4ebf90c8c78967` reached real pixel analysis; the result produced draft `Cannabis` / `Cannabis sativa` without cultivar inference; ToolRun `6a5f8e039a4ebf90c8c78977`, journal entry `6a5f8e8a9a4ebf90c8c7899f`, and `Unsure` feedback persisted; Profile proved `65 -> 62`, 22 billed requests, and zero refunds. PR `#95` removed silent stage/pattern defaults and separated ranked-candidate confidence, health status, and urgency; merge `2f2cfeeeabe1d1bfcaeafc4a0743cdf28204488b` was live as `dep-d9fp4ssm0tmc73fifr9g` at 11:40 AM ET.
- [x] Production Personal Pro Crop ID photo transport, no-grow behavior, provenance, and billing passed. A genuine cannabis flower returned `Cannabis` / `Cannabis sativa` without cultivar inference; a genuine two-photo roadside plant retained `Mint` as a medium-confidence working candidate while leaving exact species unconfirmed. Backend PRs `#40`/`#41` and frontend PRs `#97`-`#99` are live through backend `54eefe8c5929948e024467bb5b8d16457890bad7` and frontend `8d250dd656a18ef8c1f80715667b7491369906e5`; exact one-credit charges persisted and reopening the corrected Saved Run left Profile at `59 / 100`, 41 credits across 25 billed requests, zero refunds. See `docs/qa/CROP_IDENTIFICATION_PRODUCTION_EVIDENCE_2026-07-21.md`.
- [x] Production API recovery and public commercial-course discovery passed after the final Crop ID hard reload exposed a Render shutdown: `/api/commercial/courses/public` had treated `public` as a Mongo ID and raised an unhandled rejection. Backend PR `#42` passed both CI suites, merged as `76453037a988aef03ea75642cbaad6f3438f0762`, and deployed Live as `dep-d9fqtpu7r5hc7383e7k0`. The exact endpoint then returned HTTP 200, `/health` remained green afterward, and the authenticated Mint ToolRun/Profile retest passed without another charge.
- [~] Production Personal Pro Harvest Readiness release and incomplete-set billing guard passed. Backend PR `#43` merged as `bb0968f3b25d9dd62541cdfb2aff6479f1392be0` and deployed Live as `dep-d9frm7cvikkc73bho5t0`; frontend PR `#102` merged as `8ebf26a9fbe3986ec9c518c76c7471c7d8b379e6` and deployed Live as `dep-d9frnbu8bjmc73e1dkig`. One genuine photo produced the exact `Add 3 more photos` guidance, left Analyze disabled, and preserved `59 / 100`, 41 credits across 25 billed requests, zero refunds. A rightful four-photo top/middle/lower macro plus wider-context set is still required for live provider output, exact deduction, provenance, persistence, and connected writeback. See `docs/qa/HARVEST_READINESS_PRODUCTION_EVIDENCE_2026-07-21.md`.
- [ ] Remaining production diagnosis acceptance requires failed-request refund behavior and independent accuracy review, plus final-SHA exported screenshot/video and broader accessibility coverage. The grow's live Plants page showed `No plants yet`, so absence of a plant selector was expected rather than a hidden-record defect.
- [ ] Production IPM acceptance still requires failed-provider refund proof and independent pest/pathogen accuracy review using owner-approved sources. Saved-grow-photo and fresh-file pixel analysis plus exact photo-prefill billing are complete.
- [blocked] Live paid course/subscription checkout settlement requires Stripe configuration, checkout session creation in the live backend, and webhook-confirmed enrollment/subscription status.
- [blocked] Final all-page/button/workflow acceptance requires the generated browser checklist at `tmp/deferred-user-verification-checklist.md`; automated tests cover representative workflows, not every possible manual click path.
- [deferred-owner-input] Real Owner, Manager, and Staff production-role verification is complete. On frontend `b2469b22`, the Manager reassigned shared task `6a6140ec67a6aeadb8f4a0c9`, Staff completed it with reload persistence, and Owner verified the final record plus both immutable audit events. One real Facility Viewer invitation acceptance, the automatic read-only handoff/forced-authorization production retest, and owner-approved temporary-alias cleanup are parked with the final owner-input pass. The invitation-session repair is already live on frontend `ac58eb4c` and backend `41d50b69`; do not interrupt other actionable verification for this item unless the owner explicitly reopens it.

## App-Wide Tighten / Polish Audit

- [~] Run the two-track user-type verification in `docs/qa/USER_TYPE_LOOP_CLOSURE_MATRIX_2026-07-16.md`: close every persisted/downstream/permission/delivery loop while separately reviewing product polish, Free-plan invitation, and outside-user validation.
  - 2026-07-20 Facility staging evidence: Manager assigned one shared task, Grower completed it, and Scout/Viewer observed the persisted `DONE` state. Role-control, queue-actionability, and local-auth findings were fixed through frontend PRs `#59`-`#62`, with final SHA `c638c9626ac86982b9c5e167616390118b54db3f` live at 8:12 PM ET. Owner final review, forced Viewer 403, exported recording, production-role retest, other user types, and outside-user validation remain open; see `docs/qa/FACILITY_ROLE_LOOP_EVIDENCE_2026-07-20.md`.
  - 2026-07-20/21 Personal Pro production evidence: one provider-backed Ask AI request deducted and persisted exactly one credit (`94 -> 93`) with zero refunds. The invalid current-plan Pro upgrade was removed in frontend PR `#64`; merge `cc822f8dbc242c08279aeb9089628b85010c3c0a` was live-retested at 8:33 PM ET. Frontend PRs `#76`/`#77` and backend PR `#34` later enabled ownership-scoped reuse of real grow photos; the first live OpenAI-backed diagnosis deducted and persisted exactly three credits (`93 -> 90`) with zero refunds. Backend/frontend diagnosis releases through backend `09a9f7536b57dbbc29d908e7137856a2c42c152d` and frontend `be65d3aa53094900d5c0bb62ed90be4628699042` then added visual context, photo-backed follow-up, missing-value safety, and deterministic visual provenance. Seven diagnosis requests persisted exact three-credit deductions to `72 / 100` with 14 billed requests and zero refunds. Final Cannabis identity/follow-up, `Unsure` feedback, log `6a5f04d84622b8f588e8c10a`, and source-linked task `6a5f04e14622b8f588e8c110` persisted. A production IPM Scout no-pest baseline then proved explicit one-credit GPT review billing (`72 -> 71 -> 70` across pre/post-fix runs), cautious insufficient-evidence output, an uncertain decision, log/task-plan writeback, and exact Journal/Tasks/Timeline hard reloads after PRs `#84`-`#87` plus the Render `/home/*` rewrite. Backend merge `9ec163618eb22ce6b9e7f16a3f6228fe0237657b` and frontend merge `ab71b8404a6dc6e11f5932038d46599a653e6cfa` then proved saved-photo pixel analysis, blank unknown scout measurements, and exact one-credit photo-prefill billing (`67 -> 66`, 20 billed requests, zero refunds). Frontend merge `91ca611e0af6c01571a33410cd3aeb95c9c32970` next proved fresh IPM file upload, four defensible fields, blank unsupported measurements, and another exact one-credit charge (`66 -> 65`, 21 billed requests, zero refunds). Diagnosis file upload, failure/refund, exact saved-diagnosis reopening, lifecycle, billing, accessibility, exported video, and independent review stay open; see `docs/qa/PERSONAL_PRO_AI_CREDIT_EVIDENCE_2026-07-20.md` and `docs/qa/IPM_SCOUT_PRODUCTION_EVIDENCE_2026-07-21.md`.
- [x] Remove orphaned fake advertising API shim so Feed/Campaigns cannot silently rely on empty stub ad data.
- [x] Remove developer route-template notation from user-facing commercial profile/product copy.
- [x] Consolidate JS/TS twin modules where practical: `src/api/auth`, `client`, `growlog`, `grows`, `links`, `plants`, `reports`, `subscription`, `tasks`, `team`, plus shared UI/helper twins now report as 0 true duplicate implementations and 15 intentional compatibility wrappers.
- [~] Review every visible app route inventory entry from `tmp/spec/ui-routes.json` for dead buttons, confusing copy, missing back behavior, and unfinished empty states.
- [~] Verify login/session reliability across free, pro, commercial, and facility accounts, including server-down and invalid-token states.
- [~] Verify password reset end to end: request email, open reset link, save password, login with the new password, and clear stale session state.
- [~] Verify email verification end to end: signup/register response, delivered verification email, confirm token route, resend from login/profile, and verified-user login.
- [~] Verify paid course purchase end to end: public course detail, Stripe checkout start, cancel/success return URLs, webhook-confirmed enrollment, course unlock, refund/dispute status.
- [~] Verify subscription checkout end to end: plan pricing, Stripe checkout, cancel/success return URLs, webhook-confirmed entitlement unlock, billing status refresh.
- [~] Verify commercial product checkout end to end: Stripe-ready product Buy CTA, external-only CTA, no fake checkout when setup is missing, order/lead analytics after return/webhook.
- [~] Verify commercial course workflow polish: create/edit, thumbnail/banner/category/grow interests, lessons/modules/media/tasks/products/lives/forum links, publish readiness, storefront display.
- [x] Commercial media workflow polish: product create/detail, course create/detail, marketing ad image, and live thumbnail screens now expose upload, preview, and persisted image save behavior.
- [~] Verify Storefront, Feed/Campaigns, Forum/Q&A, Lives, Orders, Analytics, Product Lines, Batches/Lots, Trials, and Inventory navigation names and hierarchy are clear and not duplicative.
  - 2026-07-24 Feed/Campaigns empty-state polish is live on frontend merge `91125db7a10efadebe94723586c533241c111ab5`: blocked drafts no longer claim to be active, campaign filters use readable and accessible labels, publish blockers remain enforced, and the zero-campaign state was live-retested without creating data. Full real campaign publish, public handoff, event persistence, analytics, and cleanup remain open; see `docs/qa/COMMERCIAL_FEED_DRAFT_SEMANTICS_EVIDENCE_2026-07-24.md`.
- [~] Verify Facility room/onboarding/task/inventory/team/compliance flows with real create/edit/reload behavior and no premature risk copy before useful data exists.
- [x] Verify Personal grow/tools/task/calendar flows, including ToolRun save/reload, create log, create task, timeline/source links, and reload after navigation.
- [~] Run manual visual QA across desktop/mobile for Personal, Commercial, Facility, public store, courses, lives, feed, forum, profile, paywall, login/reset/verify screens.
- [~] Run accessibility QA: keyboard/focus path where web-supported, labels on actionable buttons, contrast, font scaling, and screen-reader names.
- [blocked] Inspect and fix the sibling live backend service for auth/email/Stripe if those route implementations live outside this frontend repo.

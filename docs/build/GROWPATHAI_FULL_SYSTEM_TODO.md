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
- [x] Business/production contract guard added: inventory ownership stays on commercial/facility surfaces while the personal inventory calculator remains backend-only, and Soil & Nutrient Batch Planner cost estimates, margin, ingredient pull sheets, QA/mixing sheets, AI brief, and production task creation are validated by `npm run validate:business-production-contract` and release preflight.
- [x] Visual polish contract guard added: shared radius tokens, shared page/back shells, shared ToolResult surfaces, representative Personal/Commercial/Facility page shells, Feed-vs-Forum visual language, and existing visual/back-route tests are validated by `npm run validate:visual-polish-contract` and release preflight. This guard prevents known polish regressions; final taste review still belongs to human screenshot QA.

## Live / Manual Workflow Acceptance

- [x] Automated deferred workflow gate passed: `npm run verify:deferred-user-checks` runs delivery scan, connected workflow verifier, system audit, email config shape check, recent autonomous workflow tests, and backend tool persistence.
- [x] Local login, email verification UI, forgot/reset password UI, subscription checkout wrapper, course checkout wrapper, public storefront course checkout routing, backend commercial checkout behavior, and backend course behavior have focused passing tests.
- [x] Resend verification UI no longer claims an email was sent when the backend reports `emailSent: false`; support/contact now sends through the backend email route when delivery is configured and still lists direct inboxes as fallback.
- [x] Support/contact page now includes an in-app support email form wired to `POST /api/support/contact`; backend support mail routes to the topic alias and copies `johnc@growpathai.com` by default when email delivery is configured.
- [x] Browser smoke passed for registration through forum-group selection, commercial/facility walkthrough-to-checkout, and the personal grow core loop using `scripts/run-playwright-expo.cjs`.
- [x] Role walkthrough matrix added for personal free, personal pro, commercial free, commercial paid, facility free, and facility paid.
- [x] Gmail-connected verification found live GrowPath reset and verification emails in the connected mailbox.
- [blocked] Transactional email delivery cannot be marked complete from this workspace because production email env is absent locally: `REQUIRE_EMAIL_VERIFICATION`, `EMAIL_PROVIDER`, and `RESEND_API_KEY` were reported missing by `npm run verify:email-delivery-config`.
- [blocked] Live verification/reset email delivery requires the live API backend environment plus Resend verified domain/send logs.
- [x] Support/contact receiving verified live: Resend reports configured delivery and connected Gmail contains delivered GrowPath Support mail, including two real Facility Report Bug submissions from the owner account. Independent outside-user feedback is still zero and remains a field-validation requirement.
- [blocked] Live paid course/subscription checkout settlement requires Stripe configuration, checkout session creation in the live backend, and webhook-confirmed enrollment/subscription status.
- [blocked] Final all-page/button/workflow acceptance requires the generated browser checklist at `tmp/deferred-user-verification-checklist.md`; automated tests cover representative workflows, not every possible manual click path.

## App-Wide Tighten / Polish Audit

- [~] Run the two-track user-type verification in `docs/qa/USER_TYPE_LOOP_CLOSURE_MATRIX_2026-07-16.md`: close every persisted/downstream/permission/delivery loop while separately reviewing product polish, Free-plan invitation, and outside-user validation.
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
- [~] Verify Facility room/onboarding/task/inventory/team/compliance flows with real create/edit/reload behavior and no premature risk copy before useful data exists.
- [x] Verify Personal grow/tools/task/calendar flows, including ToolRun save/reload, create log, create task, timeline/source links, and reload after navigation.
- [~] Run manual visual QA across desktop/mobile for Personal, Commercial, Facility, public store, courses, lives, feed, forum, profile, paywall, login/reset/verify screens.
- [~] Run accessibility QA: keyboard/focus path where web-supported, labels on actionable buttons, contrast, font scaling, and screen-reader names.
- [blocked] Inspect and fix the sibling live backend service for auth/email/Stripe if those route implementations live outside this frontend repo.

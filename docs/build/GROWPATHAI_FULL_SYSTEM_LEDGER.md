# GrowPathAI Full System Build Ledger

Date opened: 2026-07-02

This ledger is the current build source of truth for the full GrowPathAI system. It supersedes treating large modules as vague post-release backlog. Historical docs remain useful for specifications, but this file records current decisions, build order, and evidence.

## Product Decisions

- Logs stay inside Grows. Personal tasks use the shared out-of-nav Task Center/Schedule action layer and must keep source links back to grow, plant, bed, room, batch, harvest, ToolRun, recipe, course, live, forum, alert, sensor, or facility context. Do not create a separate top-level Logs tab or disconnected task system.
- Commercial AI/business helper is out of scope. Do not expose it in UI, release copy, or navigation.
- Facility Insights is allowed only as a simple read-only summary from existing data. Do not build forecasting, labor analytics, yield analytics, financial analytics, or AI business advice under that name.
- Big GrowPathAI systems are in the first serious build scope. Do not fake completion, and do not expose placeholder tools.
- Internal feature status may keep `release`, `beta`, `hidden`, `planned`, and `disabled`, but hidden/planned/disabled surfaces must not be user-visible.
- The Facility workspace visual standard applies to every user type. Personal, Commercial, public storefront, tools, courses, lives, feed/campaigns, forum, tasks, alerts, and schedule surfaces should inherit the same polished operational quality instead of letting Facility be the only visually strong area.

## Definition Of Done For Every Module

- Real data model or explicit reuse of an existing canonical model.
- Real route or screen, with mobile usable UI.
- Real save and reload behavior.
- Ownership enforcement for user, grow, plant, facility, or linked source object.
- ToolRun or module-specific persisted record where relevant.
- Grow log, task, and timeline links where relevant.
- Tests covering validation, ownership, save/reload, and the main result boundary cases.
- No placeholder claims, fake AI, or dead navigation.

## Dependency Order

1. Foundation contracts and models.
2. Soil and nutrient system.
3. Plant diagnosis, IPM, crop ID, and organism knowledge.
4. Genetics, pheno, stress testing, and crop steering.
5. Propagation and tissue culture.
6. Harvest, dry/cure, run history, and calendar planning.
7. Business and production systems.

## Current Repository Reality

Initial audit from 2026-07-02, before the old backend port:

- Frontend has broad API client coverage for grows, plants, logs, tasks, tool runs, products, nutrient recipes, inventory, insights, telemetry, diagnosis, and reports.
- Backend persisted route/model coverage is much narrower: AI call, calendar facility, events, notifications, several models, and selected utilities.
- Existing personal tool routes include VPD, Dew Point Guard, PPFD, bud-rot risk, NPK, nutrient chemistry, watering, environment analysis, feeding schedule, harvest estimator, timeline planner, PDF/export, pheno matrix, crop steering, and integrations.
- Planned personal tool gaps remain for pH/EC range check, topdress planner, dry amendment mix builder, dry/cure guard, soil builder, clone rooting, IPM scout, organism library, species/crop identification, genetics inventory, tissue culture, run comparison, auto grow calendar, and Soil & Nutrient Batch Planner.

Restored from the previous backend on 2026-07-02:

- Personal grow workspace backend routes for plants, grow-scoped logs, grow-scoped tasks, and merged grow timeline.
- Tool backend routes for ToolRun create/list/reload, save-to-log, create-task, nutrient recipes, product ingredients, and nutrient chemistry calculators.
- Canonical backend models for Grow, Plant, GrowLog, Task, ToolRun, NutrientRecipe, ProductIngredient, Diagnosis, DiagnosisFeedback, CropProfile, PlantGrowthProfile, telemetry, automation, and webhook records.
- Service layer for tool calculators, nutrient chemistry, automation events, automation engine, webhook dispatch, stable object ids, and secret encryption helpers.
- This was a port/reconciliation of existing work from `C:\growpathai\growpath-commerical`, not a rewrite from scratch.

## Facility Insights Rule

Build only if it can read existing records and summarize:

- Active grows or batches count.
- Open task count.
- Overdue task count.
- Recent logs count.
- Latest tool runs.
- Latest diagnoses.
- Active alerts or telemetry warnings if those records already exist.

Hide or skip it if it requires deep analytics, prediction, or a new commercial-helper concept.

## Work Log

### 2026-07-09

- Confirmed the current production deploy gate after Render appeared stalled: latest Frontend CI and Production Build Preflight passed on `main`, and live URL verification returned 200 for public policy/support/delete-account pages plus API health/readiness endpoints.
- Added the cross-user visual standard decision: Facility's visual appeal and polish should apply to Personal, Commercial, public storefront, tools, courses, lives, feed/campaigns, forum, tasks, alerts, and schedule surfaces.
- Removed stale underscored `/home/_personal` and `/home/_facility` route files and added a route-inventory guard that fails on any underscored non-layout file under `src/app`, keeping route inventory to canonical visible routes plus Expo `_layout` files.
- Canonicalized Forum/Q&A route naming: `/forum` and `/forum/post/:id` are the discussion routes; `/communities` is only a legacy Forum Directory compatibility route; workspace `community` routes remain Forum/Q&A support surfaces and must not become Feed/Campaigns.
- Canonicalized the AI function inventory: Section 5 of the hardened tool-function spec now validates against `docs/contracts/AI_FUNCTION_INVENTORY.json` with 44 AI functions across 15 tools. The inventory guard is wired into guard and release preflight and blocks the known `cultivarId` spacing typo from returning.
- Hardened the V1 feature/backend matrix quality contract: all 226 rows now carry explicit `rowStatus` labels (`canonical`, `compat_alias`, `deprecated`, `planned`), and validation rejects duplicate feature IDs, malformed modes, unexplained duplicate UI routes, and user-visible `unknown` mode rows.
- Clarified the ID contract: `docs/contracts/ID_POLICY.md` now defines public IDs as opaque strings, keeps `_id` as persistence/compatibility fallback, and requires serializers/clients to normalize to `id` for routes, source links, tasks, ToolRuns, analytics, and audit references.
- Hardened auth bootstrap route behavior: token-present `/api/me` failures now show explicit retry/clear-session actions in `RequireAuth` and protected deep routes instead of redirecting, silently falling back to personal mode, or spinning forever.
- Canonicalized the personal grows endpoint family: frontend route constants and grow-photo helpers use `/api/personal/grows`, backend route tests mount `grows.personal` at `/api/personal/grows`, and the remaining `/api/grows/:id/entries` usage is documented as legacy entry-helper compatibility.
- Canonicalized the AI transport envelope: `{ tool, fn, args, context }` with bare `fn` is the contract; backend normalization rejects `functionName` / `inputs` envelopes and treats fully-qualified `tool.fn` only as compatibility input.
- Locked facility context to path params: production docs/code must use `/api/facility/:facilityId/...` instead of facility-id headers, enforced by `scripts/validate-facility-context.cjs` in the guard chain.
- Reconciled the STAFF write policy: STAFF keeps task and grow-log write access, while core facility grows/plants/inventory writes are MANAGER+ and SOP/compliance/team/settings writes stay privileged.

### 2026-07-02

- Product direction confirmed: full GrowPathAI ecosystem is in scope now, not only small release calculators.
- Top-level Logs and Tasks rejected; they remain Grow workspace concepts.
- Commercial AI/business helper rejected.
- Facility Insights narrowed to simple existing-data summary only.
- Current uncommitted feature-status cleanup retained as aligned with the visibility policy.
- Added a current full-system ledger and TODO.
- Added a repeatable `npm run audit:growpath-system` command that compares planned modules against frontend routes, API clients, backend routes/models, tests, and docs.
- Initial system audit result: 33 modules checked; 5 present foundations, 15 partial, 6 trace-only, 7 missing.
- Production render/export remains a hard pass signal through `npm run release:preflight`, which prints `Production web export verified: dist uses https://api.growpathai.com` when the render build is valid.
- Ran the production web render/export gate directly; it passed and printed `Production web export verified: dist uses https://api.growpathai.com`.
- Added local backend `ToolRun` and `NutrientRecipe` models plus `/api/tools` route contracts for ToolRun create/list/reload and recipe create/list/revise/clone/use.
- Added backend route tests enforcing authenticated ownership for tool runs and recipes.
- Reran full-surface audit: 150 frontend route files, 136 frontend routes, 14 backend route declarations, 0 errors, 0 warnings.
- Found and ported the old full backend personal workspace layer instead of rebuilding it: `backend/routes/personal.js`, `backend/routes/grows.personal.js`, grow/log/task/tool/diagnosis/telemetry/automation models, and supporting services.
- Added backend tests for grow-scoped log CRUD, task CRUD, source linking, and merged grow timeline events.
- Backend verification passed after the port: `npm run test:backend:all` -> 10 suites, 61 tests.
- Full surface audit passed after adding direct `grows.personal` coverage: 150 frontend route files, 136 frontend routes, 37 backend route declarations, 0 errors, 0 warnings.
- Release preflight passed after the port: release scan, full surface audit, route inventory, V1 UI validation, V1 matrix validation, 15 focused Jest suites, 5 Playwright specs, production web export, and store graphics export.
- Production render/export printed the required pass message again: `Production web export verified: dist uses https://api.growpathai.com`.
- Checked current and previous repo history before adding the next soil/nutrient tools. Existing completed implementation found only for NPK/Nutrient Chemistry and a legacy `src/screens/PHECCalculatorScreen.js` that saved old tool usage without grow-context ToolRun/log/task/timeline wiring. Topdress, Dry Amendment Mix, Soil Builder, Dry/Cure Guard, and Nutrient Source Comparison existed as specs/planned rows, not completed Expo Router tools.
- Added V1 backend calculators and `/api/tools` endpoints for pH/EC Range Check, Topdress Planner, Dry Amendment Mix Builder, Dry/Cure Guard, Soil Builder, and Nutrient Source Comparison. All persist as canonical ToolRuns.
- Added shared frontend backend-calculator screen wrapper and six personal tool routes under `/home/personal/tools/*`, using existing ToolResultSurface plus ToolRun-to-log/task actions.
- Updated the feature manifest so these former planned rows are real navigable release routes under the existing nutrient capability, while deeper provenance/inventory/recipe/batch work remains tracked as partial ecosystem work.
- Verification after this slice: focused backend tools test passed with 13 tests, feature status test passed with 7 tests, route inventory reported 156 route files and 142 routes, frontend runtime contract passed, V1 UI surface validation passed, full-surface audit passed with 0 errors and 0 warnings, GrowPathAI system audit moved to partial=20, present-foundation=6, missing=5, trace-only=2.
- Checked current and previous repo history for Stress Testing, Clone Rooting, Run-To-Run Comparison, Auto Grow Calendar, Tissue Culture, Soil & Nutrient Batch Planner, and Facility Insights. Current implementation contained planning docs and partial adjacent foundations, not completed current Expo Router modules for those workflows.
- Added ToolRun-backed V1 routes and calculators for Stress Testing, Clone Rooting, Run-To-Run Comparison, Auto Grow Calendar, Tissue Culture, and Soil & Nutrient Batch Planner.
- Added read-only Facility Insights Summary backend route at `/api/facility/:facilityId/insights/summary`, plus typed frontend API wrapper and dashboard summary consumption. It uses existing data only: grows, tasks, logs, latest tool runs, latest diagnoses, automation alerts, and telemetry warnings.
- Verification after the second tool slice: backend tools/facility insights tests passed with 17 tests, feature status test passed with 7 tests, frontend runtime contract passed with 148 routes, V1 UI surface validation passed, full-surface audit passed with 162 route files, 148 routes, 38 backend route declarations, 0 errors, 0 warnings.
- GrowPathAI system audit after this slice: 33 modules checked; 25 partial, 8 present-foundation, 0 missing, 0 trace-only. Remaining work is depth and CRUD hardening, not absent route surfaces.
- Checked the remaining planned personal systems before wiring them. Current repo had real adjacent foundations for Pheno Matrix and Harvest Estimator, but no completed current Expo Router release routes for IPM Scout, Species/Crop ID, Genetics Inventory, Harvest Readiness AI, Crop Steering Projects, or Pheno Hunt.
- Added ToolRun-backed V1 calculators and personal routes for IPM Scout, Species/Crop ID, Genetics Inventory, Harvest Readiness, Crop Steering Projects, and Pheno Hunt. These reuse the shared ToolRun/log/task/timeline action surface and do not create top-level Logs or Tasks.
- Promoted those systems from planned to release/beta in `featureStatus.ts` with concrete routes and removed the old `/home/personal/tools/crop-steering` scaffold from the user-facing app.
- Added backend tests for the seven new endpoints and updated feature-status tests to verify visible release routes instead of planned placeholders. Focused verification passed: backend tools suite 19 tests, feature status suite 7 tests.
- Added missing CRUD hardening for shared module records: ToolRun update/archive, ProductIngredient read/update/archive, and NutrientRecipe update/archive. The frontend API now supports updating and archiving ToolRuns, listing ToolRuns by module, updating/archiving recipes, and full personal product ingredient CRUD helpers.
- Focused CRUD verification passed in `backend/routes/tools.test.js`: 22 tests covering calculators, ToolRun CRUD, ProductIngredient CRUD, and NutrientRecipe CRUD.
- Added direct saved-recipe update/archive controls to the NPK recipe screen so recipes now support create, update, revise, clone, use, archive, reload, log, task, and ToolRun actions from the UI. Full release preflight passed after this slice and printed `Production web export verified: dist uses https://api.growpathai.com`.
- Restored the missing shared backend provenance schema at `backend/models/schemas/sourceRecord.js` and attached structured `sourceRecords` to ProductIngredient and NutrientRecipe models/routes/API types.
- Expanded the ingredient library UI to capture source name, source type, URL, citation, license, commercial/training use flags, source notes, and confidence. Focused backend tools tests now verify ingredient and recipe source records survive create/update.
- Added backend crop knowledge CRUD for plant taxa, crop profiles, organism profiles, regional alerts, and user-owned plant growth profiles. This wires the existing `/api/crop-knowledge/*` frontend API contract to real backend routes/models instead of leaving those calls frontend-only.
- Added frontend API helpers for crop/organism/taxon/regional-alert/plant-growth update and archive operations. Added backend and frontend tests for crop knowledge CRUD/provenance, and wired the backend crop knowledge route test plus crop knowledge API test into `release:preflight`.
- Added a narrow ToolRun-to-log Playwright release gate at `e2e/toolrun-log-release.spec.ts`, alongside the existing core loop preflight spec. Together they cover grow/plant context, ToolRun creation, task creation, attaching a ToolRun to a log, and timeline reload.
- Added `scripts/validate-toolrun-contract.cjs` and wired it into `guard` plus release preflight. The guard checks backend ToolRun aliases, DTO normalization, grow ownership, archived filtering, save-log/task source linking, frontend normalization, immutable snapshot fallback, and ToolRun action helpers, so the ToolRun canonical contract row is now verified complete.
- Added `scripts/validate-source-record-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies the shared SourceRecord schema, every canonical model embedding it, route patch/create coverage, frontend API types, and backend test evidence for provenance fields including citation, license, review dates, commercial/training-use flags, region/crop scope, and confidence.
- Added `scripts/validate-product-ingredient-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies reusable ingredient model fields, provenance fields, authenticated list/detail/create/update/archive route coverage, active filtering, favorite sorting, frontend API helpers, Ingredient Library UI capture, and backend/UI test evidence.
- Added `scripts/validate-nutrient-recipe-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies recipe persistence, provenance, ownership, active filtering, update/archive, revision lineage, clone lineage, use-count/history behavior, frontend API helpers, NPK UI controls, and backend/UI test evidence. Added backend route coverage for cloning a nutrient recipe and tightened the frontend NutrientRecipe type to expose lineage/archive fields.
- Added `scripts/validate-crop-profile-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies plant taxon, crop profile, and plant growth profile schemas; curation/provenance fields; route CRUD/archive coverage; frontend crop-knowledge API helpers/read shapes; and backend/API test evidence. Added focused backend route coverage for creating, updating, and archiving plant taxa with source provenance.
- Added `scripts/validate-tool-result-surface-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies canonical result sections, copy/reuse/Ask AI standard actions, pending labels, disabled action state, success/error feedback, AI prompt safety copy, and live feedback. Expanded `ToolResultSurface` tests to cover pending, success, and error action states.
- Added owned telemetry and integration backend route contracts plus `scripts/validate-ownership-contract.cjs`, wired into `guard` and release preflight. The guard now verifies grow, plant, log, task, recipe, ToolRun, diagnosis, telemetry, and integration ownership fields/routes/tests; telemetry now has owned source/point endpoints, UbiBot model support, secret redaction, and provider access-required stubs instead of dangling frontend API calls.
- Added `scripts/validate-soil-nutrient-tools-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies ToolRun-backed backend routes/calculators, nutrient chemistry release/compatibility services, frontend tool screens, task/product draft actions, and tests for NPK, Nutrient Release Chemistry, Compatibility Checker, Nutrient Source Comparison, Soil Builder, Dry Amendment Mix Builder, Topdress Planner, pH/EC Range Check, and Feeding Schedule. Bridged `generateSchedule` to `/api/tools/feeding-schedule-review` so the Feeding Schedule screen uses the current ToolRun-backed backend contract instead of a dangling `/api/feeding/schedule` call.
- Added a deterministic ETGU-style diagnosis backend at `/api/diagnose`, `/api/diagnose/analyze`, `/api/diagnose/history`, `/api/diagnose/:id`, `/api/diagnose/:id/feedback`, and `/api/diagnose/provider-status`. Added `scripts/validate-diagnosis-ipm-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies cautious diagnosis language, crop context, evidence/counter-evidence/missing-data, feedback improvement records, IPM scout with GPT verification handoff, species/crop identity confirmation tasks, organism/crop-profile CRUD, and treatment/next-check task flows.
- Added `scripts/validate-genetics-pheno-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies ToolRun-backed genetics inventory, pheno hunt, stress testing, and crop steering calculators/routes; durable GrowPath module records; plant growth pheno overlays; Pheno Matrix weighted scoring and growth-profile saves; keeper/retest/stress/steering task flows; and focused backend/UI tests for the full genetics/pheno/stress/crop-steering block.
- Added TC cost tracking to the Tissue Culture calculator/screen, then added `scripts/validate-propagation-tc-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies ToolRun-backed Clone Rooting and Tissue Culture routes/calculators, durable clone/TC module records, clone follow-up schedules, TC batch/vessel/SOP/media/contamination/acclimation/storage/cost tracking, workflow tasks, and focused backend/UI tests.
- Added `scripts/validate-harvest-history-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies ToolRun-backed Harvest Readiness, Dry/Cure Guard, Run-To-Run Comparison, and Auto Grow Calendar routes/calculators; harvest batch/dry-cure CRUD and timeline events; harvest review and dry/cure batch save actions; next-run/calendar task flows; and CSV export-ready report surfaces.
- Added `scripts/validate-business-production-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies inventory stays on commercial/facility surfaces while the personal inventory calculator remains backend-only, and locks the Soil & Nutrient Batch Planner cost estimate, margin, ingredient pull sheet, QA/mixing sheet, AI brief, and production task flows.
- Added `scripts/validate-visual-polish-contract.cjs` and wired it into `guard` plus release preflight. The guard verifies shared radius tokens, shared page/back shells, shared ToolResult surfaces, representative Personal/Commercial/Facility page shells, Feed-vs-Forum visual language, and existing visual/back-route tests. This is an automated regression contract for the Facility-level polish standard, with final screenshot taste review still reserved for human QA.
- Re-audited the user's explicit login/email/course-pay concern after the release-preflight pass. Focused local verification passed for login/email verification/reset-password UI and API wrappers, subscription/course checkout wrappers, public storefront course checkout routing, backend commercial checkout behavior, and backend course behavior. `npm run verify:deferred-user-checks` also passed after fixing a Prettier violation in `src/api/feeding.js`, covering lint, connected workflow tests, production web export, system audit, 85 workflow test suites, and backend tool persistence tests.
- Corrected the completion boundary: live transactional email delivery is not proven in this workspace because `npm run verify:email-delivery-config` reports missing local production variables (`REQUIRE_EMAIL_VERIFICATION`, `EMAIL_PROVIDER`, `RESEND_API_KEY`), and live Stripe/course-payment settlement is not proven without live backend Stripe configuration plus webhook-confirmed enrollment/subscription status. The generated `tmp/deferred-user-verification-checklist.md` remains the browser/live acceptance checklist.
- Started the app-wide tighten/polish audit requested after the completion challenge. Current frontend scan found and fixed an orphaned fake `src/api/advertising.js` shim plus developer route-template copy leaking into commercial profile/product screens. Post-fix scan reports zero API orphans and no visible route-template leaks in `src/app`, `src/screens`, or `src/components`; remaining route-template hits are test-only assertions.
- Verified current frontend gates after the tighten pass: lint passed, full-surface audit passed with 220 route files / 205 routes / 207 backend declarations / 0 errors / 0 warnings, backend route contract passed, frontend runtime contract passed, V1 UI surface validation passed, focused connected workflow tests passed with 59 suites / 222 tests, and production web export passed with `Production web export verified: dist uses https://api.growpathai.com`.
- Inspected the sibling backend repo at `C:\growpathai\growpath-commerical` because auth/email/course-pay implementation lives there, not only in the frontend wrappers. Focused backend tests passed for auth, email service, payments, payment webhook, subscription, subscription-stripe, subscription surface, and courses: 8 suites / 66 tests. Backend production config check still fails locally because production env vars are absent, including `REQUIRE_EMAIL_VERIFICATION`, `EMAIL_PROVIDER`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, plan price IDs, facility plan price ID, `STRIPE_CONNECT_MODE`, and `PLATFORM_FEE_PERCENT`.
- Fixed the user-reported false email-delivery claim in the frontend: login resend now distinguishes accepted delivery, unknown account-safe responses, and `emailSent: false`; focused Login/Forgot Password/Support tests pass. Support is clarified as alias routing through the user's mail client, not an in-app send action.
- Hardened app-wide scan enforcement: `scripts/full-scan.mjs --strict` now fails release preflight on API orphans, legacy client callers, and banned visible source findings while keeping test-only route-template assertions as report data. `release-preflight.cjs` runs the strict full scan by default, and `tests/release.preflight.test.js` verifies that ordering.
- Consolidated JS/TS twin implementations by moving canonical behavior into TypeScript modules and converting JS files to compatibility re-exports for auth, client, growlog, grows, links, plants, reports, subscription, and tasks. Current full scan reports 0 true JS/TS duplicate implementations, 15 intentional compatibility wrappers, 0 API orphans, 0 legacy client callers, and 0 strict banned findings. Focused verification passed: lint, strict full scan, API wrapper/endpoint/client/resilience suites, auth email API tests, login/support UI tests, and legacy acceptance user-story/dashboard-feed tests.
- Browser workflow smoke passed after the app-wide tighten pass: `node scripts\run-playwright-expo.cjs e2e/register-guilds.spec.ts --reporter=line --workers=1` covered all four account types into forum-group selection; `node scripts\run-playwright-expo.cjs e2e/walkthrough-checkout.spec.ts --reporter=line --workers=1` covered commercial and facility walkthrough-to-checkout flows; `node scripts\run-playwright-expo.cjs e2e/personal-core-loop.spec.ts --reporter=line --workers=1` covered personal grow create/reload/timeline behavior.
- Full release preflight passed after the app-wide tighten pass: release scan, full surface audit, strict full scan, route/runtime/V1/contract validators, focused backend route suites, focused release unit suites, 8 Playwright release specs, production web export, SEO verification, and store graphics export. The harvest/export contract was updated to enforce the current honest copy that CSV is available and PDF output is not exposed as completed.
- Rechecked the email/provider boundary after the user-reported missing message. Frontend `npm run verify:email-delivery-config` still reports missing `REQUIRE_EMAIL_VERIFICATION`, `EMAIL_PROVIDER`, and `RESEND_API_KEY`; sibling backend `node scripts\check-production-config.js` still reports missing production email and Stripe variables. Therefore the code no longer makes a false delivery claim, but live received-email and payment-settlement verification remain blocked until production provider env/logs are available.
- Implemented real support-email submission instead of a mail-client-only support page: frontend `src/app/support.tsx` now posts to `src/api/support.ts`, and the sibling backend has `POST /api/support/contact` mounted at `/api/support`. The backend validates reply/account emails, applies a honeypot, routes by topic alias, sets Reply-To to the requester, and BCCs `johnc@growpathai.com` by default via `SUPPORT_OWNER_EMAIL`. Focused verification passed: frontend Support tests, backend `tests/services/emailService.test.js`, backend `tests/routes/support.test.js`, and backend auth email route tests. Live delivery still depends on `RESEND_API_KEY` and the verified Resend domain being set in production.
- Added a role walkthrough Playwright matrix for personal free, personal pro, commercial free, commercial paid, facility free, and facility paid. The matrix validates no protected-route "Page not found" states, Ask AI visibility, personal diagnosis/photo-log access, commercial product/course/media workflows, facility dashboard/AI/compliance access, and facility selection behavior.
- Fixed `/home/facility` entry routing to wait for resolved entitlements and use `ent.facilityId`, instead of checking raw auth context before entitlement hydration.
- Added real upload/persist/preview controls to commercial product detail, commercial course detail, and commercial lives. Product/course create screens, detail screens, marketing, and lives now all support file-picking images and persist local images through the shared upload helper before save.
- Gmail verification found GrowPath auth email delivery working for reset and verification messages from `noreply@growpathai.com` to the connected mailbox on 2026-07-10. The same mailbox search did not find support/contact delivery to `support@growpathai.com` or `johnc@growpathai.com`, which keeps support-receiving verification open until alias/root MX routing is proven.
- Gmail verification also surfaced Render build-failure notifications for recent frontend commits, including `30859baf`. Local Render-equivalent reproduction passed after a clean `npm ci --cache .npm-cache` and `npm run build`, so the next push should be watched for Render cache/transient failure versus a dashboard-only build log detail.
- Verification after this slice: `npm run lint` passed, focused commercial-paid role walkthrough passed before Playwright server-shutdown timeout, `npm run verify:live-urls` passed, route inventory reported 205 routes / 220 files, frontend runtime contract passed, full-surface audit passed with 0 errors / 0 warnings, and production web export passed with `Production web export verified: dist uses https://api.growpathai.com`.

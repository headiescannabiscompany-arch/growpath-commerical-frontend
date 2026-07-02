# GrowPathAI Full System Build Ledger

Date opened: 2026-07-02

This ledger is the current build source of truth for the full GrowPathAI system. It supersedes treating large modules as vague post-release backlog. Historical docs remain useful for specifications, but this file records current decisions, build order, and evidence.

## Product Decisions

- Logs and Tasks stay inside Grows. A log or task needs grow, plant, bed, room, batch, harvest, or facility context. Do not create top-level Logs or Tasks modules as redirects.
- Commercial AI/business helper is out of scope. Do not expose it in UI, release copy, or navigation.
- Facility Insights is allowed only as a simple read-only summary from existing data. Do not build forecasting, labor analytics, yield analytics, financial analytics, or AI business advice under that name.
- Big GrowPathAI systems are in the first serious build scope. Do not fake completion, and do not expose placeholder tools.
- Internal feature status may keep `release`, `beta`, `hidden`, `planned`, and `disabled`, but hidden/planned/disabled surfaces must not be user-visible.

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
- Planned personal tool gaps remain for pH/EC range check, topdress planner, dry amendment mix builder, dry/cure guard, soil builder, clone rooting, IPM scout, organism library, species/crop identification, genetics inventory, tissue culture, run comparison, auto grow calendar, and Living Soil Labs/batch production.

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

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
- [~] Keep release surface policy: release surfaces visible, beta opt-in only, hidden/planned/disabled not visible.
- [x] Add or update validation so planned modules cannot leak into public navigation.
- [x] Record all module decisions in this TODO and ledger before implementation changes.

## Phase 1 - Foundation Contracts

- [~] ToolRun canonical contract.
- [x] ToolRun backend model and `/api/tools` create/list/reload route contract.
- [x] ToolRun update/archive route contract.
- [~] SourceRecord/provenance model.
- [~] Product/Ingredient canonical model, provenance fields, and CRUD/archive route contract.
- [~] Recipe model, provenance fields, nutrient recipe persistence, update, archive, revise, clone, and use route contract.
- [x] Nutrient recipe backend model and `/api/tools/recipes` create/list/revise/clone/use route contract.
- [x] Personal grow/log/task backend CRUD restored from previous backend.
- [x] Grow timeline route restored with grow, plant, log, photo, task, tool, diagnosis, feedback, automation, and telemetry events.
- [x] Task source-object links restored for ToolRun, Diagnosis, and GrowLog sources.
- [x] Photo/media metadata and source links restored for grow logs.
- [~] Crop profile/taxon base model.
- [~] Shared result UI contract and action state machine.
- [~] Ownership tests for grow, plant, task, log, recipe, tool run, diagnosis, telemetry, and integration records.

## Phase 2 - Soil And Nutrient System

- [~] NPK / Nutrient Recipe Calculator.
- [~] Nutrient Release Chemistry.
- [ ] Compatibility Checker.
- [~] Nutrient Source Comparison.
- [~] Soil Builder.
- [~] Dry Amendment Mix Builder.
- [~] Topdress Planner.
- [~] pH / EC Range Check.
- [~] Feeding Schedule.
- [ ] Product / Ingredient Library UI and backend reconciliation.

## Phase 3 - Plant Diagnosis / IPM / Crop ID

- [~] AI Diagnosis.
- [ ] ETGU Diagnosis Rules.
- [ ] Grow Log Auto-Tagging approval flow.
- [~] IPM Scout.
- [~] Organism Library.
- [~] Species / Crop Identification.
- [~] Crop Profile Database.
- [ ] Treatment and next-check task flow.

## Phase 4 - Genetics / Pheno / Stress / Crop Steering

- [~] Genetics Inventory.
- [~] Pheno Matrix foundation.
- [~] Pheno Hunt Projects.
- [ ] Pheno Plant Records.
- [ ] Stage Scorecards.
- [~] Stress Testing.
- [~] Crop Steering foundation.
- [~] Keeper / Reject / Retest decisions.
- [~] Breeding lane links.
- [~] Pheno reports.

## Phase 5 - Propagation / Tissue Culture

- [~] Clone Rooting Troubleshooter.
- [~] Tissue Culture Projects.
- [~] TC Batch / Vessel tracking.
- [~] TC SOPs.
- [~] TC Media Recipes.
- [~] TC Contamination Diagnosis.
- [~] TC Storage / Acclimation / Cost tracking.

## Phase 6 - Harvest / Dry / Cure / History

- [~] Harvest Readiness AI.
- [~] Dry / Cure Guard.
- [~] Run-To-Run Comparison.
- [~] Auto Grow Calendar.
- [ ] Harvest batch and dry/cure records.
- [~] PDF/export/report surfaces.

## Phase 7 - Business / Production

- [~] Inventory foundation.
- [~] Soil & Nutrient Batch Planner.
- [~] Batch cost calculator.
- [~] Ingredient pull sheets.
- [~] Production task creation.

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
- [ ] Production export sanity check.

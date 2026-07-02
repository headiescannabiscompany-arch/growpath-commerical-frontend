# GrowPathAI Full System TODO

This checklist tracks the current full-system build. Keep it updated before and after every implementation slice.

Legend:

- `[ ]` Not started
- `[~]` Partial or existing foundation needs reconciliation
- `[x]` Verified complete against current definition of done
- `[blocked]` Waiting on external credentials, hardware, source data, or product decision

## Phase 0 - Audit And Guardrails

- [ ] Create current implementation audit comparing planned modules to frontend routes, API clients, backend routes, backend models, tests, and docs.
- [ ] Convert audit into a machine-readable report and a short markdown report.
- [~] Keep release surface policy: release surfaces visible, beta opt-in only, hidden/planned/disabled not visible.
- [ ] Add or update validation so planned modules cannot leak into public navigation.
- [ ] Record all module decisions in this TODO and ledger before implementation changes.

## Phase 1 - Foundation Contracts

- [~] ToolRun canonical contract.
- [x] ToolRun backend model and `/api/tools` create/list/reload route contract.
- [ ] SourceRecord/provenance model.
- [ ] Product/Ingredient canonical model.
- [~] Recipe model and nutrient recipe persistence.
- [x] Nutrient recipe backend model and `/api/tools/recipes` create/list/revise/clone/use route contract.
- [ ] Timeline event schema and route.
- [ ] Task source-object links.
- [ ] Photo/media metadata and source links.
- [ ] Crop profile/taxon base model.
- [ ] Shared result UI contract and action state machine.
- [ ] Ownership tests for grow, plant, task, log, recipe, tool run, diagnosis, telemetry, and integration records.

## Phase 2 - Soil And Nutrient System

- [~] NPK / Nutrient Recipe Calculator.
- [~] Nutrient Release Chemistry.
- [ ] Compatibility Checker.
- [ ] Nutrient Source Comparison.
- [ ] Soil Builder.
- [ ] Dry Amendment Mix Builder.
- [ ] Topdress Planner.
- [ ] pH / EC Range Check.
- [~] Feeding Schedule.
- [ ] Product / Ingredient Library UI and backend reconciliation.

## Phase 3 - Plant Diagnosis / IPM / Crop ID

- [~] AI Diagnosis.
- [ ] ETGU Diagnosis Rules.
- [ ] Grow Log Auto-Tagging approval flow.
- [ ] IPM Scout.
- [ ] Organism Library.
- [ ] Species / Crop Identification.
- [ ] Crop Profile Database.
- [ ] Treatment and next-check task flow.

## Phase 4 - Genetics / Pheno / Stress / Crop Steering

- [ ] Genetics Inventory.
- [~] Pheno Matrix foundation.
- [ ] Pheno Hunt Projects.
- [ ] Pheno Plant Records.
- [ ] Stage Scorecards.
- [ ] Stress Testing.
- [~] Crop Steering foundation.
- [ ] Keeper / Reject / Retest decisions.
- [ ] Breeding lane links.
- [ ] Pheno reports.

## Phase 5 - Propagation / Tissue Culture

- [ ] Clone Rooting Troubleshooter.
- [ ] Tissue Culture Projects.
- [ ] TC Batch / Vessel tracking.
- [ ] TC SOPs.
- [ ] TC Media Recipes.
- [ ] TC Contamination Diagnosis.
- [ ] TC Storage / Acclimation / Cost tracking.

## Phase 6 - Harvest / Dry / Cure / History

- [ ] Harvest Readiness AI.
- [ ] Dry / Cure Guard.
- [ ] Run-To-Run Comparison.
- [ ] Auto Grow Calendar.
- [ ] Harvest batch and dry/cure records.
- [~] PDF/export/report surfaces.

## Phase 7 - Business / Production

- [~] Inventory foundation.
- [ ] Living Soil Labs / Batch Production.
- [ ] Batch cost calculator.
- [ ] Ingredient pull sheets.
- [ ] Production task creation.

## Verification Ledger

- [x] Current implementation audit run.
- [x] Backend ownership suite run for ToolRun and NutrientRecipe foundation routes.
- [x] Frontend route/surface validation run.
- [x] Production render/export verified message observed: `Production web export verified: dist uses https://api.growpathai.com`.
- [ ] Tool workflow E2E: grow -> tool -> ToolRun -> log -> task -> timeline -> reload.
- [ ] Diagnosis workflow E2E: photo -> diagnosis -> accepted tags -> log -> follow-up task.
- [ ] Recipe workflow E2E: recipe -> revision -> feeding event -> grow history.
- [ ] Production export sanity check.

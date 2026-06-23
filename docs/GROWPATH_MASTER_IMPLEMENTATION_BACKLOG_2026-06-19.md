# GrowPathAI Master Implementation Backlog

Date: 2026-06-19  
Scope: Personal grow operating system, cultivation tools, nutrient chemistry, ETGU diagnosis, genetics, tissue culture, crop steering, stress testing, integrations, and later commercial capabilities.

## 1. Purpose and Status Rules

This document converts the supplied product plans into one dependency-ordered engineering backlog. It distinguishes working behavior from scaffolds and ideas.

Status definitions:

- **Working foundation**: implemented and useful, but may still lack full workflow coverage.
- **Partial**: meaningful logic exists, but required inputs, persistence, UI, or validation are incomplete.
- **Scaffold**: route, model, screen, or form exists without the planned domain behavior.
- **Not built**: no production implementation found.
- **Vendor blocked**: implementation depends on credentials, hardware, a customer tenant, or a signed API agreement.
- **Do not market complete**: acceptance criteria in this document have not been met.

The previous `GROWPATH_PRODUCT_VERIFICATION_2026-06-19.md` is historical. It predates recent ToolRun, recipe, ingredient, diagnosis, log, and task work. Re-run the acceptance audit instead of reusing its completion percentage.

## 2. Current Reality

### 2.1 Working foundations

- Grow-linked `ToolRun` records with inputs/outputs, warnings, recommendations, confidence, optional plant, log, task, recipe, and integration links.
- Personal grow logs and personal tasks have backend CRUD paths.
- VPD calculator includes leaf-temperature offset, stage target, status, recommendations, and log/task actions.
- PPFD/DLI calculation uses measured PPFD and target DLI, but fixture modeling remains incomplete.
- Dew Point Guard has the strongest environmental workflow foundation.
- Watering and bud-rot tools have usable heuristic logic, but are not validated predictive models.
- NPK recipe calculator supports up to 20 rows, elemental P/K conversion, macro/micronutrient totals, batch math, release metadata, and log/task actions.
- Product/ingredient and nutrient recipe persistence exist, including recipe revisions, clone, and feeding-event recording.
- Nutrient chemistry/release logic and a starter ingredient library exist.
- OpenAI image diagnosis uses structured output when configured with a valid key.
- Integration connection storage encrypts credentials and supports provider registry, connection drafts, tests, device listing, and access-request drafts.
- Pulse is the only implemented provider adapter.

### 2.2 Partial or misleading surfaces

- AI diagnosis is real only for the configured vision endpoint. The heuristic endpoint and legacy route still exist and can be mistaken for equivalent diagnosis.
- The current diagnosis schema does not yet implement the complete ETGU pattern/root-zone/environment/numbers workflow.
- Nutrient release estimates are generalized. They are not a laboratory model and need source attribution, uncertainty ranges, and product-specific overrides.
- NPK chemistry handles guaranteed-analysis math, but EC cannot be accurately predicted from label percentages alone.
- VPD, PPFD/DLI, Dew Point Guard, watering, and bud-rot results do not yet share one fully standardized result component and action state machine.
- The pheno matrix backend stores generic string tables. It is not the structured pheno-hunt system described in the specification.
- Crop steering is still a prototype/scaffold.
- Integration setup uses a generic secret field and cannot represent provider-specific authentication or device-to-grow mappings well.
- Telemetry storage currently requires temperature, RH, and dew point, which prevents valid EC-only, soil-moisture-only, power, device-state, and irrigation records.

### 2.3 Not built as specified

- Soil Builder, Dry Amendment Mix Builder, Topdress Planner, complete Soil/Medium tool, and safe product-specific pH/EC adjustment.
- Grow-aware AI assistant, full log auto-tag approval workflow, harvest readiness AI, and AI tool-result explanations.
- Clone troubleshooter, IPM Scout, Dry/Cure Guard, run comparison, and automatic grow calendar.
- Structured pheno hunting, breeding lanes, genetics inventory, terpene target tools, lab/COA workflows, and Triple Bag gate engine.
- Tissue culture projects, vessels, media recipes, diagnosis, storage, acclimation, cost, and analytics.
- Full crop-steering projects, P0/P1/P2/P3 tracking, control-group stress trials, stop conditions, and pheno score integration.
- Living Soil Labs production costing, general inventory, and seed inventory.
- Provider adapters beyond Pulse.

## 3. Non-Negotiable Architecture

### 3.1 Canonical ownership and links

Every user-generated domain object must store `userId`. Grow-specific objects must store `growId`; `plantId` is optional where appropriate. IDs should use one consistent database type instead of mixing Mongo ObjectIds and strings without validation.

Every tool and AI result must support this chain:

1. Select grow and optional plant.
2. Run calculation or analysis.
3. Persist an immutable `ToolRun`.
4. Save or link a grow log.
5. Create or link a task.
6. Link a reusable recipe when applicable.
7. Reopen the result from grow history.
8. Explain the result with grow-aware AI.

### 3.2 Canonical ToolRun contract

Required cleanup:

- Pick canonical fields: `userId`, `growId`, `plantId`, `toolType`, `inputs`, `outputs`.
- Keep aliases only during a documented migration; remove duplicate `user`/`userId`, `params`/`input`, and `result`/`output` contracts afterward.
- Add `schemaVersion`, `calculatorVersion`, `sourceType`, and `sourceObjectId`.
- Store `warnings`, `recommendations`, structured `confidence`, and provenance.
- Add immutable result snapshots so later calculator changes do not rewrite history.
- Enforce grow ownership before saving log/task links.
- Add idempotency keys for feeding events, imports, and provider syncs.

### 3.3 Shared result UI

Build one reusable result surface with:

- Status and primary numbers.
- Why it matters.
- Warnings with severity.
- Recommendations and uncertainty.
- Formula, source, and calculator version.
- Save to Grow Log, Create Task, Ask AI, Copy Result, Save Recipe, and Reuse.
- Loading, retry, offline, empty, permission, and already-saved states.
- Accessible labels, keyboard operation, responsive layout, and no nested cards.

### 3.4 Shared domain services

Create reusable services instead of duplicating logic in screens:

- Unit conversion and significant-figure rules.
- Formula validation and input schemas.
- Tool-run persistence and source-linking.
- Task/log creation from any source object.
- Provenance and confidence representation.
- Product and ingredient lookup.
- Nutrient chemistry and release estimates.
- Telemetry normalization and unit conversion.
- AI context assembly with strict tenant ownership.

## 4. P0 Foundation Backlog

Complete these before adding more tools.

### P0.1 Truth and route cleanup

- Inventory all personal tabs, legacy routes, hidden screens, and duplicate APIs.
- Remove or clearly label deterministic/fake AI paths; never return a healthy diagnosis as a silent fallback.
- Make all unavailable features gated or hidden rather than dead tabs.
- Add a feature manifest with `implemented`, `beta`, `coming_soon`, and plan entitlement states.
- Add API route contract tests to prevent personal journal/task 404 regressions.
- Restart and smoke-test the deployed backend after route/model changes.

### P0.2 Security and privacy

- Validate authorization on every grow, plant, log, task, recipe, diagnosis, telemetry source, and integration connection.
- Keep provider secrets encrypted at rest and redacted from every response/log.
- Add secret rotation and connection deletion behavior.
- Add upload MIME sniffing, size limits, malware workflow, retention policy, and signed media URLs.
- Add audit events for integration connections, exports, AI requests, and facility actions.
- Define user consent for using photos or grow records for model improvement; default to no training reuse.
- Add data export and account deletion workflows.
- Add rate limits and abuse controls to AI, uploads, auth, telemetry import, and webhook endpoints.

### P0.3 Data migrations and indexes

- Normalize ToolRun field names and backfill existing rows.
- Add compound indexes for user/grow/date on logs, tasks, diagnoses, recipes, tool runs, and telemetry.
- Add schema versions and migration scripts for recipes, ingredient facts, diagnosis results, and telemetry.
- Add soft-delete/archive semantics where history must remain referentially intact.
- Add unique provider event identifiers to prevent duplicate telemetry and webhook ingestion.

### P0.4 Testing baseline

- Unit tests for calculators and release rules at boundary values.
- API ownership, validation, idempotency, and linked-object tests.
- End-to-end test: grow -> tool -> ToolRun -> log -> task -> timeline.
- End-to-end test: photo -> diagnosis -> accepted tags -> log -> follow-up task.
- End-to-end test: recipe -> revision -> feeding event -> grow history.
- Mobile and desktop visual checks for personal navigation and every shared result state.
- Corruption scans and export sanity checks required by `AGENTS.md` when registry access is unavailable.

## 5. Personal Grow Operating System

### 5.1 Home dashboard - Partial

- Query active grows, stage/day, recent log/photo, open tasks, latest ToolRun/diagnosis, and telemetry warning.
- Add quick actions with grow preselection.
- Handle no-grow, archived-grow, disconnected-telemetry, and overdue-task states.
- Do not use Home as a marketing page.
- Acceptance: data refreshes after creating a log/task/tool run without a full restart.

### 5.2 Grows, plants, journal, photos, tasks - Partial

- Implement Grow workspace sections: Overview, Plants, Journal, Photos, Tasks, Tools, AI Insights, Diagnoses, Feeding/Watering, Environment, Harvest.
- Add plant archive, stage transition, cultivar identity, and source lineage.
- Store photo metadata, stage, plant association, capture time, and consent.
- Add task completion, snooze, recurrence, reminders, and source-object links.
- Add timeline query that merges logs, feedings, diagnoses, tools, photos, and stage changes.
- Acceptance: every saved tool/AI result is discoverable from its grow and source plant.

### 5.3 Harvest and final summary - Not built

- Model harvest batches, wet/dry weights, trim, dry/cure records, quality notes, and lab results.
- Generate an evidence-linked grow summary rather than free text only.
- Support export with photos, timeline, inputs, outcomes, and caveats.

### 5.4 Community/Learn/Profile - Partial

- Fix feed/following reliability before recommendations.
- Allow sharing a sanitized log/grow update without leaking private grow data.
- Add moderation, reporting, visibility, and deletion rules.
- Hide Courses until real course/lesson/progress data and content exist.
- Make profile show account mode, plan, privacy, units, notification settings, and integration status.

## 6. Environment and Irrigation Tools

### 6.1 VPD - Working foundation

- Accept direct leaf temperature and offset, with explicit precedence.
- Version and cite stage target presets; allow user targets.
- Add measurement timestamp and source: manual, sensor, or imported.
- Test Fahrenheit/Celsius parity and saturation formula boundaries.
- Complete when result, log/task actions, history, AI explanation, and telemetry prefill all work.

### 6.2 Dew Point Guard - Working foundation

- Add time-series charts, risk-window persistence, alerts, and acknowledgement.
- Join sensor readings by timestamp and preserve source quality.
- Create inspection tasks from sustained risk, not one noisy sample.
- Add provider adapters and grow/device mapping.
- Validate CSV timezone, units, missing values, duplicates, and out-of-order rows.

### 6.3 PPFD/DLI - Partial

- Distinguish measured PPFD from estimated fixture output.
- Add canopy-area sampling and multi-point averages.
- Do not infer PPFD accurately from watts without fixture efficacy/distribution data.
- Add fixture profile, dimmer, distance, canopy area, and confidence when estimates are used.
- Add stage/user targets, current-vs-target status, warnings, history, and telemetry import.

### 6.4 Watering Planner - Partial heuristic

- Add plant size, medium water-holding behavior, indoor/outdoor, history, runoff, dryback, substrate moisture, and telemetry.
- Learn from actual watering events only after enough history; show why a recommendation changed.
- Separate volume estimate from timing estimate.
- Add conservative bounds and “inspect plant/pot” guidance.
- Validate independently by medium; never market as an irrigation prescription.

### 6.5 Bud Rot Risk - Partial heuristic

- Add wet-duration windows, dew-point spread, stage/flower day, canopy/bud density, airflow, defoliation, and telemetry history.
- Expose risk drivers and missing data.
- Calibrate and version thresholds; do not call the score predictive until validated.
- Generate inspection tasks, not pesticide directions.

### 6.6 Crop Steering - Scaffold

- Implement project/run models and P0/P1/P2/P3 records.
- Track substrate volume, water content, dryback, shots, timing, runoff, pore/substrate/input EC, pH, VPD, PPFD/DLI, and plant response.
- Use medium-specific configurable thresholds with provenance.
- Label outputs as steering signals, not guaranteed plant outcomes.
- Add charts, compare-to-baseline, compare-to-control, tasks, reports, and grow history.
- Gate advanced steering from beginners until required measurements are supplied.

## 7. Soil, Nutrient, and Chemistry System

### 7.1 Product/Ingredient Library - Working foundation

- Add manufacturer, SKU, region, label image, guaranteed analysis, density, batch/lot, and expiry.
- Store nutrient forms separately from elemental totals.
- Add source records: manufacturer label, extension source, laboratory result, user estimate.
- Require source URL/document, retrieved date, jurisdiction, confidence, and reviewer status for “verified” facts.
- Allow user overrides without overwriting canonical facts.
- Add change history and ingredient merge/deduplication.
- Remove unsupported “extension-backed” claims until a source is attached.

### 7.2 Nutrient Chemistry and Release Engine - Partial

- Represent nitrate, ammonium, urea, organic N, phosphate forms, sulfate, carbonate, chloride, chelates, and mineral/organic matrices.
- Track solubility, mobility, pH effect, salinity/EC risk, counter-ions, release mechanism, and compatibility.
- Store release as an uncertain distribution/range, not one exact day.
- Modify release by temperature, moisture, pH, particle size, placement, microbial context, C:N, CEC, and application method.
- Separate immediate dissolved availability from biological mineralization and long-term weathering.
- Add stage/harvest timing warnings and “too late for this run” output.
- Add confidence and evidence per nutrient form, not just per ingredient.
- Add tests for invalid/missing chemistry and contradictory source records.

Important limitation: breakdown time cannot be derived from N-P-K alone. Product composition, physical form, manufacturing process, environment, and application method are required. The engine must communicate uncertainty rather than invent precision.

### 7.3 Advanced NPK/Feed Recipe - Working foundation, not complete

- Preserve 20 product rows, guaranteed-analysis conversion, batch/per-unit math, recipe revisions, and feeding logs.
- Add nitrate/ammonium/urea/organic-N breakdown.
- Add micronutrient forms and chelate pH-stability warnings.
- Add water baseline analysis so source-water Ca/Mg/alkalinity/sodium/chloride can be included.
- Add stock-concentrate versus final-tank modes and A/B precipitation checks.
- Add explicit mixing sequence generated from product chemistry.
- Treat EC as measured unless a product-specific conductivity model has been validated.
- Add target profiles as user-configurable references, not universal cannabis prescriptions.
- Add recipe comparison, cost, inventory availability, label import/review, and outcome tracking.

### 7.4 Soil Builder - Not built

- Model bases, composts, aeration, minerals, amendments, batch volume, bulk density, and cost.
- Implement Penny Saver, 1/3 living-soil, no-till, and custom presets as editable recipes.
- Enforce ingredient locks/exclusions and explain unmet constraints.
- Calculate gallons, liters, cubic feet, bag counts, mass/volume uncertainty, dose per gallon/ft3, and estimated chemistry.
- Add cook/conditioning timeline based on recipe and conditions.
- Add mix, cook, inspect, and transplant tasks.
- Validate that volume percentages sum correctly and bulk-density conversions are labeled approximate.

### 7.5 Dry Amendment Mix Builder - Not built

- Use constrained optimization to approach a target ratio while honoring lock/exclude/min/max rules.
- Show achieved nutrient analysis, absolute nutrient mass, and deviation from target.
- Use ingredient-specific bulk density for cups/tbsp/tsp and label volume conversions approximate.
- Integrate release timing, C:N immobilization risk, pH effects, salts, and antagonism.
- Prevent the optimizer from creating agronomically unreasonable mixes merely to match a ratio.

### 7.6 Topdress/Re-amend and Timing Planner - Not built

- Link soil volume, plant count, stage, last application, recipe, dose, mulch, watering, and expected harvest.
- Show availability windows: immediate, 1-2 weeks, 2-6 weeks, 6+ weeks, next cycle.
- Add “fast correction vs soil building” intent flow.
- Create application, watering, and follow-up inspection tasks.
- Record actual use and outcome for later comparison.

### 7.7 Soil/Medium and pH/EC tools - Not built as specified

- Add medium type, pot count/volume, reuse, prior issues, water-holding behavior, pH/EC context, and amendment capacity.
- Separate soil, living soil, coco, peat, hydro, and outdoor workflows.
- pH adjustment must require product concentration/titration data for dose estimates.
- Without product-specific titration, output only difference, conservative procedure, and warning.
- Add alkalinity and buffering; pH alone is not enough to predict acid requirement.

### 7.8 New chemistry decision tools

- Nutrient Source Comparison.
- Fast Fix vs Soil Building selector.
- Calcium Source selector.
- Nutrient Timing Planner.
- Compatibility and A/B Stock checker.
- pH Effect and alkalinity context.
- CEC/buffering context.
- Organic Mineralization estimator.
- Feed vs Topdress decision flow.
- Ingredient detail pages and time-release graph.

## 8. ETGU Diagnosis and AI

### 8.1 ETGU deterministic intake/rule engine - Not complete

- Implement the required order: pattern -> root zone -> environment -> measured numbers -> mobility -> differential classification -> timing -> next checks -> conservative action.
- Store old/new/random/whole-plant location and spread separately from symptom labels.
- Add medium/root flags, environmental readings, feed/runoff/source-water values, and recent feeding/topdress history.
- Score deficiency, excess, lockout, antagonism, water, environment, root-zone, timing mismatch, pest/pathogen, and unknown possibilities.
- Implement N, P, K, Ca, Mg, S, Fe, Mn, Zn, B, Cu, and Mo rules with evidence and counter-evidence.
- Keep purple stems, random spots, and single-leaf damage from triggering nutrient certainty.
- Add K-to-Ca/Mg, P-to-Zn/micros, salinity, pH, transpiration, and organic timing considerations.
- Unit-test every rule and combinations that should reduce confidence.

### 8.2 Vision diagnosis - Working foundation, not complete

- Expand structured output with diagnosis class, evidence, counter-evidence, next checks, urgency, and missing-data questions.
- Use image quality checks and request another image when evidence is insufficient.
- Assemble grow context server-side after ownership validation; do not trust client-supplied history.
- Store model, prompt version, schema version, input references, and provider request ID.
- Add timeout/retry/cost controls and a clear “AI unavailable” state.
- Never silently fall back to “healthy.”
- Add user feedback: helpful, incorrect, confirmed by test, final outcome.

### 8.3 Diagnosis workflow

- Build the eight-step intake UI from the specification.
- Allow user to accept/reject suggested tags.
- Save diagnosis to grow/plant timeline.
- Create recommended measurement and follow-up tasks.
- Compare subsequent photos and observations to prior diagnosis.
- Add a 24-72 hour follow-up workflow when symptoms are spreading.

### 8.4 Grow-aware assistant - Not built

- Create a context service with bounded recent logs, recipes, tools, diagnoses, tasks, environment, photos, and user preferences.
- Cite the specific grow records used in each answer.
- Add intent tools: explain result, summarize grow, suggest tasks, review recipe/soil mix, prepare harvest summary, draft community post.
- Require confirmation before creating tasks/logs or changing data.
- Add context-size controls, redaction, prompt-injection defenses for uploaded content, and evaluation datasets.

### 8.5 Auto-tagging and harvest readiness - Not built as specified

- Analyze actual notes/context; make tags suggestions requiring approval.
- Persist accepted/rejected tags and feedback.
- Harvest readiness must use multiple trichome images, flower day, expected range, plant observations, and user goal.
- Output a check window and next photo task, never certainty from one image.

### 8.6 AI safety language

- Describe plant-health output as triage, not laboratory diagnosis.
- Prefer monitoring, measurement, isolation, environment/root correction, and qualified help.
- Do not provide pesticide dosing or unsupported medical claims.
- Clearly separate user observations from medical efficacy claims.

## 9. Genetics and Pheno Hunting

### 9.1 Replace the generic matrix scaffold

- Preserve existing generic matrix data through migration/export.
- Add `PhenoHuntProject`, structured genetics identity/parentage, breeding lanes, `PhenoPlant`, stage scores, attachments, lab results, clone performance, stress profile, and keeper decision.
- Store parentage as a tree/structured cross so parentheses are preserved.
- Add stable plant codes and immutable lineage links.

### 9.2 Stage workflows

- Build forms for germination, seedling, veg, sex/preflower, stretch, flower, harvest, dry, cure, smoke/test, lab, clone, breeding, and rerun.
- Add stage-specific reminders and required evidence.
- Record evaluator and date for every score.
- Support male and reversal candidate evaluation without forcing female-only fields.

### 9.3 Trait data

- Implement structure, vigor, roots, aroma, flavor, effect, resin, flower, yield, harvest timing, stress, pest/mold, feeding response, clone, TC suitability, male, reversal, breeding value, lab chemistry, and sensory records.
- Use flexible analyte records for future cannabinoids, terpenes, sulfur compounds, esters, and contaminants.
- Treat medical-use notes as user observations only.

### 9.4 Scores and hard gates

- Support separate flower, commercial clone, breeding parent, hash, stability, outdoor/greenhouse, and steering scores.
- Let users version and customize weights.
- Implement Triple Bag hard gates separately from weighted scores.
- Weak start, low yield, poor stability, weak terps/flavor/effect, poor cloning, and failed rerun are cull gates under that standard.
- Hash/rosin failure removes only extraction status; it does not rescue or automatically reject other categories.
- Require a clone rerun before `confirmed_keeper`.
- Keep AI advisory; users make final decisions.

### 9.5 Comparison and reporting

- Build a dense, responsive comparison table with saved filters and column selection.
- Add keeper/reject/breeding/clone/hash/lab/stress filters.
- Generate hunt, keeper, breeding, reject, and rerun reports with evidence links.
- Promote confirmed assets into genetics inventory, breeding lanes, mothers, or TC projects.

## 10. Tissue Culture and Genetics Preservation

### 10.1 Core data and workflow - Not built

- Implement project, explant batch, media recipe, vessel, transfer, diagnosis, reminder, storage, acclimation, cost, and success-metric models.
- Give each vessel a stable code and complete stage/status history.
- Track source plant/genetics provenance and chain of transfers.
- Add photo evidence, contamination disposition, and batch comparisons.

### 10.2 Media recipe builder

- Scale basal salts, sugar, agar, hormones, additives, charcoal, and final volume.
- Require units and concentration basis.
- Add pH-before-setting reminder, sterilization metadata, small-batch warning, recipe revisioning, and jar-count estimate.
- Treat media/hormone advice as experimental protocol records, not guaranteed formulas.

### 10.3 TC diagnosis

- Distinguish contamination, oxidation, no growth, callus, vitrification, rooting failure, and acclimation failure.
- Use timing and cross-vessel/batch patterns before assigning confidence.
- Add counter-evidence and suggested protocol adjustment for the next trial.
- Never conclude an entire cultivar/protocol failed from one vessel.

### 10.4 Calendar, storage, cost, and analytics

- Generate stage-based check and transfer reminders with user-configurable schedules.
- Track cold-storage conditions, checks, refreshes, and exit-to-multiplication.
- Track acclimation dome/vent schedule and survival.
- Calculate contamination, rooting, acclimation, failure cost, and cost per successful plantlet.
- Compare methods and recipes only when sample sizes are visible.

### 10.5 Legal/safety

- Store jurisdiction/user compliance notes but never claim tissue culture is legally exempt.
- Add appropriate laboratory safety and contamination-disposal guidance reviewed by a qualified expert.
- Gate business/nursery workflows from personal mode unless enabled.

## 11. Crop Steering and Controlled Stress Testing

### 11.1 Steering projects

- Add project and run models with stage, medium, substrate volume, goals, baseline period, and plant/pheno links.
- Capture P0/P1/P2/P3 phases, water content, dryback, irrigation shots/timing, runoff, root-zone/input EC and pH, VPD, light, and observations.
- Add configurable stop thresholds and alerts.
- Compare plant response against baseline and other phenos.

### 11.2 Stress-test projects

- Require control group, tested plants, protocol, severity, stop conditions, baseline, observations, recovery, and final outcome.
- Default severity to levels 1-3; require explicit confirmation for 4-5 and do not encourage destructive tests.
- Support dryback, heat, cold, light, VPD/RH, EC, pH drift, training/defoliation, transplant, root restriction, vigor, and observational mold/pest pressure.
- Do not instruct users to introduce pests/pathogens or deliberately create mold.
- Stop before irreversible damage and prevent stacked stressors from invalidating interpretation.

### 11.3 Pheno integration

- Update drought, heat, cold, light, humidity, mold, EC, pH, training, recovery, stability, and steering-suitability profiles.
- Distinguish normal-condition intersex findings from extreme-stress findings; retain both as evidence.
- Attach reports and score impacts to keeper decisions and breeding recommendations.

### 11.4 Triple Bag timeline engine

- Encode the supplied gates as a versioned user-selectable standard, not universal agronomic truth.
- Add scheduled evidence/checklists from germination through clone rerun.
- Require fair conditions and record deviations that corrupt comparisons.
- Implement cull reasons, override reason, evaluator, and evidence.
- Preserve all observations even after cull for lessons-learned reporting.

## 12. Additional Personal Tools

### Dry/Cure Guard - Not built

- Track room temp/RH, drying days, batch, jar RH, burp schedule, mold/overdry risk, and reminders.
- Join Dew Point Guard readings where available.

### Clone Rooting Troubleshooter - Not built

- Track date, medium, environment, dome, light, gel, stem/leaf/root observations, and follow-up.
- Link clones to source plant/pheno.

### Pest/IPM Scout - Not built

- Add structured scouting, trap counts, underside checks, photos, severity, follow-up, and non-chemical recommendations.
- Keep identification uncertain and require confirmation for high-impact actions.

### Run Comparison - Not built

- Normalize metrics and compare only compatible units/definitions.
- Surface confounders and missing data instead of inventing causal claims.

### Auto Grow Calendar - Not built

- Generate editable stage/task templates from start date, grow style, cultivar estimate, and user plan.
- Recalculate future tasks after actual stage transitions without rewriting completed history.

### Inventory and production - Not built

- Add ingredient lots, quantity/unit, cost, source, expiry, reservations, and recipe availability.
- Add seed/genetics inventory with source, seed type, parentage, projects, and quantity events.
- Add Living Soil Labs batch pull sheet, shrinkage, labor, packaging, cost/bag, margin scenario, and traceability.

## 13. Integration Platform Redesign

### 13.1 Provider-neutral contracts

- Define adapter methods: `authorize`, `refresh`, `testConnection`, `listOrganizations`, `listFacilities`, `listControllers`, `listDevices`, `listSensors`, `pullCurrent`, `pullHistory`, `registerWebhook`, and `revoke` as supported.
- Declare capabilities per adapter; never display unsupported controls.
- Add provider-specific auth schemas and setup components.
- Add connection health, last successful sync, cursor/watermark, retry/backoff, and rate-limit state.
- Add mappings: external organization/facility/controller/device/sensor -> GrowPath grow/room/source.

### 13.2 Telemetry normalization

Replace the required temp/RH/dew-point row with a flexible normalized observation model:

- `userId`, `growId`, `facilityId`, `connectionId`, `provider`, `externalEventId`.
- `controllerId`, `moduleId`, `deviceId`, `sensorId` and display names.
- `metric` enum, numeric/string/boolean value, canonical unit, source unit, timestamp, received time.
- quality, aggregate flag, stale flag, raw payload reference, and metadata.
- Separate device-state events from sensor observations.
- Calculate derived VPD/dew point in a versioned derivation pipeline when source values permit.
- Retain raw payloads for a limited, documented debugging window.

### 13.3 Sync and webhook operations

- Backfill history by bounded windows.
- Poll current/read-only providers with jitter and provider-specific rate limits.
- Verify webhook signatures, deduplicate, queue processing, retry safely, and dead-letter failures.
- Add sync audit dashboard and manual replay for administrators.
- Alert only after persistence and sustained thresholds; add cooldown and acknowledgement.

## 14. Growlink Integration Plan

Source status: vendor-confirmed information supplied by the user on 2026-06-19. Official portals were not independently fetched because the browsing gateway received Cloudflare `403` responses.

### 14.1 Confirmed constraints and capabilities

- Customer read-only API; not enabled by default.
- No sandbox. Testing requires an enabled customer tenant, beta customer, or purchased R&D hardware/system.
- Register a Growlink account, then use the API portal signup.
- Auth API returns a bearer token used as `Bearer <token>`.
- Hardware API lists controllers and exposes controller GUIDs, devices, and sensors.
- Reporting API returns historical sensor/device data with approximately a 10-minute delay.
- Equipment Interaction API provides current sensor/device values. Treat this as read-only observation unless Growlink explicitly grants a write contract.
- Current sensor endpoint: `/api/OrgDashboardReadings` with unit query parameters.
- Current device-state endpoint: `/api/OrgDashboardDeviceStates` with unit query parameters.
- Metadata endpoints include `/api/ProductTypes`, `/api/ParticleSensors`, and `/api/ParticleDevices`.

### 14.2 Immediate registry corrections

- Change Growlink category from `cloud_and_controls` to `read_only_cloud_api`.
- Remove `controls` and any unconfirmed write capability.
- Set documentation/sign-up links to the supplied developer portal.
- Record `sandbox: false`, `customerEnablementRequired: true`, and `historicalDelayMinutes: 10`.
- Add `current_sensor_readings`, `current_device_states`, `controllers`, `devices`, `sensors`, and `historical_reporting` capabilities.

### 14.3 Authentication work

- Obtain exact auth endpoint, request fields, token lifetime, refresh behavior, revocation, scopes, and error codes from Josh/Growlink.
- Determine whether credentials are user/password, client credentials, API key, or portal-issued OAuth application.
- Never retain a Growlink password unless the documented contract requires it; prefer tokens/refresh tokens.
- Build token refresh, reauthorization, and disconnect behavior.

### 14.4 Adapter work

- Implement `GrowlinkAdapter.testConnection`.
- Implement controller, module, sensor, and device discovery.
- Resolve ProductType, ParticleSensor, and ParticleDevice enum metadata and cache it with refresh/version handling.
- Map the requested units to canonical units: Celsius, kPa, EC, and an appropriate PPFD mode where supported.
- Normalize `Value`, `Suffix`, `FormattedValue`, aggregate state, and sort order.
- Normalize device `State`, `IsManual`, `Throttle`, and UTC `Timestamp` as device-state events.
- Implement historical reporting with cursors/windowing once the reporting contract is received.
- Mark current values stale based on source timestamp, not request time.

### 14.5 Growlink questions still open

- Base URL and all endpoint paths for auth, hardware, reporting, and units.
- Full units endpoint and enum stability guarantees.
- Token expiry/refresh and multi-organization behavior.
- Rate limits, pagination, maximum history window, retention, and timestamp semantics.
- Whether the 10-minute delay applies to all reporting data.
- API commercial/partner terms, branding, data ownership, and redistribution/storage rules.
- Whether webhooks exist.
- Whether `Equipment Interaction` is only read access despite its name.
- Availability of a test tenant, loaner/R&D unit, or named beta customer process.
- Support escalation and change/deprecation notification process.

### 14.6 Growlink acceptance test

- Enabled test customer authenticates without exposing credentials.
- Controllers, modules, sensors, and device states are discoverable.
- At least one sensor maps to a grow and persists current plus historical data.
- Units and timestamps are correct and duplicate syncs are idempotent.
- Disconnect revokes/removes credentials and stops polling.
- Dew Point Guard can consume mapped Growlink readings with source attribution.

## 15. Monnit/iMonnit Integration Plan

Source status: vendor information supplied by the user; exact API contracts still require official documentation and credentials.

### 15.1 Supplied capabilities

- iMonnit Premier includes REST API and webhook access.
- Reports and historical sensor data are available.
- New customers may use a 45-day trial.
- Authentication may involve API keys, OAuth, or issued developer credentials; exact account contract must be confirmed.

### 15.2 Immediate registry corrections

- Correct `premiere_or_enterprise` to the vendor plan name `Premier` and avoid asserting Enterprise unless confirmed.
- Record REST, webhooks, reports/history, and trial availability.
- Add the supplied security brief as a security-reference link, not API documentation.

### 15.3 Required discovery

- Obtain REST/OpenAPI docs, auth flow, webhook docs, sample payloads, and trial tenant.
- Confirm organizations, networks, gateways, sensors, readings, acknowledgements, and pagination models.
- Confirm webhook signing, delivery retries, ordering, replay, and IP allow-list behavior.
- Obtain rate limits, historical retention, export limits, and commercial integration terms.
- Confirm which metrics/units and gateway health events are available.

### 15.4 Adapter and acceptance work

- Build provider-specific auth/setup and connection test.
- Discover networks/gateways/sensors and map them to grows.
- Implement bounded historical import and webhook ingestion.
- Normalize sensor readings and gateway/device health without requiring temp/RH.
- Test deduplication between webhook and historical polling.
- Acceptance: live/trial sensor data persists, webhooks verify, history backfills, device mappings survive reconnect, and alerts use mapped readings.

## 16. Remaining Provider Program

For TrolMaster, SensorPush, Aranet, UbiBot, ZENTRA, HOBOlink/LI-COR, OpenSprinkler, and Agrowtek:

- Assign provider owner and outreach status.
- Obtain written commercial permission and data-storage terms.
- Obtain authentication, sandbox/test data, rate limits, history, webhook, and deprecation contracts.
- Build one adapter at a time through the provider-neutral conformance tests.
- Prioritize by user demand and accessible test hardware, not registry count.
- Do not mark a provider “supported” until a real tenant/device passes acceptance.

## 17. Plans, Roles, and Commercial Boundaries

- Define personal free/pro entitlements before adding more conversion prompts.
- Hide facility navigation for personal users.
- Add creator/educator only after publish/follow/content moderation workflows are real.
- Add facility owner/staff/viewer permissions with explicit tenant scope.
- Keep METRC/compliance, staff assignments, audit controls, and commercial analytics out of personal mode.
- Gate tissue culture production, batch production, facility steering, and team workflows as later modules.

## 18. Verification Matrix

Each feature must pass all applicable gates:

- **Logic**: formula/rule unit tests, boundary tests, known reference examples, version recorded.
- **API**: validation, ownership, authorization, idempotency, pagination, errors, migration compatibility.
- **Persistence**: result can be reopened and remains historically accurate after calculator updates.
- **Workflow**: grow selection, save log, create task, AI explanation, timeline discovery.
- **UI**: loading/error/empty/offline/saved states; mobile/desktop; accessibility; long text does not overflow.
- **AI**: structured schema, missing-data behavior, no fake fallback, safety language, evaluation set, user feedback.
- **Integration**: real tenant/device, units, timestamps, backfill, dedupe, reconnect, secret removal, rate limits.
- **Safety**: uncertainty, no pesticide dosing, no medical claims, no destructive stress encouragement.
- **Operations**: logs without secrets, monitoring, cost limits, backup/restore, migration/rollback notes.

## 19. Release Sequence

### Release 0 - Truth, contracts, and shared workflow

- Route/placeholder cleanup, ToolRun normalization, source links, ownership tests, shared result UI, feature manifest, backend deployment smoke test.

### Release 1 - Complete personal grow loop

- Grow workspace, plants, journal/photos/tasks, merged timeline, active-grow Home, harvest records, responsive navigation.

### Release 2 - Complete core environmental tools

- VPD, Dew Point Guard, PPFD/DLI, watering, bud-rot risk, history, charts, alerts, AI explanations.

### Release 3 - Soil and nutrient system

- Ingredient provenance, release engine v1, NPK completion, Soil Builder, dry amendments, topdress/timing, soil/medium, pH/EC safety, inventory links.

### Release 4 - ETGU diagnosis and grow-aware AI

- Deterministic intake/rules, vision context, follow-up, accepted tags, assistant tool calls, harvest readiness.

### Release 5 - Genetics and pheno hunting

- Structured projects/plants/scores, Triple Bag gates, comparisons, clone/lab/sensory/rerun, reports, genetics inventory.

### Release 6 - Tissue culture

- Projects, media, vessels, diagnosis, calendar, storage, acclimation, cost, genetics links.

### Release 7 - Crop steering and stress trials

- Steering phases, telemetry, control groups, stop conditions, reports, pheno integration.

### Release 8 - Integrations

- Telemetry redesign, Growlink beta adapter, Monnit trial adapter, provider operations, then additional providers based on access.

### Release 9 - Creator and commercial

- Courses/content only with real material; facility roles, teams, production, analytics, and compliance only after entitlements and tenancy are mature.

## 20. Immediate Next 20 Engineering Tasks

1. Refresh the product acceptance audit and remove stale completion claims.
2. Add a feature-status manifest and hide dead personal routes.
3. Normalize ToolRun canonical fields with migration and ownership tests.
4. Standardize save-log/create-task APIs for every source object.
5. Build the shared tool result component and action state machine.
6. Add a merged grow timeline API and Grow workspace shell.
7. Add ingredient provenance/source records and remove unsupported verification labels.
8. Version nutrient calculations, chemistry rules, and release estimates.
9. Add N-form breakdown, water analysis, and measured-EC workflow to recipes.
10. Build Nutrient Timing Planner using uncertain release windows.
11. Build Soil Builder and Dry Amendment Builder on the shared ingredient model.
12. Implement ETGU deterministic intake, evidence, counter-evidence, and next checks.
13. Expand vision diagnosis schema and remove fake healthy fallbacks from active routes.
14. Add diagnosis-to-log/task/follow-up and tag approval UI.
15. Redesign telemetry into metric observations plus device-state events.
16. Correct Growlink and Monnit registry metadata.
17. Request the remaining Growlink auth/reporting/rate-limit contract and an enabled beta tenant.
18. Obtain Monnit REST/webhook docs and start a 45-day trial tenant.
19. Implement Growlink adapter conformance tests using captured/redacted fixtures before live access.
20. Build a real-device integration smoke test and operations dashboard before advertising either provider.

## 21. Definition of Complete

A module is complete only when:

- Its required domain inputs affect outputs.
- Outputs are versioned, validated, and honest about uncertainty.
- The result persists to the selected grow and can be reopened.
- Log/task/recipe links work and enforce ownership.
- Empty, error, loading, offline, and permission states are usable.
- Mobile and desktop layouts pass visual review.
- Automated tests cover formulas, APIs, authorization, and primary workflow.
- Documentation and product language match actual capability.
- No fake data or fixed AI acknowledgement is presented as analysis.
- Vendor integrations have passed against a real authorized tenant/device.

Until those conditions are met, label the module beta, partial, or coming soon.

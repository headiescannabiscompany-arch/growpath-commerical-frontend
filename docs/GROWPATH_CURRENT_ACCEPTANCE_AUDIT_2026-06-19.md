# GrowPathAI Current Acceptance Audit

Date: 2026-06-19  
Purpose: Replace stale percentage-based claims with evidence-backed feature states.

## Status Policy

- Implemented: primary calculation/workflow works and is user-facing.
- Beta: useful implementation exists, but required scope or validation remains.
- Hidden: code may exist, but it is not suitable for normal navigation.
- Not built: no qualifying production workflow exists.

The runtime source of truth for personal feature visibility is `src/config/featureStatus.ts`.

## Personal Navigation

| Area | Status | Evidence | Remaining gate |
| --- | --- | --- | --- |
| Home | Beta | Personal route and entitlement-aware tab exist | Complete daily grow aggregation and refresh behavior |
| Grows | Beta | Grow routes, plants, logs, and tasks exist | Unified grow workspace and merged timeline |
| Tools / AI | Beta | Working calculators and diagnosis routes exist | Shared result UI and consistent persistence |
| Community | Beta | Personal community route exists | Reliability, privacy, moderation, following |
| Profile | Beta | Personal profile route exists | Complete privacy, units, notification, and integration controls |
| Courses | Hidden | Route exists but is not a complete learning product | Real course, lesson, progress, and content workflows |
| Facility in personal mode | Hidden | Entitlements separate personal/facility modes | Keep commercial-only navigation gated |

## Tools and AI

| Feature | Status | Evidence | Remaining gate |
| --- | --- | --- | --- |
| VPD | Implemented foundation | Leaf offset, stage target, status, recommendations, log/task actions | Direct leaf temperature, versioned targets, telemetry prefill |
| Dew Point Guard | Beta | Manual, CSV, telemetry/Pulse paths and risk analysis | Charts, alerts, broader adapters, grow history |
| PPFD / DLI | Beta | Target and measured-light calculations | Defensible fixture model, canopy sampling, history |
| NPK recipe | Beta | Multi-row recipe, elemental conversions, recipes, feeding records | Water analysis, N forms, measured EC, compatibility validation |
| Nutrient chemistry | Beta | Form/release engine and starter ingredient library | Complete provenance, uncertainty, broader validation |
| Watering | Beta | Medium/stage/environment heuristic | Actual history, plant size, substrate measurements, validation |
| Bud rot risk | Beta | Multi-factor heuristic screen | Duration/history calibration and sustained-risk alerts |
| AI diagnosis | Beta | Structured OpenAI vision route when configured | Full ETGU intake, comparison, follow-up, accepted tags |
| Data integrations | Beta | Secure connection framework and Pulse adapter | Provider-specific auth, telemetry redesign, real-device tests |
| Crop steering | Hidden | Basic prototype route remains for development | Project/run models, P0-P3, dryback/EC logic, telemetry, reports |

## Major Modules Not Built

- Soil Builder, Dry Amendment Mix Builder, Topdress/Re-amend Planner.
- Complete Soil/Medium and product-specific pH/EC adjustment tools.
- Grow-aware assistant, complete auto-tagging, and harvest readiness.
- Structured pheno hunting and Triple Bag hard-gate workflow.
- Tissue culture and genetics-preservation workflow.
- Controlled crop-steering/stress-test projects.
- Inventory, Living Soil Labs production, genetics inventory, and breeding lanes.
- Growlink, Monnit, and other provider adapters beyond Pulse.

## Audit Decision

Do not publish one overall completion percentage. Module readiness is not additive: a visible screen does not have the same value as a tested end-to-end workflow. Use the feature manifest and the acceptance gates in `GROWPATH_MASTER_IMPLEMENTATION_BACKLOG_2026-06-19.md` for release decisions.

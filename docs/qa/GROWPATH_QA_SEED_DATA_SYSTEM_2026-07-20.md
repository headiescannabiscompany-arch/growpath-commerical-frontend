# GrowPathAI QA Seed Data System

Date: 2026-07-20

Status: Item 49 foundation implemented. Pack population, backend seeding, and live execution remain pending under master items 50-55.

## Purpose

Create repeatable, realistic QA data for crop identification, plant diagnosis/IPM, the Living Soil Labs commercial storefront, and Facility operations. This is acceptance-test data, not model-training data and not production customer data.

The machine-readable contract is `tests/fixtures/growpath-qa-seed-system.json`. Run:

```txt
npm.cmd run verify:qa-seed-system:planning
npm.cmd run verify:qa-seed-system
```

Planning mode validates structure and safety while allowing explicitly pending sources, licenses, formulas, and records. Strict mode must fail until every pack is seed-ready.

## Non-negotiable safety rules

- Seed only test or staging. Production seeding is prohibited.
- Require an explicit `qaSeedNamespace`; reruns update that namespace instead of duplicating records.
- Provide dry-run, verify, and cleanup before executing a real seed.
- Never store plaintext passwords, API keys, access tokens, payment credentials, or production identifiers in fixtures or logs.
- Never claim an image was inspected when pixels were not analyzed.
- Never turn a dataset label into a confirmed diagnosis. Diagnosis remains evidence-based ETGU triage with alternatives and confirmation steps.
- Never turn proposed nutrient ratios into verified label facts without owner or label evidence.
- Never create new Facility access roles merely to fit a persona. Use canonical Owner, Manager, Staff, and Viewer roles plus assignments and scoped restrictions.

## Media and source rights

Every third-party media record requires the source URL, media URL, creator, image-level license, attribution text, retrieval date, review date, and a decision that the intended QA use is allowed.

iNaturalist is conditional, not automatically approved. Its API exposes observation and photo-license filters, but the platform terms prohibit commercial AI training and many images use noncommercial or all-rights-reserved licenses. GrowPathAI must not use this QA pack for training. Copied test media must have a license compatible with the intended commercial-product QA use; otherwise retain only a reviewed external reference or obtain permission.

PlantVillage is also conditional. The repository describes an open-access research dataset, but this plan does not treat that description alone as an image-level commercial-use license. Record the governing license and intended-use approval before importing any image.

## Pack 50: Plant identification

Target: 300-500 reviewed images.

- Cannabis/hemp: seedling, vegetative, flowering, male, female, intersex/hermaphrodite morphology, and harvested flower.
- Food crops: tomato, pepper, cucumber, lettuce, basil, strawberry, corn, and beans.
- Ornamentals: rose, pothos, monstera, peace lily, orchid, marigold, petunia, and chrysanthemum.
- Weeds: crabgrass, dandelion, plantain, clover, chickweed, purslane, lambsquarters, nutsedge, and poison ivy.
- Lookalikes: tomato/nightshade, cannabis/Japanese maple/kenaf, and grass/nutsedge.
- Failures: blur, partial leaves, mixed plants, dead leaves, artificial plants, and no-plant scenes.

Each case records accepted and scientific names, category, stage, acceptable alternatives, distinguishing features, expected confidence range, media quality, and provenance. Clear cannabis/hemp morphology can return a crop-level draft without a grow, but never a cultivar inference.

## Pack 51: Diagnosis and IPM

Three case groups remain separate so the test result cannot hide mimic confusion:

- Diseases: powdery/downy mildew, Botrytis/gray mold/bud-rot evidence, leaf spots, Fusarium, Pythium/root rot, damping-off, rust, bacterial leaf spot, and mosaic-like symptoms.
- Pests and lookalikes: spider, broad, and russet mites; thrips; aphids/root aphids; whiteflies; fungus gnats; mealybugs; scale; leafminers; caterpillars; beneficials; and harmless lookalikes.
- Abiotic mimics: nutrient deficiency/excess/lockout/antagonism, watering stress, light/heat/wind/cold injury, edema, spray burn, pH/EC issues, environment/root-limited calcium transport, senescence, and physical damage.

Every case carries pattern, medium/root zone, environment, measured values, progression, direct signs, plausible alternatives, confirmation method, urgency, quarantine/scouting guidance, and cautious IPM categories. The reviewed evidence envelope must be identical for GrowPath and GPT comparison.

## Pack 52: Living Soil Labs commerce

The seeded brand is Living Soil Labs. The GrowPath module remains Soil & Nutrient Batch Planner.

Planned product drafts include Penny Saver Soil, Living Soil, No-Till Soil, proposed dry nutrient mixes, a 1 lb trial size, one shirt with S-5XL variants, and one adjustable embroidered hat. Soil sizes are 1 cu ft, 1.5 cu ft, and a bulk test listing; nutrient sizes are 2, 5, 10, and 25 lb.

The ratios 3-3-3, 3-1-2, 1-3-2, 2-6-4, and 0.5-3-3 are owner-proposed product fixtures until verified label evidence exists. The runtime GrowPath method retains its documented presets and uncertainty rules.

## Pack 53: Facility simulator

Seed a realistic Facility with rooms/zones, grows, plants, equipment, inventory, SOPs, tasks, and canonical access roles. Generate normal telemetry and deliberately bounded incidents for humidity/dew point, stale/offline sensors, substrate EC, irrigation, CO2, lighting/exhaust, quarantine, inventory, missed work, permission conflicts, and malformed imports.

The simulator must test persistence and exact write-back scope as well as the visible result: Plant, Grow, Log, ToolRun, Task, room, Facility, alert, entitlement, and AI-credit records.

## Definition of seed-ready

A pack becomes `seed_ready` only when:

1. Every source and media item has passed rights review.
2. Required expected results and allowed alternatives are recorded.
3. Product formulas and claims have owner/label evidence where applicable.
4. The real backend schema mapping, idempotent seed command, verification command, and cleanup command exist.
5. Contract tests pass in a networked environment.
6. A named test/staging execution produces an evidence record and successful cleanup verification.

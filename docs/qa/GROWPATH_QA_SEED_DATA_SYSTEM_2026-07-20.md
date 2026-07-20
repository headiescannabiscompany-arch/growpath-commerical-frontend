# GrowPathAI QA Seed Data System

Date: 2026-07-20

Status: Master items 49-54 are implemented. The private synthetic Facility pack is seed-input-ready; governed source/media approval for the other packs, staging execution, role-loop acceptance, and cleanup evidence remain pending under item 55.

## Purpose

Create repeatable, realistic QA data for crop identification, plant diagnosis/IPM, the Living Soil Labs commercial storefront, and Facility operations. This is acceptance-test data, not model-training data and not production customer data.

The machine-readable contract is `tests/fixtures/growpath-qa-seed-system.json`. Run:

```txt
npm.cmd run verify:qa-seed-system:planning
npm.cmd run verify:qa-seed-system
```

Planning mode validates structure and safety while allowing explicitly pending sources, licenses, formulas, and records. Strict mode must fail until every pack is seed-ready.

## Backend runner and delivery evidence

The authoritative backend now provides real-schema `dry-run`, `seed`, `verify`, and `cleanup` commands:

```txt
npm run qa:seed:dry-run
npm run qa:seed
npm run qa:seed:verify
npm run qa:seed:cleanup
```

The runner requires an explicit `test` or `staging` environment plus matching confirmation, a `growpath-qa-*` namespace, a QA-marked database name, a non-production URL, and an exact Git SHA. Cleanup also requires a second exact namespace confirmation. Seed passwords are bcrypt-hashed at cost 12, evidence files are exclusive-create, and cleanup deletes only document IDs owned by the namespace registry in reverse dependency order.

Delivery evidence for item 54:

- Backend pull request: `headiescannabiscompany-arch/growpath-commerical#29`.
- Backend merge SHA: `54d4632659b3247261c50cee17646f88ae3e248c`.
- Production service URL: `https://api.growpathai.com`.
- Render deployment: live on 2026-07-20 at 15:52:47 America/New_York, with successful build, process start, MongoDB connection, and two internal `/health` HTTP 200 checks.
- Independent live check: `GET https://api.growpathai.com/health` returned HTTP 200 at `2026-07-20T19:53:07.004Z` with service `growpath-backend` and `ok: true`.
- GitHub Backend CI contract pack: passed against runner commit `eab38c27c9309b2cce51766c52146a617a75c4d9`.
- Focused seed-runner suite: 5/5 passed, covering no-write planning, idempotent create/skip/update behavior, hashed credentials, verification, exact cleanup, safety gates, preflight referential integrity, and rights blocking.
- Real-catalog offline plan: 87 intended records, zero database writes, and expected blockers for incomplete rights/source, commerce, facility, telemetry, scenario, and acceptance evidence.
- The separate GitHub dependency-audit job reported current advisories from the unchanged backend lockfile. That repository-level dependency-remediation work is recorded as a delivery exception; it is not evidence that seed execution occurred.

Deployment of the runner does not seed production and does not expose a seed API route. The strict catalog and environment gates remain active; networked staging execution belongs to item 55.

The item-55 lifecycle correction was merged in backend PR `headiescannabiscompany-arch/growpath-commerical#30` as `f727c259bb4b7829c6809e86c566467151572ca3`. Render showed that exact commit live on both `https://api.growpathai.com` and the free `https://growpath-api-staging.onrender.com` service on 2026-07-20. It allows selected-pack execution and separates true pre-seed blockers from scenario/browser evidence that can exist only after seeding. Production seeding remains blocked.

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

The Facility catalog now has explicit owner approval limited to private synthetic QA/staging inputs, five seed-time account bindings, ten broad non-operational room-boundary profiles, eight synthetic test-adapter records, six executable QA-only SOP checklists, and 252 deterministic telemetry points across all 14 scenarios. Scenario runs and browser acceptance are intentionally empty until the staging records are actually exercised.

## Definition of seed-ready

A pack becomes `seed_ready` only when:

1. Every source and media item has passed rights review.
2. Required expected results and allowed alternatives are recorded.
3. Product formulas and claims have owner/label evidence where applicable.
4. The real backend schema mapping, idempotent seed command, verification command, and cleanup command exist.
5. Contract tests pass in a networked environment.
6. A named test/staging execution produces an evidence record and successful cleanup verification.

For independently executable packs, steps 5-6 are post-seed acceptance rather than circular prerequisites to the first seed. The selected pack must first pass its governed input checks; only real execution may create scenario, browser, persistence, rerun, and cleanup evidence.

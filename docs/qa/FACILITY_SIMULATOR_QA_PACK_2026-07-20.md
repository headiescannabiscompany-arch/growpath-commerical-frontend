# Facility Simulator QA Pack

Date: 2026-07-20

Status: The private synthetic Facility pack is seed-input-ready. Test-account binding occurs during the staging seed; scenario execution and acceptance evidence remain post-seed work.

Machine-readable catalog: `tests/fixtures/facility-simulator-qa-catalog.json`

## Catalog foundation

The pack defines one private synthetic Facility with the following seedable graph:

| Record type       | Count |
| ----------------- | ----: |
| Personas          |     5 |
| Zones             |     5 |
| Rooms             |    10 |
| Grows             |     5 |
| Plants            |    12 |
| Equipment         |     8 |
| Inventory records |     6 |
| QA SOPs           |     6 |
| Planned tasks     |    10 |

The room set covers mother, clone/propagation, seedling, vegetative, flower, dry, cure, tissue culture, cold storage, and general storage workflows.

## Roles and access

The fixture uses only the canonical Facility roles: `OWNER`, `MANAGER`, `STAFF`, and `VIEWER`.

- Owner maps to `OWNER`.
- Manager maps to `MANAGER`.
- Grower and scout are separate personas that both map to `STAFF`.
- Restricted employee maps to `VIEWER`.

Grower, scout, and restricted employee are not invented authorization roles. Their differences come from assignments and the existing role permission boundary. Five QA accounts are marked `seed_on_execution`, so the runner creates and binds them inside the selected namespace without storing a plaintext password in the fixture.

## Synthetic and cannabis boundary

The Facility is explicitly classified as `synthetic_test_only`, limited to test or staging, and ineligible for publication or product-claim evidence. Its cannabis/hemp examples are eligible only because the fixture declares a private structured QA purpose. No address, license number, Metrc identifier, cultivar, observed production reading, or production account ID is fabricated.

Owner direction for item 55 approves these inputs only as private synthetic test/staging fixtures. It does not approve production identifiers, publication, product claims, operational cultivation setpoints, external media/source rights, or Living Soil Labs formulas, labels, prices, and products. Inventory quantities, broad room-boundary profiles, and SOP checklists are QA inputs—not real business records or cultivation recommendations.

## Integration and telemetry contract

The integration contract is read-only by default. Credentials must be encrypted and never emitted, provider metric keys and raw units must be preserved, unknown metrics must remain unmapped, and controller writes are prohibited. An Owner or Manager must confirm reviewed mappings, while room/device auto-build is a separate idempotent action.

The catalog defines 15 governed metric/unit pairs and contains 252 deterministic, timestamped synthetic telemetry records: 18 for each of 14 scenarios. Provider keys, raw values, raw units, canonical values, canonical units, device IDs, rooms, scenarios, and unique timestamps remain explicit. The generator records that these values are neither observed production data nor operational setpoints.

An offline selected-pack run against backend commit `f727c259bb4b7829c6809e86c566467151572ca3` planned 326 records with zero database writes, zero seed blockers, zero unrelated source-rights failures, and only the two expected post-seed obligations: scenario runs and browser acceptance evidence.

## Scenario coverage

The pack defines normal operation plus 13 incidents:

- humidity spike after lights off;
- dew-point/condensation risk;
- offline sensor and stale data;
- high substrate EC;
- irrigation failure;
- unexpected high CO2;
- light or exhaust failure;
- acknowledgement and escalation;
- pest observation and approved quarantine;
- inventory shortage;
- missed task and overdue SOP;
- conflicting permissions;
- malformed CSV/API data with duplicates, gaps, timestamps, and units.

Incident output begins as reviewable draft alerts or tasks where appropriate. Missing telemetry is disclosed, not fabricated. Pest evidence remains an observation until a user confirms it; the fixture does not turn visual screening into a diagnosis.

## Acceptance scope

Seed readiness and acceptance are deliberately separate. Strict seed-readiness validates the governed inputs needed to create the Facility. Post-seed acceptance requires genuine evidence for entitlements, AI-credit charge/refund behavior, Facility Owner access, manager mapping confirmation, Staff and Viewer limits, task assignment, rights-reviewed uploads, Ask AI provider/fallback labels, alerts and acknowledgements, persistence/reload, scoped write-backs, and a shared-record cross-role chain.

Write-backs require confirmation, remain inside the selected Facility, and cover Plant, Grow, Log, ToolRun, Task, room, and Facility records.

## Remaining work

- Seed the Facility graph through supported backend APIs.
- Execute all 14 scenarios and capture timestamped results.
- Run the cross-role acceptance matrix and attach genuine evidence.
- Verify the idempotent rerun and exact namespace cleanup.

## Verification

```txt
npm.cmd run verify:facility-simulator-qa-catalog:planning
npm.cmd run verify:facility-simulator-qa-catalog
npm.cmd run verify:facility-simulator-qa-catalog:acceptance
```

Planning mode validates the shape while reporting seed blockers. Seed-readiness mode now passes only when the private synthetic inputs are ready. Acceptance mode intentionally remains blocked until the staging records have been exercised and timestamped scenario and browser evidence is attached.

# Facility Simulator QA Pack

Date: 2026-07-20

Status: Synthetic catalog, role contract, telemetry contract, incident matrix, and validation are implemented. Test-account binding, record seeding, scenario execution, and acceptance evidence remain pending.

Machine-readable catalog: `tests/fixtures/facility-simulator-qa-catalog.json`

## Catalog foundation

The pack defines one private synthetic Facility with the following planned graph:

| Record type       | Count |
| ----------------- | ----: |
| Personas          |     5 |
| Zones             |     5 |
| Rooms             |    10 |
| Grows             |     5 |
| Plants            |    12 |
| Equipment         |     8 |
| Inventory records |     6 |
| Draft SOPs        |     6 |
| Planned tasks     |    10 |

The room set covers mother, clone/propagation, seedling, vegetative, flower, dry, cure, tissue culture, cold storage, and general storage workflows.

## Roles and access

The fixture uses only the canonical Facility roles: `OWNER`, `MANAGER`, `STAFF`, and `VIEWER`.

- Owner maps to `OWNER`.
- Manager maps to `MANAGER`.
- Grower and scout are separate personas that both map to `STAFF`.
- Restricted employee maps to `VIEWER`.

Grower, scout, and restricted employee are not invented authorization roles. Their differences must come from assignments and the existing role permission boundary. Test accounts remain unbound until approved accounts are supplied.

## Synthetic and cannabis boundary

The Facility is explicitly classified as `synthetic_test_only`, limited to test or staging, and ineligible for publication or product-claim evidence. Its cannabis/hemp examples are eligible only because the fixture declares a private structured QA purpose. No address, license number, Metrc identifier, cultivar, observed production reading, or production account ID is fabricated.

The draft SOPs are not owner-approved operational instructions. Inventory quantities and reorder points are synthetic scenario inputs, not real business records.

## Integration and telemetry contract

The integration contract is read-only by default. Credentials must be encrypted and never emitted, provider metric keys and raw units must be preserved, unknown metrics must remain unmapped, and controller writes are prohibited. An Owner or Manager must confirm reviewed mappings, while room/device auto-build is a separate idempotent action.

The catalog defines 15 governed metric/unit pairs and requires at least 240 timestamped synthetic telemetry points before strict validation can pass. Planning mode intentionally contains no telemetry records, because generated readings must be created by the test-data system and must not be represented as observed production data.

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

Strict acceptance requires evidence for entitlements, AI-credit charge/refund behavior, Facility Owner access, manager mapping confirmation, Staff and Viewer limits, task assignment, rights-reviewed uploads, Ask AI provider/fallback labels, alerts and acknowledgements, persistence/reload, scoped write-backs, and a shared-record cross-role chain.

Write-backs require confirmation, remain inside the selected Facility, and cover Plant, Grow, Log, ToolRun, Task, room, and Facility records.

## Remaining work

- Bind five approved test accounts.
- Seed the Facility graph through supported backend APIs.
- Configure reviewed room baselines and test integration adapters.
- Obtain Owner approval for test SOP content where execution requires it.
- Generate at least 240 governed synthetic telemetry points.
- Execute all 14 scenarios and capture timestamped results.
- Run the cross-role acceptance matrix and attach genuine evidence.

## Verification

```txt
npm.cmd run verify:facility-simulator-qa-catalog:planning
npm.cmd run verify:facility-simulator-qa-catalog
```

Planning mode validates the catalog structure and retains incomplete real-world work as blockers. Strict mode must fail until accounts, records, baselines, adapters, SOP approvals, telemetry, scenario runs, and acceptance evidence are verified.

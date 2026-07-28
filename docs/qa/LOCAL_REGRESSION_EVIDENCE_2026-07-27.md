# Local regression evidence — 2026-07-27

## Scope

Repository: GrowPathAI commercial frontend
Branch: codex/field-observations-evidence
Commit under test: 89df8c9d148be2c5bb222b974a69ed51aa8aa85a

This record captures checks that can run without owner credentials, production media, or a platform-owner Browser session. It does not replace live account/role evidence.

## Results

- Full frontend CI: PASS — 323 suites, 1,292 tests, 1 snapshot.
- UI route inventory: PASS — 263 routes across 277 files.
- Focused diagnosis/IPM checks: PASS — 6 suites, 33 tests across diagnosis API/history/context, diagnosis UI, IPM UI, and the diagnosis/IPM QA catalog.
- Lint: PASS — repository frontend lint completed with no reported errors.
- Static build: PASS — committed dist bundle index-78dd1514c45e7e2ba24d2c4f181cfeeb.js verified.
- Strict full scan: PASS — no API or legacy-client findings; reports written under tmp/scan.
- Contract/contamination guards: PASS — transport, ToolRun, provenance, ownership, soil/nutrient, diagnosis/IPM, genetics, propagation, harvest/history, business, course-media, visual-polish, ID, facility-context, telemetry, and dewpoint checks all passed.
- Delivery guard: PASS — placeholder, corruption, and export-sanity checks passed.
- QA catalog planning checks: PASS with declared planning blockers — seed, Plant ID, diagnosis/IPM, Living Soil Labs, and Facility simulator catalogs validated without schema errors.

## Export limitation

- The production web export process was allowed to run for five minutes but timed out in this environment before completion. No production-export pass is claimed from that attempt.
- The static build and export-sanity guard passed independently.

## Remaining external acceptance

- Platform-owner and content-authorized report-link retest.
- Production web export/Render deployment confirmation.
- Owner-approved knowledge-source records and rights-cleared QA media.
- Live diagnosis/IPM failed-provider refund and independent accuracy review.
- Facility and commerce acceptance runs requiring real accounts/records.

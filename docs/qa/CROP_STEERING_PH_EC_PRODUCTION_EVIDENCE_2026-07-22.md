# Crop Steering and pH/EC Production Evidence - 2026-07-22

## Scope and status

This record covers Packet 9: durable Crop Steering projects, steering entries,
linked pH/EC checks, evidence-first interpretation, recovery observations,
tasks, grow logs, timeline events, and allow-listed plant/pheno tags.

Implementation, automated verification, merge, deployment, and an authenticated
Personal Pro production-record chain are complete. The live session also found a
water-source classification defect, which was fixed, merged, deployed, and
retested against the same Headies project and measurements.

## Release under test

- Production web URL: `https://growpathai.com`
- Production API URL: `https://api.growpathai.com`
- Packet 9 frontend PR: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/pull/116`
- Packet 9 frontend merge SHA: `9a9ad8bb81b501f467abb0bee4e68ebb045e6796`
- Packet 9 backend PR: `https://github.com/headiescannabiscompany-arch/growpath-commerical/pull/50`
- Packet 9 backend merge SHA: `f8b158242eff7b17e3d432a7cff1752a58c329f0`
- Water-source frontend-copy hotfix PR: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/pull/118`
- Water-source frontend-copy hotfix merge SHA: `bc4024255ef8ed4a86f8d970b0447c903e64e092`
- Water-source backend hotfix PR: `https://github.com/headiescannabiscompany-arch/growpath-commerical/pull/51`
- Water-source backend hotfix merge SHA: `abb1f51286f686d5ef0a132b2f5477c5b10052c5`
- Hotfix merge timestamp: `2026-07-22T13:05:46Z`

The initial Packet 9 production API fingerprint was:

`growpath-backend|git=dev|ts=2026-07-22T11:49:36.976Z`

After hotfix merge `abb1f512`, the production process changed to:

`growpath-backend|git=dev|ts=2026-07-22T13:06:41.823Z`

The deployed web response returned HTTP 200 with
`Last-Modified: Wed, 22 Jul 2026 13:07:35 UTC` and ETag
`W/"98d79744e2b9efe7e1e5a7d3b5cca754"`. The unchanged ETag is expected because
the frontend hotfix only synchronizes the repository's duplicated backend
calculator and test copy; the runtime behavior changed in the backend service.

Render does not expose a Git SHA in this endpoint. Production identity is
therefore recorded with the GitHub merge SHA, deployment process timestamp, live
URL, authenticated record IDs, and the post-deploy behavioral retest below.

## Implemented record chain

- A Crop Steering project is a durable parent record for one grow and optional
  plant/pheno context.
- A project is required before a steering entry can be calculated or saved.
- A steering entry requires at least one real measurement or observation; the
  calculator does not fabricate measurement defaults.
- Steering entries can carry dryback, irrigation timing, DLI/PPFD, VPD,
  temperature, RH, leaf temperature, CO2, input/runoff EC and pH, recipe,
  root-zone condition, recovery time, and plant response.
- A linked pH/EC check can use the same project while remaining independently
  reviewable and reopenable.
- Module records reuse the production API's `linkedModuleRecordId`; the client
  does not create a duplicate fallback when an immediate linked-record reload
  is temporarily unavailable.
- Steering and pH/EC task plans use distinct sources (`crop_steering` and
  `ph_ec_check`) and remain linked to the originating record.
- Only governed steering tags can synchronize to an owned plant/profile, and
  the backend enforces grow alignment.
- Timeline events have exact names for project creation, steering entry logs,
  high-pressure events, poor/positive recovery, pH/EC checks, runoff warnings,
  and steering-task creation.

## Automated verification

- Frontend focused Packet 9 coverage: 4 suites, 13 tests passed.
- Frontend changed-file regression coverage: 52 suites, 182 tests passed.
- Frontend repository's duplicated backend route coverage: 2 suites, 15 tests
  passed for the original Packet 9 release.
- Standalone backend focused Packet 9 coverage: 4 suites, 50 tests passed.
- Exact timeline-event, ToolRun, ownership, soil/nutrient, genetics/pheno,
  corruption, placeholder, export, and production-build guards passed.
- Water-source hotfix calculator suite: 34 of 34 tests passed.
- Water-source hotfix Tools API suite: 11 of 11 tests passed.
- Both touched frontend-copy files passed Node syntax checks.
- Frontend hotfix PR CI passed:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29921708194`
- Backend hotfix PR test workflow passed:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29921709190`
- Backend hotfix full lint, test, application-start, and ZAP API scan workflow
  passed:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29921709314`
- Merged backend main-branch CI passed for `abb1f512`:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29922399734`
- Merged frontend main-branch CI passed for `bc402425`:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29922400607`
- Merged frontend production-build preflight passed for `bc402425`:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29922398849`

The frontend root Jest configuration intentionally excludes its duplicated
`backend/` tree. Forcing the backend route suite through that unrelated frontend
Jest environment stopped during Mongoose/`whatwg-url` initialization before test
execution. The standalone backend suites and both repository CI workflows are
the authoritative verification for the hotfix.

## Authenticated Headies production chain

The in-app Browser production session was authenticated as:

- Account: `headiescannabiscompany@gmail.com`
- Workspace and plan: Personal Pro trialing
- Credits observed before the run: 59 of 100 remaining; 41 used; 0 refunds
- Grow: `6a551a9d2fb9f669d2319c06` (`bruce banner and mountain top mint`)
- Project: `Packet 9 production 2026-07-22 08:10 EDT`
- Project ID: `6a60ba6118c378a548afa46b`

### Steering entry

- Steering ToolRun ID: `6a60ba9218c378a548afa471`
- Steering module record ID: `6a60ba9218c378a548afa473`
- Grow-log ID: `6a60baa818c378a548afa47c`
- Inputs included generative flower/P2 coco steering, 32% dryback, measured
  irrigation timing, DLI 36, PPFD 800, VPD 1.2, 78 F air, 55% RH, 76 F leaf,
  900 ppm CO2, input/runoff EC 1.6/2.5, input/runoff pH 5.9/6.5, root-zone
  salt crust/light pot, 30-hour recovery, and droop into the next light cycle.
- Result: excessive pressure, negative response, poor recovery, eight warnings,
  and `pressure_exceeded` assessment.
- Created steering tasks:
  - Return to recovery steering: `6a60bac418c378a548afa486`
  - Recheck dryback before irrigation: `6a60bac418c378a548afa48c`
  - Check runoff EC and pH trend: `6a60bac518c378a548afa492`
  - Check light stress/new growth: `6a60bac518c378a548afa498`

### Initial linked pH/EC check

- pH/EC ToolRun ID: `6a60bb6518c378a548afa4aa`
- pH/EC module record ID: `6a60bb6518c378a548afa4ac`
- Grow-log ID: `6a60bb7d18c378a548afa4b5`
- Inputs: cannabis, coco coir, flower, pH 5.9/6.5, EC 1.6/2.5 mS/cm,
  owner targets pH 5.7-6.2 and EC 1.2-2.0, municipal water through a carbon
  filter, alkalinity 140, calcium 45, magnesium 12, sodium 35, and chloride 45
  mg/L, with the same irrigation event and a calibrated meter.
- Result: `range_warning`, high risk, input pH/EC in range, runoff pH/EC high,
  and upward input-to-runoff drift.
- Created pH/EC tasks:
  - Retest pH/EC: `6a60bb9018c378a548afa4bd`
  - Inspect root-zone/response: `6a60bb9018c378a548afa4c3`

Before the hotfix retest, project reload showed exactly `1 steering entry · 1
pH/EC check`, confirming that no duplicate module record was created.

The grow timeline exposed the exact durable events for crop steering project
creation, crop steering entry logged, high-pressure steering event, poor
recovery logged, pH/EC check logged, runoff EC warning, runoff pH warning,
steering task created, ToolRun created, and log created.

No plant was selected for this project. Plant-profile tag synchronization was
therefore correctly not attempted. Suggested tag candidates visible in result
metadata are not claimed as persisted plant tags.

## Production finding, fix, and live retest

The initial pH/EC result incorrectly displayed `RO water has little buffering`
for the water source `municipal water through carbon filter`. The backend used a
bare `/ro/` substring match, which matched the letters in `through`.

The hotfix now recognizes explicit `RO`, `R/O`, or `reverse osmosis` tokens and
classifies municipal, city, well, and tap sources separately. Regression tests
cover the exact production phrase.

After the new backend process was live, the same measurements were rerun in the
same Headies account, grow, and project:

- Retest ToolRun ID: `6a60c0e92e17c93899aacebf`
- Retest module record ID: `6a60c0e92e17c93899aacec1`
- Assessment: `range_warning`; overall risk: high
- Correct retained findings: high runoff EC, upward runoff-pH drift, municipal
  source mineral context, and high recorded alkalinity
- Correct removed finding: no RO-water or low-buffering warning
- Saved Runs reopened the exact retest and retained the project, inputs,
  assessment, and the four corrected findings.
- Project reload showed exactly `1 steering entry · 2 pH/EC checks`; the second
  check is the intentional post-hotfix production retest.

## Browser evidence boundary

The production checks above were read from the authenticated in-app Browser's
semantic page state and corroborated by persistent URLs, saved ToolRuns, module
records, grow logs, task IDs, project history, timeline events, GitHub merge
SHAs, CI runs, and the API deployment fingerprint.

Genuine screenshot capture was attempted repeatedly at full-page, viewport, and
clipped-region scopes, including a fresh evidence tab. The Browser capture API
timed out each time and produced no image file. This record therefore does not
claim a screenshot or substitute stale/unrelated imagery. Screenshot/video
capture tied to these exact IDs remains the only missing Packet 9 evidence type.

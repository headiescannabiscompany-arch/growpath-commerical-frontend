# Crop Steering and pH/EC Production Evidence - 2026-07-22

## Scope and current status

This record covers Packet 9: durable Crop Steering projects, steering entries,
linked pH/EC checks, evidence-first interpretation, recovery observations,
tasks, grow logs, timeline events, and allow-listed plant/pheno tags.

The code, automated verification, merge, and deployment checks are complete.
The authenticated Personal Pro production-record chain is still pending because
the in-app Browser's active server session changed to a separate Commercial
account before the live record could be created. No record or screenshot is
claimed from the stale Personal tab.

## Release under test

- Production web URL: `https://growpathai.com`
- Production API URL: `https://api.growpathai.com`
- Frontend PR: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/pull/116`
- Frontend source commit: `76202c229a535eab15e2db40c182777821b7d379`
- Frontend merge SHA: `9a9ad8bb81b501f467abb0bee4e68ebb045e6796`
- Backend PR: `https://github.com/headiescannabiscompany-arch/growpath-commerical/pull/50`
- Backend source commits: `579c96f`, `db81cc6`
- Backend merge SHA: `f8b158242eff7b17e3d432a7cff1752a58c329f0`
- Deployment verification timestamp: `2026-07-22T12:00:59Z`

The cache-bypassed production web response returned HTTP 200 with
`Last-Modified: Wed, 22 Jul 2026 11:52:11 UTC` and ETag
`W/"98d79744e2b9efe7e1e5a7d3b5cca754"`.

The production API fingerprint returned HTTP 200 with:

`growpath-backend|git=dev|ts=2026-07-22T11:49:36.976Z`

Render does not expose a Git SHA in this endpoint, so the backend production
identity is recorded as merge SHA `f8b1582` plus the new process timestamp.

## Implemented record chain

- A Crop Steering project is a durable parent record for one grow and optional
  plant/pheno context.
- A project is required before a steering entry can be calculated or saved.
- A steering entry requires at least one real measurement or observation; the
  calculator no longer fabricates measurement defaults.
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
  passed.
- Standalone backend focused coverage: 4 suites, 50 tests passed.
- Standalone Tools API suite: 11 tests passed.
- Exact timeline-event test passed after positive-recovery coverage was added.
- ToolRun, ownership, soil/nutrient, and genetics/pheno contract guards passed.
- Placeholder/corruption/export sanity checks passed.
- Production web export and static-build verification passed with
  `https://api.growpathai.com` as the API origin.
- Frontend TypeScript still reports only known unrelated existing errors; no
  touched Packet 9 file produced an error.
- Frontend CI passed:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29917240528`
- Frontend production-build preflight passed:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/29917240527`
- Backend CI, including the full test run and API security scan, passed:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical/actions/runs/29917143248`

## Browser verification boundary

The in-app Browser initially exposed an older Personal Pro tab displaying
`headiescannabiscompany@gmail.com`, the known grow
`6a551a9d2fb9f669d2319c06`, and `59 / 100` AI credits. A fresh production API
request from that tab resolved instead to the active
`jcindc2012@gmail.com` Commercial session, returned the Commercial allowance
(`500 / 500`), and returned no Personal grows. The separate Commercial account
also correctly refused the Personal Crop Steering route.

The stale Personal UI was therefore not used to create records, save tasks,
claim screenshots, or assert production persistence. Doing so would mix two
account identities and produce invalid evidence.

## Honest remaining production checks

After the in-app Browser is signed back into
`headiescannabiscompany@gmail.com` Personal Pro, complete one release-busted
production chain against frontend `9a9ad8bb` and backend `f8b15824`:

1. Create a uniquely named Crop Steering project for grow
   `6a551a9d2fb9f669d2319c06` and, when available, select a plant/pheno.
2. Save one measured steering entry with environmental, irrigation, root-zone,
   recovery, and plant-response evidence.
3. Create the review task plan and save the result to the grow log.
4. Open the linked pH/EC workflow, save one paired input/runoff check with EC
   units, water-source context, and recent feed/top-dress context.
5. Create the pH/EC task plan and save that result to the grow log.
6. Reload the project and confirm exactly one steering entry and one pH/EC
   check are linked; confirm no duplicate module record.
7. Verify the exact timeline events and any allow-listed plant/pheno tags.
8. Capture genuine screenshots tied to the release SHAs, URL, timestamp,
   account, record IDs, and checks above.


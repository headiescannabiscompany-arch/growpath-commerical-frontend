# SOP Library and AI Procedure Recommendations Production Evidence

Date: 2026-07-25

## Release

- Frontend PR: `#217`
- Frontend merge SHA: `abc60a123a34765014aa502dca26c82f8e99738a`
- Frontend merged: `2026-07-25T08:08:50Z`
- Frontend URL: `https://growpathai.com`
- Backend PR: `#73`
- Backend merge SHA: `bea6633831f4c96594096832053839d2d5c47cce`
- Backend merged: `2026-07-25T08:08:24Z`
- Backend URL: `https://api.growpathai.com`

Workspace-neutral corrective release:

- Frontend PR: `#219`
- Frontend merge SHA: `aaf68b2fe3380935f1faac9fa7ef6b17759934af`
- Frontend merged: `2026-07-25T13:02:42Z`
- Backend PR: `#74`
- Backend merge SHA: `ff32ec14b27fc4c3fb75643e3e2446929dbec5a1`
- Backend merged: `2026-07-25T13:00:22Z`

GitHub reported successful post-merge Frontend CI and Production Build Preflight
workflows for the frontend merge and successful post-merge Backend CI for the
backend merge.

The public frontend response reported `last-modified: Sat, 25 Jul 2026 08:10:36
UTC`. The production backend fingerprint reported
`growpath-backend|git=dev|ts=2026-07-25T08:09:09.382Z` in production on Node
24.14.1. Because the backend fingerprint identifies its Git value as `dev`, it is
deployment-timing evidence and is not treated as SHA evidence.

The corrective release also passed post-merge Frontend CI, Production Build
Preflight, and Backend CI. The public frontend response then reported
`last-modified: Sat, 25 Jul 2026 13:04:32 UTC`, and the production backend
fingerprint reported
`growpath-backend|git=dev|ts=2026-07-25T13:01:18.772Z`. The fingerprint remains
deployment-timing evidence rather than backend SHA evidence.

At `2026-07-25T08:40:41Z`,
`GET /api/facilities/FAC_LIVE_RELEASE_CHECK/sop-documents` returned the expected
authenticated-boundary response `401 UNAUTHENTICATED`. This proves the new
production route exists rather than falling through to `404`.

## Automated Verification

Before merge:

- Frontend focused coverage: 4 suites / 22 tests passed.
- Frontend full regression: 312 suites / 1,231 tests / 1 snapshot passed.
- All frontend repository guards passed.
- The production web export succeeded and resolved
  `https://api.growpathai.com`.
- Touched frontend source passed ESLint and diff integrity checks.
- Backend core/system regression: 25 suites / 172 tests passed.
- Final backend SOP/AI/compatibility database coverage: 3 suites / 25 tests
  passed.
- Targeted backend lint, formatting, and diff integrity checks passed.
- The workspace-neutral corrective release passed the two focused frontend
  suites with 17 tests, touched-source lint and formatting, diff integrity,
  corruption/export scans, and the networked frontend and backend PR checks.
- The backend library guard confirmed all eight server-owned starters at source
  version 2 and rejected Facility-only shared wording.

The database tests cover owner/manager write access, viewer read-only access,
cross-Facility isolation, required review confirmation, version preservation,
non-destructive retirement, Facility-owned attachment validation, and rejection
of client-supplied AI checklist injection.

## Signed-In Production Session

Account: `jcindc2003@yahoo.com`

Evidence type: in-app Browser semantic DOM inspection and targeted control-state
checks. No production record was created, edited, retired, uploaded, invited, or
removed during this pass.

### Workspace and Role

- Fresh login reached the workspace chooser.
- Personal, Commercial, and Facility choices were all available.
- The Facility Team page showed three members and identified this account as
  `Role: OWNER`.
- The same page showed
  `exploringthegrowinguniverse@gmail.com` as `MANAGER`, not Viewer, and
  `headiescannabiscompany@gmail.com` as `STAFF`.

### Facility SOP Library

URL:
`https://growpathai.com/home/facility/sop-runs/presets?release=abc60a123a34765014aa502dca26c82f8e99738a&verify=facility-sop-library`

Verified:

- The signed-in Owner reached the live `SOP Library`.
- All eight setpoint-free standard starters were visible.
- Each starter exposed a summary, expected duration, and checklist size.
- The create/revise surface exposed title, category, executable checklist,
  safety/escalation notes, estimated duration, and supporting-document upload.
- Supported-document copy named PDF, Word, text, JPG, and PNG.
- The explicit Facility review checkbox was unchecked by default.
- The save action was disabled before the required reviewed fields and
  confirmation were complete.
- Selecting `Daily Room Opening Check` populated seven executable steps while
  leaving review confirmation unchecked and save disabled.
- The existing active QA SOP remained visible as version 1.

No save, revision, retirement, run creation, or upload action was performed.

### Personal AI

URL:
`https://growpathai.com/home/personal/ai?release=abc60a123a34765014aa502dca26c82f8e99738a&verify=personal-sop-ai`

Verified:

- `AI procedure recommendations` and all eight SOP starters were visible.
- The page explains that the output is a review-only SOP/checklist draft and
  that formal approval, assignment, uploads, and version history remain
  Facility controls.
- The page states that choosing a starter only fills the request and causes no
  AI-credit or record write.
- Selecting `IPM Scouting and Escalation` filled the composer with the source
  key, source version, selected-record instruction, missing-information rule,
  and the prohibition against inventing setpoints, chemical rates, legal
  requirements, or completed actions.
- The request was left unsent.

No AI credit was used and no review task was created.

### Commercial AI

URL:
`https://growpathai.com/home/commercial/tools/ask-ai?release=abc60a123a34765014aa502dca26c82f8e99738a&verify=commercial-sop-ai`

Verified:

- The Commercial workspace reached the live `Ask AI` screen.
- `AI procedure recommendations` and the same eight starters were visible.
- The same review-only and Facility-governance boundary copy was present.
- The composer was empty and Send was disabled.

No AI credit was used and no record was created.

### Provider-Backed Commercial Recommendation

URL:
`https://growpathai.com/home/commercial/tools/ask-ai`

Account: `jcindc2003@yahoo.com`, using the Commercial workspace. The server
reported plan `FACILITY (trialing)` with 2,000 weekly credits.

The first live `IPM Scouting and Escalation` request used source version 1 and
returned a complete provider-backed review-only draft, but its wording included
`facility scale` and `facility IPM plan`. The request was billed exactly once:

- Before: `2000 / 2000`; 0 credits across 0 billed requests; 0 refunded.
- After: `1999 / 2000`; 1 credit across 1 billed request; 0 refunded.

That finding was fixed in backend PR `#74` and frontend PR `#219`. The shared
starters are now source version 2 and use workspace-neutral operational
language. Facility-specific plans, scales, approved limits, roles, and
deviation rules may only come from selected Facility records or later
Facility-owned review/customization.

At `2026-07-25T13:09:08.778Z`, the deployed Commercial assistant sent the
source-version-2 request. The completed response:

- identified `GrowPath context + OpenAI`;
- returned the ranked starter rationale, eight executable checklist steps,
  safety boundary, and unresolved-information list;
- used `documented rating scale` and `applicable IPM plan`;
- did not contain `facility scale`, `facility IPM plan`, or
  `facility-approved`;
- preserved crop identity, stage, reviewer, evidence, exception, and follow-up
  details as unresolved rather than inventing them; and
- required `Select a grow to turn this draft into a confirmable review task.`

The corrective retest was also billed exactly once:

- Before: `1999 / 2000`; 1 credit across 1 billed request; 0 refunded.
- After: `1998 / 2000`; 2 credits across 2 billed requests; 0 refunded.

No grow was selected, no task confirmation was offered, and no task or other
production record was created.

## Remaining Production Acceptance

- Retest the SOP Library with a real Viewer account. The available production
  accounts currently prove Owner, Manager, and Staff; the account previously
  described as Viewer is actually Manager.
- Exercise a deliberate production upload/create/revise/retire loop and clean
  up any temporary record after persistence and authorization checks.
- Capture genuine final-SHA screenshots or video. Three in-app Browser
  `Page.captureScreenshot` attempts timed out during this pass, so no screenshot
  is claimed. The semantic DOM and control-state evidence above is retained,
  but visual evidence remains open.

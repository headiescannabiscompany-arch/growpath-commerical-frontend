# Course Media Production Evidence - 2026-07-22

## Scope and status

Provider-aware lesson media implementation, automated verification, merge,
deployment, authenticated production testing, one resulting UI repair, and live
retest are complete. This record covers GrowPath uploads, YouTube, Rumble,
Vimeo, and Other URL authoring choices; URL normalization; unsafe HTML
rejection; accessibility and rights metadata; learner fallback behavior; and
privacy-gated playback.

## Release under test

- Production web URL: `https://growpathai.com`
- Production API URL: `https://api.growpathai.com`
- Backend PR: `https://github.com/headiescannabiscompany-arch/growpath-commerical/pull/52`
- Backend merge SHA: `27a58601aed66db39777ca494de917f568aa3c27`
- Backend merge timestamp: `2026-07-22T15:56:09Z`
- Backend production process timestamp: `2026-07-22T15:56:56.843Z`
- Frontend implementation PR: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/pull/120`
- Frontend implementation merge SHA: `4d4520bdfe84bdff0abc9d7723aa7835d41202ff`
- Frontend implementation merge timestamp: `2026-07-22T15:58:01Z`
- Frontend live-finding PR: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/pull/121`
- Frontend final merge SHA: `18430c2ef451abde818232aed918b4c6259163f9`
- Frontend final merge timestamp: `2026-07-22T16:11:12Z`
- First deployed course-media bundle: `index-76bac3e6f9c050a49edf6f6fe7daa75f.js`
- Final deployed bundle: `index-6b170dbcc40ba624fe0fe7b607f3e910.js`
- Final Browser evidence timestamp: `2026-07-22T12:17:02-04:00`

The production API fingerprint changed from
`growpath-backend|git=dev|ts=2026-07-22T13:06:41.823Z` to
`growpath-backend|git=dev|ts=2026-07-22T15:56:56.843Z` immediately after the
backend merge. The endpoint does not expose a Git SHA, so production identity is
recorded with the GitHub merge SHA, process timestamp, live URL, authenticated
record, deployed web bundle, and behavioral retest.

## Automated verification

- Frontend full Jest regression: 297 suites, 1,134 tests, and 1 snapshot passed.
- Nested frontend-repository backend regression: 20 suites and 174 tests passed.
- Provider-focused frontend regression before delivery: 6 suites and 44 tests
  passed.
- Live-finding frontend regression: 6 suites and 45 tests passed.
- Standalone backend focused lesson-media, course-mutation, and commercial
  workflow suites passed.
- Standalone backend full run completed 154 of 155 suites: 151 suites and 896
  tests passed; three database-backed suites exceeded the old 30-second hook
  limit without a product assertion failure.
- The shared timeout was raised to 60 seconds, matching the database cleanup
  allowance. The exact three affected suites then passed together: 3 suites and
  25 tests.
- Backend PR #52 passed both GitHub test workflows after the timeout fix.
- Frontend PRs #120 and #121 passed GitHub Frontend CI.
- Course-media contract guard, targeted ESLint, production web export, and the
  production build wrapper passed.
- TypeScript still reports only the repository's previously documented,
  unrelated errors; no course-media error was introduced.

## Authenticated Headies production session

- Account: `headiescannabiscompany@gmail.com`
- Workspace and plan: Personal Pro trialing
- Course title: `QA Provider Media 4d4520bd`
- Course ID: `6a60e9d09f3dbb9d83d2c611`
- Course state: free, draft, unpublished
- Verified lesson: `QA Provider Lesson 18430c2e`
- Source: `https://www.youtube.com/watch?v=QT7vv46368M`
- Availability check stored by production: `2026-07-22T16:14:39Z`

The in-app Browser session verified the following on the final deployed bundle:

1. The Add Lesson form displayed distinct GrowPath upload, YouTube, Rumble,
   Vimeo, and Other URL choices.
2. The YouTube URL was detected and normalized to the same canonical watch URL.
3. The editor exposed provider verification, rights, availability, captions,
   transcript, text-summary, and privacy-aware embed controls.
4. Pasted iframe HTML was rejected with the exact actionable message: `Paste a
   video page URL, not iframe, embed, script, or HTML code.`
5. The rejected HTML exposed no source action, availability controls, metadata
   controls, or publish-ready claim after the repair.
6. A valid YouTube lesson saved through the production API and reloaded as a
   video lesson with its canonical provider, availability, summary, captions,
   transcript, fallback link, and source-check timestamp intact.
7. The learner card did not load YouTube until the user selected `Load YouTube
   video`.
8. After consent, the YouTube player loaded while `Open on YouTube`, the written
   summary, and the warning that watching does not auto-complete course progress
   remained visible.

The clearly labeled QA course remains an unpublished draft because the course
detail UI provides no safe course-delete action. No rejected iframe input was
saved, and the QA course was not submitted, approved, or published.

## Production finding, repair, and retest

The first deployed bundle correctly rejected iframe HTML, but any non-empty raw
input was still treated as a selected source. That caused the same invalid input
to display availability/accessibility controls and `Video source is ready for
course publishing.`

The repair now treats a source as selected only after successful normalization
or an actual pending GrowPath upload. Pending uploads explicitly state that
validation happens on save. Regression coverage uses the exact production
iframe input.

After merge `18430c2e` deployed as bundle `index-6b170dbc...`, the exact iframe
case was rerun in the same account, course, and Add Lesson route. Only the input
and rejection message remained in the lesson-video panel. The contradictory
publish-ready state and advanced controls were absent. The finding is closed.

## Genuine visual evidence

The screenshots below were captured from the authenticated in-app Browser on
the final production bundle and are tied to frontend merge `18430c2e`, backend
merge `27a58601`, and `https://growpathai.com`.

- [Unsafe iframe rejection](evidence/course-media-invalid-source-18430c2e.png)
- [Privacy-gated YouTube playback](evidence/course-media-playback-18430c2e.png)

## Evidence boundary

This session verified the presence and source-specific copy for all five
authoring choices and completed the YouTube save/reload/playback path. It did not
upload a new video file, publish the QA course, or claim a working Rumble embed;
Rumble intentionally remains link-only until a stable official embed contract
is available. Vimeo unlisted-hash preservation is covered by automated contract
tests, not by a private production video supplied in this session. No video
recording was captured; the evidence types are semantic Browser state, two
genuine production screenshots, persistent production records, GitHub SHAs and
checks, deployed bundle identity, and API process identity.

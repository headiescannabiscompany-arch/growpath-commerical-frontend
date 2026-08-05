# Plant ID and Discovery Nature Production Release Evidence — 2026-08-04

## Release identity

- Frontend PR: `#290`
- Frontend merge: `4b6e303046ce199306083f62699219f0ae06ab55`
- Backend PR: `#97`
- Backend merge: `82620c0f5b0a2a56ff8b70631bd8d9f88c8087ce`
- Recorded passing CI runs: `30929689783`, `30929306543`, and `30929306418`
- Production web URL: `https://growpathai.com`
- Production API URL: `https://api.growpathai.com`

## Completed release evidence

- The frontend and backend pull requests merged after their recorded CI checks passed.
- A production API health request returned HTTP 200 after the backend rollout. The
  response reported service `growpath-backend`, uptime `60.707595408`, and timestamp
  `2026-08-04T17:11:49.725Z`, proving that the healthy process had restarted during
  this release window.
- The Codex in-app Browser opened the exact frontend release URL at
  `/home/personal/discover?release=4b6e3030&verify=plant-id-nature-live` while signed
  in as `jcindc2003@yahoo.com`.
- The production Discover page rendered `Discover`, `Discovery Nature`, an
  `Identify a Plant` entry explaining photo upload, AI candidate, field context, and
  private or approximate map-pin choices, and an `Explore Mapped Plant Findings`
  entry describing opt-in locations.
- The release implementation and automated coverage include evidence-preserving Plant
  ID autofill, optional location and Field Study sharing, privacy-safe public
  observation projections, and public photo-derivative handling. These source and CI
  checks are implementation evidence; they do not replace the data-dependent live
  acceptance listed below.

## Explicit evidence boundary

- The Browser account was `jcindc2003@yahoo.com`, not
  `headiescannabiscompany@gmail.com`.
- The connected Browser account had no saved Plant ID runs available for the requested
  Headies-record review.
- The public Discovery Nature map returned zero observations during this read-only
  pass. No production photo pin, pin-photo rendering, exact-to-approximate location
  conversion, or observation-detail photo was claimed.
- No file was uploaded, no location permission was requested, no exact location was
  transmitted, no sharing setting was changed, and no production record was created
  or mutated during this pass.
- Headies saved-run autofill, fresh location capture, private exact-coordinate
  persistence, approximate public publication, photo-pin rendering, reload, edit, and
  withdrawal acceptance remain open until that account or another explicitly approved
  data-bearing session is available.

## Active follow-up

Post-release review identified an additional prompt-truncation, privacy, and
photo-ready-state follow-up. It remains active and is not accepted as complete in this
record. Completion requires focused implementation review, regression coverage, a new
release identity, and live data-bearing verification without exposing private media or
exact location.

## Acceptance status

The implementation, CI, production API restart/health, and read-only Discover entry
points are verified for the release identities above. End-to-end Headies Plant ID
autofill/location/photo-pin acceptance and the active prompt/privacy/photo-ready
follow-up are still open.

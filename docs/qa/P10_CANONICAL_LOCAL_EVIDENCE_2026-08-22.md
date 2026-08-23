# P-10 canonical local evidence — reviewed public grow timeline

Date: 2026-08-22

## Outcome

P-10 is implemented and its local acceptance gate passes. This packet reuses the accepted
visual grow timeline, zoom levels, source actions and viewer-friendly export. It implements
the previously missing persisted reviewed-public-copy layer; it does not rebuild accepted
event aggregation.

## Implemented contract

- Personal and Commercial owners open the canonical share screen from a Grow timeline.
- All saved events are initially selected; owners may choose a bounded server-known subset,
  date range and owned photos from that exact Grow.
- `Review Public Preview` is non-mutating and displays the exact sanitized title,
  description, events, photo count and cannabis label. Editing after review invalidates the
  preview. Cancel publishes nothing.
- Publish freezes a version behind a 32-byte base64url token. Private edits do not alter it.
- The public viewer is read-only and provides Web Share/copy plus supported external share
  targets. It exposes no owner, workspace, Grow, EvidenceAsset or event-source identifiers,
  private deep links, protected URLs, credentials, telemetry payloads or AI receipts.
- Selected photos must be owned uploaded evidence in the same workspace and Grow. Public
  copies are metadata-stripped derivatives, not protected or signed source URLs.
- Withdrawal immediately makes the token unavailable, returns no photo URLs and deletes
  derivatives not used by another visible Nature publication or timeline. Republishing
  creates a new token and never revives the old one.
- A public viewer can file a unified report against the exact canonical timeline URL. Admin
  hide removes public access and unused derivatives. Admin restore first regenerates safe
  derivatives from still-owned protected sources and fails closed if that cannot be done.
- Cannabis-specific copies use the existing cannabis-interest gate. Signed-out and
  ineligible viewers receive the same generic unavailable response as a missing, withdrawn
  or moderated token.
- Facility-internal timelines are not eligible for this public-copy route.

## Canonical routes

- Personal owner: `/home/personal/grows/:growId/share`
- Commercial owner: `/home/commercial/grows/:growId/share`
- Public viewer: `/grow-timeline/:token`
- Owner APIs: `/api/personal/grows/:growId/timeline/public-copy` and
  `/api/commercial/grows/:growId/timeline/public-copy`, including `/preview`
- Public API: `/api/public/grow-timelines/:token`
- Moderation target: `growTimelinePublicCopy` through the unified report/Admin workflow

## Local evidence

Backend focused packet:

- 7 suites / 75 assertions passed.
- Covers service sanitization/versioning/withdrawal, photo derivative creation and cleanup,
  real database Personal and Commercial publication flows, cross-account denial, public
  visibility/cannabis gates, unified reporting/Admin notification and Admin hide/restore.
- Touched production JavaScript passes ESLint and `git diff --check`.

Frontend focused packet:

- 7 suites / 68 assertions passed, including the app-readable method-registry contract.
- Covers the owner review/publish/withdraw screen, public viewer/report/share screen, API
  calls, existing timeline entry point and photo URL normalization, and Admin target actions.
- TypeScript `--noEmit`, touched ESLint and `git diff --check` pass.

## Exact remaining production gate

After frontend and backend merge/deploy, record both merge SHAs, deployment IDs and served
URLs. With authenticated Personal and Commercial owners and one public/outside session:

1. Open a populated Grow timeline; verify zoom/export remain correct and enter Share.
2. Preview, change a field and confirm the old preview is invalidated; preview again; cancel
   and verify no publication exists after reload.
3. Publish, copy/share/open the public URL and reload owner and viewer states.
4. Repeat once with a real protected photo and confirm only the safe public derivative is
   served without source metadata or a protected URL.
5. Withdraw; verify the old viewer token returns the generic unavailable state and its
   otherwise-unreferenced derivative no longer resolves.
6. Republish; verify a new token works and the old token stays unavailable.
7. Verify a cannabis-specific copy is unavailable signed out/ineligible and visible to an
   eligible signed-in viewer.
8. Report the exact viewer item; verify its Admin tally/queue/deep link, hide/public denial,
   restore/safe photo regeneration and audit history.
9. Confirm no equivalent Facility publish entry or API exists and clean up the test copies.

Until that exact production scenario is recorded, P-10 remains `implemented; local
acceptance passed`, not `live accepted`.

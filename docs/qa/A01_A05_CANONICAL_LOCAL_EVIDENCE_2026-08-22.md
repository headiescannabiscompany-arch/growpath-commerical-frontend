# A-01 through A-05 canonical local evidence

Updated: 2026-08-22  
Frontend acceptance baseline: `81844d9bc57c441da85b0b41a4664e7071581341`  
Backend lawful-request merge: `2000d69dd0af5744b3d46eb398aa949c97997cb9`

## Status decision

A-01 through A-05 are implemented and locally accepted. This does not claim that every Admin
queue is populated in production, that a Sentry provider connection is configured, that a real
authority request was approved or disclosed, or that multi-account session isolation has passed
the final deployed-candidate crawl. Those exact live gates remain below. Missing live data or a
provider credential is not permission to rebuild the accepted Admin architecture.

The frontend continues to withhold lawful-request approval and disclosure controls. The backend
now enforces the complete safety contract, but production enablement still requires the reviewed
operating procedure and live fail-closed acceptance. GrowPathAI never automatically contacts an
authority or sends account data merely because content was reported or a request record exists.

## Local evidence

Eight frontend suites pass 83 assertions across the Platform Admin hub, accounts, reports,
moderation, security, legal evidence requests, audit deep links, auth bootstrap, identity-to-
identity session cleanup, logout, workspace switching, profile privacy and workspace tab order.

Twelve backend suites pass 128 assertions across Admin control-center summaries and mutations,
report ingestion and Admin notification, Sentry issue normalization, authentication and legacy
login, authorization middleware, `/api/me`, privacy export/deletion, preservation serialization,
and the lawful-request state machine. The related preservation/privacy regression packet also
passes eight suites and 76 assertions. The final lawful-request/Admin focused rerun passes two
suites and 31 assertions.

Backend merge `2000d69dd0af5744b3d46eb398aa949c97997cb9` removes the former arbitrary-status PATCH
behavior. It now:

- enforces `received -> identity_review -> legal_review -> approved -> disclosed -> closed`,
  including the documented reject/close and explicit-reopen branches;
- keeps a preservation hold orthogonal to status and permits release only at disposition;
- requires typed reasons and embedded lifecycle history for every change;
- requires verified requester identity and authority, named/reviewed jurisdiction, independent
  legal approval, minimum-necessary scope, notice/delay decision and exact target account before
  approval;
- accepts preserved evidence only under an active hold, requires a SHA-256 digest, and prevents a
  retained source reference from being replaced with different bytes; and
- records disclosure only after approved evidence, verified recipient identity and a reviewed
  completed-delivery receipt exist, then seals a deterministic immutable manifest and hash.

The backend records a completed external delivery; it does not itself send an export to an
authority. The frontend has no one-click approval or disclosure action.

## Remaining live gates

- **A-01: production accepted on frontend `530afd7e`.** The authenticated Platform Admin
  loaded the deployed owner dashboard on desktop and at 390-by-844 mobile width with one
  `Administration` H1, no horizontal overflow, truthful connected/unconfigured security
  source coverage, regulated-commerce review, product activity, knowledge governance, exact
  user search, zero-active/completed moderation state and legal-request boundaries. The
  account workspace exposed the contextual `Platform Administration` entry and returned to
  `/admin`. All five user-action families exposed account-specific button names. Focused Admin
  tests passed 43 assertions; exact-main Production Build Preflight `32673832150` and Frontend
  CI `32673832168` passed. No account or legal-request mutation was invoked.
- **A-02: production accepted on frontend `c71c96b8` and backend `422111d`.** With approved
  disposable records, create/assign/note/resolve/reopen moderation and support cases, exercise
  allowed account/content actions, reload, and verify retained audit plus outside-user visibility
  effects and cleanup.
  A clearly labeled QA-only Technical support record was created in production with confirmed
  email delivery, moved to in-progress, resolved, hard-reloaded, reopened with a required audit
  reason, resolved again and hard-reloaded. The queue returned to 0 active / 13 completed and
  retained the record in completed history. The approved existing QA-only paid-course report then
  passed the reversible moderation loop: `leave -> hide -> restore -> leave`. While hidden, its
  exact reported-content deep link returned `Reported course is unavailable`; after restore the
  same course opened again; after final close and reload the case was `Closed` with the complete
  audit retained. No real-user content was changed. Frontend PR #782 and backend PR #230 then
  deployed the remaining support button semantics, self-assignment and internal case notes with
  audit. Fresh QA-only request `6a8b9252b0780482197dfa62` proved email delivery, four exact named
  action buttons, self-assignment, internal-note persistence, in-progress/resolution,
  reason-required reopen, final resolution and hard-reload retention. The queue returned to
  0 active / 14 completed. A-02 is closed; do not repeat either completed lifecycle.
- **A-03 exact external blocker:** production truthfully reports `Sentry Admin read access is
  not configured`. Protected provider access and a redacted test event are still required to
  prove the project/environment tally, detail/deep link and no-secret response. Do not present
  Sentry as connected or rebuild the accepted Admin source adapter while that credential gate
  remains unmet.
- **A-04:** in production, prove that direct invalid approval/disclosure attempts fail closed; run
  a synthetic preservation/identity/legal-review/reject-or-close lifecycle and retained audit.
  Approval or disclosure of real account data requires an authentic request, reviewed legal
  authority, the approved operating procedure, and the backend gates; never fabricate a police or
  emergency request merely to satisfy release QA.
- **A-05:** use the final candidate across Free, Pro, Commercial, Facility and Admin identities to
  prove expiry, reload, logout, direct-URL denial, identity-to-identity cleanup and explicit
  authorized workspace switching without Living Soil Labs/Triple Bag Genetics ownership leakage.
  Current production evidence proves one boundary: the Platform Admin identity was denied at a
  direct Facility Dashboard URL with one `Access denied` H1 and `only available in facility mode`,
  then returned to `/admin` without exposing Triple Bag Genetics. Free/Pro/Commercial/Facility
  identity chains, expiry/logout/reload and explicit authorized switching remain open; do not
  repeat the accepted Admin-to-Facility denial.

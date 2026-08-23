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

- **A-01:** open the deployed Admin identity on desktop and mobile; verify every queue tally,
  truthful empty/populated/error state, exact source link and contextual Admin entry.
- **A-02:** with approved disposable records, create/assign/note/resolve/reopen moderation and
  support cases, exercise allowed account/content actions, reload, and verify retained audit plus
  outside-user visibility effects and cleanup.
- **A-03:** configure protected Sentry read access, prove the expected project/environment issue
  tally/detail/deep link using a redacted test event, and verify no token or secret is returned.
- **A-04:** in production, prove that direct invalid approval/disclosure attempts fail closed; run
  a synthetic preservation/identity/legal-review/reject-or-close lifecycle and retained audit.
  Approval or disclosure of real account data requires an authentic request, reviewed legal
  authority, the approved operating procedure, and the backend gates; never fabricate a police or
  emergency request merely to satisfy release QA.
- **A-05:** use the final candidate across Free, Pro, Commercial, Facility and Admin identities to
  prove expiry, reload, logout, direct-URL denial, identity-to-identity cleanup and explicit
  authorized workspace switching without Living Soil Labs/Triple Bag Genetics ownership leakage.

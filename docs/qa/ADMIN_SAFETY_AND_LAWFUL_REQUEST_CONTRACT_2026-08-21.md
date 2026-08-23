# Admin safety and lawful-request contract

Updated: 2026-08-21

This contract refines canonical stories A-01 through A-05. It does not make a legal
determination, authorize a disclosure, or close production acceptance. Legal counsel and
the release owner must approve the operating procedure before GrowPathAI releases account
data.

## Preservation is not disclosure

A preservation hold retains the narrowly named records while identity, authority, legal
validity, jurisdiction, scope, notice, and disclosure decisions are still reviewed. A hold
must never silently change a request to `approved` or `disclosed`, send data, or imply that
the requester has been verified.

The Admin frontend may currently:

- create a scoped `received` record through the existing Admin-only endpoint;
- record the requester-supplied identity, organization, email, authority description,
  jurisdiction, target account, date range, and minimum requested scope;
- place a preservation hold with a typed reason while leaving lifecycle status unchanged;
- move `received` to `identity_review`, and `identity_review` or legacy `preserved` to
  `legal_review`, with a typed reason;
- reject or close a pre-approval request with a typed reason;
- render retained evidence-manifest metadata already returned by the API; and
- load the retained platform audit history for the exact request.

The frontend must not expose Approve or Disclose actions until the reviewed operating procedure
and production acceptance prove the backend safeguards below. Backend merge
`2000d69dd0af5744b3d46eb398aa949c97997cb9` now enforces them locally.

## Enforced backend transition contract

The backend must reject every transition outside this graph:

- `received -> identity_review | rejected | closed`
- `identity_review -> legal_review | rejected | closed`
- `legal_review -> approved | rejected | closed`
- `approved -> disclosed | rejected`
- `disclosed -> closed`
- `rejected | closed -> identity_review` only through an explicit reopen operation with a
  required reason and corrected closed-state metadata

Preservation remains an orthogonal boolean/hold record and is not a lifecycle status. The
existing legacy `preserved` status may be displayed and moved forward to `legal_review`, but
new UI must not create it.

Before `approved`, the backend must require verified requester identity and authority,
jurisdiction and legal review, an owner/legal approver distinct from the requester where
required, a minimum-necessary scope decision, and notice/delay status. Before `disclosed`,
it must require an immutable disclosure manifest, evidence hashes or equivalent custody
records, recipient identity, delivery method, time, disclosing actor, and reason. Every
rejection, close, reopen, approval, hold change, and disclosure must retain an audit event.
Closed requests must not retain a misleading `closedAt` after a valid reopen.

The backend now enforces those requirements. Preserved evidence can be attached only while a
hold is active, every item requires a SHA-256 digest, and an existing source reference cannot be
replaced with different bytes. Disclosure requires a verified recipient and completed reviewed
delivery receipt; the server then seals a deterministic immutable manifest and hash. Embedded
lifecycle history persists with the request in addition to the Platform Admin audit event.

The backend records that an independently completed delivery occurred; it does not automatically
export or transmit account data, contact an authority, or turn a content report into a legal
request.

Until the reviewed operating procedure and production fail-closed gates pass, a stored
`approved` or `disclosed` record is read-only in this frontend and must be escalated through
that procedure rather than acted on from the page.

## Admin deep links and account isolation

Admin investigation links may carry `section`, `targetType`, `targetId`, or
`moderationCaseId`. The Admin page must visibly acknowledge the link, bring a returned
target record to the front, and say when the target is absent from the current result set;
opening a link never mutates the record.

Admin logout and identity-to-identity login transitions clear the auth token, preferred
workspace mode, global account-mode selection, global Facility selection/list, and dormant
`gp.session.*` workspace keys before another account can render. Switching an authorized
workspace is not logout and remains an explicit action.

## Acceptance still open

Focused automated tests locally accept the A-01 through A-05 implementation; they are not
production evidence. The exact frontend/backend SHAs must still pass production role,
direct-link, populated, reload, expiry, logout, cross-account, error-recovery, theme, mobile,
accessibility, provider and retained-audit checks. Approval and disclosure remain unavailable in
the frontend pending the reviewed legal operating procedure and production fail-closed evidence.

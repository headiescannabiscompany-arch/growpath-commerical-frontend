# B-06 through B-09 canonical local evidence

Updated: 2026-08-22  
Frontend B-05 merge baseline: `99b5ab329a1f12ed8d97003c1cd85539f19155ba`  
Backend B-05 merge baseline: `a05eff286b4c4f4a42d843e57a373e93f3b9d8fc`  
Backend reconciliation candidate: `f78ddfb46de3b02a963a5411df7958b1b3053325`

Retention recheck: on 2026-08-23, the frontend baseline remained an ancestor of current
frontend candidate `6791268981826f1154dae0db1a780a33e1fff676`, and both backend commits
remained ancestors of current backend candidate
`be00d33ff66fea5322fa6e7cac68fe21298d4753`. B-06 through B-09 therefore retain their
accepted construction; only the named production/provider scenarios below remain.

## Status decision

Rows B-06 through B-09 are implemented and locally accepted. They are not production- or
provider-accepted by this record. Their remaining gates are listed below and must be executed
against one frozen deployed frontend/backend pair. A missing live credential, paid provider,
authorized account or populated production record is an exact live blocker; it is not permission
to rebuild the accepted local architecture.

The intentionally removed full ERP/POS/regulator, native marketplace/payout/tax, dynamic-pricing,
advanced forecasting and cross-platform analytics projects remain out of scope. Truthful external
handoff and default-deny regulated capability decisions remain in scope.

## B-06 — creator essentials

The retained frontend gate passes 19 suites and 143 assertions across Forum and comments, video
upload/library/detail/discovery, creator identity, Lives directory and Studio, Commercial Lives,
courses/authoring/discovery/detail, public sharing and route/readiness fixtures.

The current backend candidate passes 22 suites and 178 assertions across social/community and
course acceptance, Forum actions/feed/moderation/report notification, uploads, video storage and
protected downloads, video upload/library/comments/workspace scope, creator ownership, Lives
publication/lifecycle/account deletion, Commercial workflows and course/Live contracts.

The expanded run exposed and corrected two test-order defects without replacing product behavior:
the upload-route Sharp mock now implements the production cache contract, and the protected-download
contract is tested through one deterministic request builder used by the production signer. The
protected request retains an attachment-only disposition, an allowlisted MIME type and a five-minute
expiry.

Remaining live gates:

- configured production object storage plus upload/playback/comment/premiere/replay behavior;
- the bounded two-account Hosted Live/OBS key, ingest, chat, player, stop/replay, limit and cleanup
  isolation run;
- truthful unavailable/configured state for Twitch, Discord and other optional providers;
- course publish/enroll/payment/unpublish/archive with retained cover/banner/lesson media;
- report persistence, Admin-case deep link and email delivery/failure receipt;
- stable public links after anonymous reload, with private drafts and private sources withheld.

## B-07 — truthful storefront and lawful handoff

Fourteen frontend suites pass 123 assertions across Storefront owner/public routes, public
Commercial projections, regulated-commerce states, external-channel copy, Orders, money safety,
public sharing and shared action targets. Eleven backend suites pass 105 assertions across
Storefront setup/public discovery, regulated policy decisions, informational inventory,
external-access decisions, Commercial checkout guards, payments/webhooks, course-payment lifecycle,
reporting, Stripe raw-body verification and configuration guards.

The accepted boundary is informational publication plus an external handoff only when the exact
policy decision permits it. Missing, stale, conflicting, expired or unsupported evidence remains
default-deny. Product visibility, business roles, a subscription tier or a warning never imply
transaction authority. B-02 remains the only inventory writer. Native marketplace/payout/tax and
promotion automation are not launch requirements.

Remaining live gates:

- populated published storefront/profile/product projection with source/freshness and no test-only
  records;
- external handoff allowed only for an exact reviewed non-regulated or explicitly authorized case;
- denied regulated cases preserve permitted profile/informational inventory without simulating a
  checkout, payment, reservation, delivery, shipping, export or import;
- Stripe/Connect/provider state and webhook delivery are accepted only for the exact launch
  capability that is configured; otherwise the UI labels the operation unavailable.

## B-08 — shared evidence and approval boundary

The B-02 inventory, B-03 Desk, B-04 horticulture, B-05 Facility and B-06/B-07 gates collectively
exercise evidence links, unknown values, source freshness, review-before-write, confirmation,
idempotency, duplicate/conflict handling, redaction, audit attribution, retry and truthful provider
failure. This closes the cross-cutting local construction row; it does not prove production storage,
AI/provider execution, email delivery or live audit visibility.

Remaining live gates are the provider-backed B-03 extraction/Ask/Quote handoff, protected media,
Facility provider imports, report notification and Admin audit paths already named in the canonical
remaining-work ledger. Each must expose unavailable or failed state without a charge, fabricated
result or silent write.

## B-09 — realistic acceptance scenarios

Local suites cover role denial, owner/manager writes, staff/viewer limits, workspace and record
scope, duplicate/retry/idempotency, malformed inputs, stale/unknown provider state, public projection,
regulated default deny and inventory non-mutation. The combined B-02 through B-08 evidence closes
local construction of this row.

The final acceptance remains one deployed-candidate exercise across two intentionally similar
Commercial workspaces, two Facilities and the applicable Free/Pro/Admin identities. It must include
permission change, failed/retried provider operation, cross-workspace denial, public-share privacy,
reload/export/audit and cleanup. Any scenario that cannot execute must retain the exact account,
provider, credential, populated-record or deployment blocker in the live evidence record.

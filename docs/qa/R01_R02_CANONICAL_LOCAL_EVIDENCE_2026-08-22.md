# R-01 and R-02 canonical local evidence

Updated: 2026-08-22  
Frontend reconciliation baseline: `5ac626d84c1fce62da3759b212c7b737164a6c2e`  
Backend acceptance merge: `3d58e7b568e526f203bbe87bfd9a3beb705adbc3`

## Status decision

R-01 and R-02 are implemented and locally accepted. This record does not claim that a real
payment settled, a provider webhook or email arrived, a physical device received a push, or a
production account completed export/deletion. Those provider and authenticated-live gates remain
open below. A missing credential, provider configuration, physical device or disposable account is
an exact acceptance dependency; it is not permission to rebuild the accepted local architecture.

Gift checkout remains intentionally unavailable until every named enablement gate passes. That is
a fail-closed release boundary, not abandoned or hidden work.

## R-01 — money, entitlements, gifts and data rights

The current frontend gate passes 27 suites and 324 assertions across subscription entitlements,
plan status and cancellation safety, gifts and claim/recovery/history, checkout/webhook-facing
states, profile privacy, notification controls, and account export/delete flows.

The current backend gate covers 43 suites and 622 assertions across billing, checkout, Stripe
webhooks, subscriptions and Facility ownership, gifts, recovery/expiry, entitlements, course and
product payment boundaries, data export/deletion, and related notification records. Forty-one
unaffected suites passed 576 assertions in the combined run. The two remaining suites exposed 46
stale expectations rather than product defects: one pinned an obsolete Stripe API version, and one
expected the legacy provider-management status route to treat an unmanaged free account as
manageable. The corrected suites then passed 72 assertions, including all 46 formerly failing
assertions. Backend PR 219 merged those expectation corrections as
`3d58e7b568e526f203bbe87bfd9a3beb705adbc3`.

The accepted boundary keeps canonical account status readable while the legacy provider-management
route fails closed when no manageable Stripe subscription exists. Facility billing remains owned
by the Facility subscription record. Gift Stripe read options use the production configuration
rather than a test-only pinned version.

Remaining provider and authenticated-live gates:

- confirm the production gift index/migration is ready before enabling `GIFT_SUBSCRIPTION_ENABLED`;
- prove one safe worker, purchaser and recipient email delivery, signed-out and cross-device claim,
  entitlement, recovery/expiry, duplicate protection, refund/dispute and cleanup;
- prove live Stripe checkout, verified webhook signature, duplicate/out-of-order reconciliation,
  settlement, cancellation, paid-through expiry/downgrade and truthful failure/recovery states;
- exercise authorized account and Facility plan ownership without source-mismatched management;
- exercise paid-course and configured product payment only where the exact capability is authorized,
  retaining a truthful unavailable state everywhere else;
- use a disposable production identity to export its data, inspect the redacted package, request
  deletion, verify session revocation and absence after reload, and retain cleanup evidence.

No gift, refund, dispute, cancellation, deletion or production purchase is claimed by local tests.

## R-02 — notification preferences and delivery

The same frontend packet proves independent category preferences, Notification Center rendering,
safe exact-record deep-link resolution, read/unread behavior, workspace-correct links, device-token
registration boundaries and web's intentional no-native-push behavior. The backend packet proves
preference persistence, supported event creation, suppression contracts, delivery records, retry
and failure visibility used by the accepted notification architecture.

Remaining provider and physical-device gates:

- configure and verify the production email provider/from identity and worker;
- deliver each required email class, follow its exact record link, and expose failure/retry state to
  Admin without leaking secrets;
- on real iOS and Android devices, prove permission/registration, selected-category receipt,
  opted-out suppression, background/cold-start tap to the exact authorized record, and logout or
  account-switch isolation;
- retain provider receipts, device class, timestamp, deployed frontend/backend SHAs and cleanup
  state as final acceptance evidence.

Do not use an in-app notification record as proof that an email or device notification arrived.

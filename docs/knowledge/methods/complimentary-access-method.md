# Complimentary subscription access

Reviewed October 12, 2026. Implementation policy, not a live-release declaration.
The existing Admin-issued invitation, verified-email claim, audit, expiry and
revocation engine remains authoritative. Never create an alternate billing writer.

## Existing Free/on-claim flow

Pro, Commercial and exact-workspace Facility invitations begin only when the
eligible matching verified recipient claims them. They are nonpaid and do not
renew. Preserve protected identities, provider-history checks, account guards,
Facility ownership and exact workspace binding. A gift cannot overwrite paid time.

## Same-plan after-paid-period extension

The server capability is default OFF. The Admin timing selector is available only
when the server explicitly enables it, for Pro or Commercial, not Facility.
Issuing an invitation does not cancel renewal, charge, refund or replace access.

1. Verify the exact existing same-plan paid Stripe customer, subscription, paid
   invoice and period boundary using bounded server-side reads. Ambiguity blocks.
2. The matching verified recipient stops renewal through the existing Account
   Billing control, then returns to the same invitation. Preserve its secure token
   through sign-in and Billing navigation; never put it in analytics or logs.
3. Claim atomically reserves a scheduled gift after fresh provider verification.
   Current paid access remains in place. A scheduled confirmation is not active
   access, and its displayed start is an estimate, not a guaranteed provider time.
4. After the exact boundary, the existing worker verifies provider cancellation
   and no competing billing authority, then atomically activates a full month/year.
   Delayed verification does not consume gift days. It never starts paid renewal.
5. Revoking a scheduled gift removes only its reservation; it never resumes Stripe
   renewal. Conflicting checkout/gift claims and deleted/restricted accounts block.

The Billing page shows only safe plan/duration/start/status information, separately
from current paid access. It must not expose provider identifiers, tokens or internal
review codes. A blocked gift remains pending review, never silently active.

## Evidence and release boundaries

Paid immediate overrides, cross-plan gifts, Facility scheduling, App Store gifts,
protected-account exceptions and actual paid-subscription changes are not included.
Use official Stripe cancellation documentation for provider semantics, and fresh
bound server state plus local transaction tests for implementation evidence.
Mocked/unit tests are not hosted provider proof. Deployment requires add-only
verification of the scheduled-work index, reviewed staging/production histories,
and separate activation authorization. Never call unshipped scheduling live.

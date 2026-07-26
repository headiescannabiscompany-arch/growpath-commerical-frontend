# Production Email and Stripe Evidence — 2026-07-26

## Scope

Production URL: `https://growpathai.com`

This record distinguishes browser confirmation, delivered-email evidence, Stripe dashboard evidence, deployment evidence, and work that still requires an intentional live transaction.

## Email verification and reset

Real production support-plus QA accounts were used so delivery could be confirmed through the connected `support@growpathai.com` mailbox without using fabricated evidence.

Verified:

- Free registration returned the verification-required state.
- The initial `Verify your GrowPathAI email` message arrived from `GrowPathAI <noreply@growpathai.com>`.
- The delivered confirmation token opened the production verification route.
- Verified-user login reached the Personal workspace.
- A second unverified QA account was blocked at login.
- `Resend verification email` produced a second distinct delivered message.
- The resent token verified the second account and its login succeeded.
- `Reset your GrowPathAI password` arrived through the production provider.
- The delivered one-hour reset token accepted a replacement password.
- Login with the replacement password succeeded.

No passwords, verification tokens, reset tokens, API keys, or webhook secrets are retained in this record.

## Stripe checkout and subscription state

Stripe account: `acct_1SdcSQRYNg3ga5v1`

Dashboard evidence:

- Live mode is active.
- One real Pro subscription exists for `headiescannabiscompany@gmail.com`.
- Its trial ends August 15, 2026.
- Its price is $10 USD per month.
- A prior `checkout.session.completed`, `customer.subscription.created`, and zero-dollar trial `invoice.payment_succeeded` exist on July 16, 2026.
- A new Commercial Checkout session opened at $50 USD per month and returned safely through `?subscription=canceled`.
- A new Facility Checkout session opened at $100 USD per month and returned safely through `?subscription=canceled`.
- No payment was submitted during this verification.

## Webhook repair

The two existing destinations were active but incorrectly scoped to `Connected accounts`, with zero deliveries. GrowPath creates Checkout sessions on the main Stripe account.

Created replacement active destinations:

- `GrowPath payments — account events`
  - `https://api.growpathai.com/api/payments/webhook`
  - `Your account`
  - Six events matching the backend subscription/payment handler.
- `GrowPath facility billing — account events`
  - `https://api.growpathai.com/api/facility-billing/webhook`
  - `Your account`
  - Three events matching the Facility billing handler.

The new signing secrets were saved in Render and deployed as `dep-d9j0u6btqb8s739j566g`. The prior connected-account destinations remain active temporarily as rollback evidence until a new real account event confirms successful delivery.

## Still open

An intentional live payment is required before claiming webhook-confirmed enrollment or entitlement, course unlock, billing refresh after settlement, cancellation/expiry, refund, or dispute evidence. Those actions were not simulated or claimed.

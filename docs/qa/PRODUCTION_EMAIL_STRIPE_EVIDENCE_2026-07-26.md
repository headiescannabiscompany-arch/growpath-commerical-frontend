# Production Email and Stripe Evidence — 2026-07-26

## Scope

Production URL: `https://growpathai.com`

This record distinguishes browser confirmation, delivered-email evidence, Stripe dashboard evidence, deployment evidence, and work that remains after an intentional live Commercial subscription transaction.

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

## Initial Stripe checkout and subscription state

Stripe account: `acct_1SdcSQRYNg3ga5v1`

Dashboard evidence:

- Live mode is active.
- One real Pro subscription exists for `headiescannabiscompany@gmail.com`.
- Its trial ends August 15, 2026.
- Its price is $10 USD per month.
- A prior `checkout.session.completed`, `customer.subscription.created`, and zero-dollar trial `invoice.payment_succeeded` exist on July 16, 2026.
- A new Commercial Checkout session opened at $50 USD per month and returned safely through `?subscription=canceled`.
- A new Facility Checkout session opened at $100 USD per month and returned safely through `?subscription=canceled`.
- No payment was submitted during this initial non-settlement checkpoint.

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

The new signing secrets were saved in Render and deployed as `dep-d9j0u6btqb8s739j566g`. A later intentional Commercial payment confirmed that the replacement account-event destination receives live deliveries.

## Intentional live Commercial subscription

Account: `support+qa-resend-20260726-0907@growpathai.com`

Production evidence:

- A live Commercial Checkout completed at `https://growpathai.com/offers?subscription=success`.
- Stripe charged $50.00 immediately. The account had already consumed its one-time 30-day trial, but the applicable account-specific billing state was not clear enough before Checkout; this exposed a billing-safety copy and confirmation finding.
- The initial account-event deliveries failed while the replacement signing secret was being corrected in Render.
- Backend PR `#83` merged as `2d0164e6fc60d62dc0f52945023f22a5a3bd97e2` and deployed Live as Render deployment `dep-d9j1dh0k1i2s73bfsj50`. It preserves the exact signed bytes across all three Stripe webhook paths and adds a full-app raw-body contract test plus safe signature-rejection diagnostics.
- The focused backend webhook regression passed: 4 suites, 27 tests.
- Manual replay of `checkout.session.completed`, `customer.subscription.updated`, and `invoice.payment_succeeded` returned HTTP 200 from `https://api.growpathai.com/api/payments/webhook`.
- GrowPath then exposed both Personal and Commercial workspace choices and showed plan/mode/subscription as `commercial` / `commercial` / `active`.
- Stripe recorded a full $50.00 refund at July 26, 2026, 10:24:59 AM EDT.
- Stripe scheduled the subscription to cancel at period end on August 26, 2026 at 9:59 AM EDT and now reports `No further invoice`.
- The cancellation-generated `customer.subscription.updated` event was delivered automatically with HTTP 200 at 10:31:11 AM EDT.
- GrowPath correctly retains active Commercial access during the current period. The final downgrade/expiry transition cannot be claimed before August 26.

Evidence types:

- Authenticated in-app Browser review of Stripe payment, subscription, invoice, refund, and event-delivery records.
- Authenticated in-app Browser review of GrowPath workspace selection, Commercial Profile, and account Plan status.
- Render deployment evidence tied to backend commit `2d0164e6fc60d62dc0f52945023f22a5a3bd97e2`.

No card number, password, verification/reset token, API key, or webhook signing secret is retained in this record.

## Checkout billing-safety follow-up

Frontend PR `#240` merged as `809a820625f7edcb9351d93f255a6f98cfc287f7` and deployed Live as Render deployment `dep-d9j203cvikkc73d680o0` on July 26, 2026 at 10:57 AM EDT.

The verified production account had already consumed its one-time 30-day trial, so the backend correctly considered it ineligible for another trial. The frontend now:

- states that the account has already used its 30-day trial;
- states that completing another paid-plan Checkout bills the displayed price;
- keeps the first paid-plan action on GrowPath and changes it to a second explicit price-labeled confirmation;
- refreshes the authenticated account and displays completion feedback on `?subscription=success`; and
- displays that no new payment was submitted on `?subscription=canceled`.

Live in-app Browser verification against `https://growpathai.com/offers?release=809a820&verify=billing-safety` confirmed that the first Pro action did not navigate away and changed to `Continue — billed $10`. The second action was intentionally not pressed, so no new Checkout session or charge was created. The success and cancellation return messages were each verified through their production query routes.

Validation:

- focused Offers billing-safety tests: 3 passed;
- changed-file ESLint: passed;
- production web export: passed and used `https://api.growpathai.com`;
- full GitHub frontend CI, including the complete test suite: passed.

## Still open

- Deploy and live-retest the selected plan-specific policy: each account gets one 30-day trial for Pro, Commercial, and Facility; legacy Boolean-only trial history counts as Pro. Confirm that a remaining plan trial starts at $0, a repeated same-plan checkout uses the explicit immediate-billing confirmation, and both Stripe webhook paths persist the selected plan history.
- Retest the August 26 cancellation expiry and GrowPath downgrade after Stripe emits the terminal lifecycle event.
- Paid course checkout/enrollment/unlock/refund and Facility-plan settlement remain separate live workflows.
- No dispute was created. A real bank dispute would harm the live account and is not an appropriate synthetic QA action.

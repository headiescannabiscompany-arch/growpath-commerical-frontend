# Plan-Specific Trial Production Evidence

Date: 2026-07-31 (America/New_York)

## Release

- Backend plan-specific trial merge: `6420c09` (`483db2c` implementation)
- Current live backend main: `9108f02`
- Frontend truthfulness fix: `8751b196`
- Frontend CI: `30674873586` (passed)
- Production Build Preflight: `30674873637` (passed)
- Production URLs:
  - `https://growpathai.com/offers`
  - `https://api.growpathai.com/api/subscription/status`

## Policy verified

- Each account may receive at most one separate 30-day Stripe trial for Pro,
  Commercial, and Facility.
- Using one plan's trial does not consume another plan's trial.
- Legacy accounts with only the former Boolean `trialUsed` flag map that history
  to Pro, leaving Commercial and Facility eligibility intact.
- Checkout determines eligibility on the backend from persisted per-plan
  history; the frontend display does not grant a trial.

## Confirmed presentation defect and fix

The signed-in account's active plan was Facility. Before frontend `8751b196`,
the Plans header said that a Facility trial was available while the Facility
card simultaneously showed disabled `Current plan`. The backend policy was
correct, but the header counted a non-actionable current plan.

The availability sentence and accessible checkout label now exclude the active
current plan. A later canceled/inactive account may still display a genuinely
unused trial according to the backend's persisted history.

## Live non-destructive acceptance

- The public production setup endpoint returned Stripe `live` mode with
  checkout and webhook configuration enabled.
- Monthly and yearly prices were configured for Pro, Commercial, and Facility.
- Production reported trials enabled for 30 days.
- The signed-in Plans page displayed: `This account has a separate 30-day trial
  available for Pro Grower, Commercial.`
- Pro and Commercial retained named `Start 30-day trial` actions.
- Facility retained a disabled `Current plan` action and was not advertised in
  the availability sentence.
- Monthly/yearly selectors, exact $10/$50/$100 monthly prices, live-charge
  warning, gift controls, and payment-help action remained present.
- No plan action was clicked, no Checkout Session was created, and no payment,
  subscription, trial, or account state changed.

## Automated verification

Ten focused frontend tests passed, covering eligible trials, legacy Pro mapping,
active-plan exclusion, immediate-billing confirmation, checkout success refresh,
gift metadata, payment help, and trialing subscription status. Strict targeted
ESLint, full `tsc --noEmit`, and `git diff --check` passed. Both production
safeguards passed for the exact frontend commit.

The backend plan-specific release includes route, webhook, Facility billing,
authorization, and subscription-access coverage for per-plan history and
repeat-trial prevention.

## Remaining payment acceptance

This pass deliberately did not create another live Checkout. A real first Pro
trial, first Facility trial, repeated same-plan checkout, trial-to-paid
settlement, terminal expiry/downgrade, paid-course settlement, and real dispute
remain open. The previously verified Commercial charge/refund/cancellation case
did not receive its expected trial and predates this policy release; it is not
retroactively treated as proof of the new trial settlement path.

# Gift Safety, Upgrade Heading, and Notification Theme Production Evidence

Date: 2026-07-31 (America/New_York)

## Releases

- Backend gift-checkout safety: PR `#96`, main `adb08e0`
- Backend main CI: `30676063902` (passed)
- Frontend gift-checkout safety: `24831d73`
- Gift Frontend CI: `30676117061` (passed)
- Gift Production Build Preflight: `30676116976` (passed)
- Personal upgrade heading: `53c4495a`
- Heading Frontend CI: `30676475482` (passed)
- Heading Production Build Preflight: `30676475467` (passed)
- Notification Center active-theme fix: `520ede43`
- Notification Frontend CI: `30676909346` (passed)
- Notification Production Build Preflight: `30676909387` (passed)

## Confirmed gift defect and safety boundary

The former frontend collected a recipient email, optional recipient name and
message, and a monthly or yearly gift term, then opened the ordinary
subscription checkout. The authoritative backend did not consume those gift
fields. Its webhook granted the plan to the payer, so taking payment could not
fulfill the advertised recipient handoff.

The production backend now reports `giftCheckoutConfigured: false` and rejects
`giftMode: true` before user lookup or Stripe with HTTP 409 and code
`GIFT_SUBSCRIPTION_NOT_CONFIGURED`. The response states that no checkout or
payment was created. The production frontend reads that capability, disables
`Gift someone else`, omits all recipient fields, explains that recipient
fulfillment and claim delivery are not configured, and retains ordinary
buy-for-me checkout.

This is a payment-safety closure only. Recipient claim, delivery email,
activation, privacy, and recipient-side acceptance remain open, so the gift
subscription feature is not marked complete.

## Live gift and heading acceptance

Signed-in production Browser checks covered `/offers` and
`/home/personal/upgrade` without opening Stripe:

- `Gift subscriptions unavailable` was disabled.
- The unavailable explanation was visible and recipient inputs were absent.
- Ordinary Pro, Commercial, and Facility actions remained at $10, $50, and
  $100 per month.
- No checkout session, payment, subscription, trial, or account mutation was
  created.
- The Personal upgrade page exposed exactly one level-one heading,
  `Upgrade Account`; the internal route title `upgrade/index` was absent.

## Confirmed Notification Center theme defect and live acceptance

With the signed-in Facility account reporting `Current: AUTO / Resolved:
NIGHT`, Dashboard, Profile, and the read-only Inventory create route already
used the Night palette. The shared Notification Center was the confirmed
mismatch: it retained a light green/white canvas and cards.

Frontend `520ede43` replaced those fixed colors with the active app palette for
the page, header, cards, filters, badges, text, links, status feedback, and
loading indicator. The production page
`/home/notifications?workspace=facility` was then reloaded after both safeguards
passed. It displayed the dark blue-gray Night canvas and cards, bright text,
and blue active actions. All six category switches remained visible and on:
Task reminders, Forum replies, Video activity, Courses and lives, Commerce
updates, and Facility alerts. No switch was changed and no preference was
saved during acceptance.

The Browser was returned to `/home/facility/dashboard`; the account was not
logged out.

## Automated verification

- Backend gift routes/webhooks/Facility billing: 31 focused tests passed.
- Frontend gift checkout/API safety: 34 focused tests passed.
- Personal upgrade heading/navigation: 23 focused tests passed.
- Notification Center: 5 focused tests passed, including an explicit Night
  palette regression.
- Targeted ESLint, full frontend `tsc --noEmit`, and `git diff --check` passed
  for the Notification Center release.

## Still open

- Implement and verify the real gift recipient claim, email, activation, and
  recipient-side handoff before enabling gift payment.
- Obtain genuine Pro and Facility Stripe settlement, same-plan repeat-trial,
  trial-to-paid, terminal downgrade, paid-course, and non-synthetic dispute
  evidence in their separately authorized acceptance cases.
- Obtain a real device push receipt; visible preferences and in-app category
  controls do not prove external device delivery.

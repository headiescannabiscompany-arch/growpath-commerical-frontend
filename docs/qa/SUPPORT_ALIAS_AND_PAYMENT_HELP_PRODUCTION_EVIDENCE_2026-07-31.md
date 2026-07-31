# Support Alias and Payment Help Production Evidence

Date: 2026-07-31

## Release

- Frontend source commit: `d395effd`
- Production URL: `https://growpathai.com`
- Deployment trigger: automatic deployment from `main`
- Frontend CI run: `30668214937` (passed)
- Production Build Preflight run: `30668214938` (passed)

Production delivery was confirmed by the live Plans page exposing the new
`Open payment help` control and the palette changes introduced by
`d395effd`.

## Live routes inspected

- `https://growpathai.com/support`
- `https://growpathai.com/privacy`
- `https://growpathai.com/terms`
- `https://growpathai.com/account/delete`
- `https://growpathai.com/offers`

## Findings and fixes

- Support displayed the routed public inboxes for general, billing, orders,
  sales, Commercial, Courses, Lives, Facility, Partners, general contact,
  privacy, legal, and security requests.
- Privacy displayed the privacy, legal, and security inboxes. Terms displayed
  legal and support. Account deletion displayed support.
- The configured 19-address alias contract includes support, help, contact,
  hello, info, admin, billing, orders, sales, partners, privacy, legal,
  security, commercial, facility, courses, live, noreply, and notifications at
  `growpathai.com`.
- Sender-only `noreply@growpathai.com` and
  `notifications@growpathai.com` were absent from all inspected public support
  and policy surfaces.
- Payment Help had existed only as an isolated component. Commit `d395effd`
  exposed it from the live Plans page without changing checkout behavior.
- The Plans page and Payment Help modal now use the active GrowPath palette.
  The live Night-mode retest showed a readable white heading, blue active
  billing control, dark surfaces, bright body text, and themed modal cards.
- The live modal displayed `billing@growpathai.com` and provided Close and Email
  Support actions. The acceptance pass opened and closed help without pressing
  Email Support or any checkout action.

## Automated verification

- `tests/unit/SupportPage.test.tsx`
- `tests/unit/PolicyContactAliases.test.tsx`
- `tests/unit/SupportContactsConfig.test.ts`
- `tests/unit/PaymentHelpDialog.test.js`
- `tests/unit/OffersBillingSafety.test.tsx`

The focused suites passed. They cover the complete configured alias set,
public-route alias copy, sender-only exclusions, the billing mail target, modal
open/close behavior, and the invariant that opening Payment Help does not call
the checkout API. Targeted ESLint, full `tsc --noEmit`, and `git diff --check`
also passed.

## Scope boundary

This evidence proves UI routing, alias configuration, sender-only visibility,
payment-help reachability, and Night-mode readability. It does not independently
prove transactional delivery for every alias, Resend production configuration,
or mailbox receipt. Those delivery requirements remain separately tracked.

No checkout, email, support request, account setting, or application record was
created, changed, or deleted during the production browser pass.

# Deep-dive accessibility production evidence - 2026-07-23

## Acceptance status

Partial. The signed-out production desktop review and one genuine narrow-browser Course
Builder review passed after the fixes below. Authenticated role coverage, a true mobile
device viewport, keyboard/focus traversal, screen-reader traversal, and exported
video remain open. This record does not treat a resized panel as mobile-device proof.

## Release under test

- Frontend behavior commit:
  `fcd1ebde03b1d6b37876cf35132a29da8ed589dc`
- Pull request:
  `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/pull/172`
- Render deployment:
  `dep-d9h80kurnols73dk91c0`
- Production URL:
  `https://growpathai.com`
- Render result:
  Live after a 1 minute 56 second auto-deploy
- Live verification time:
  2026-07-23 5:02 PM EDT

## Findings fixed

1. Shared promoted-campaign labels and calls to action used `#EA580C` on white
   (`3.56:1`). They now use `#C2410C` (`5.18:1`), fixing the same issue on Personal
   Home, Forum/Q&A, and Course Builder.
2. Personal Home plan copy used `#64748B` on the header surface (`4.34:1`). It now
   uses `#475569` (`6.92:1`).
3. Personal tab labels now have explicit active `#0056B3` (`7.04:1`) and inactive
   `#475569` (`7.58:1`) colors on white.
4. The Twitch integration status now uses `#475569` on `#EFF6FF` (`6.96:1`).
5. Course Builder previously exposed no semantic headings. It now exposes the page
   heading and all seven workflow section headings.
6. Personal Home actions and primary Course Builder inputs/buttons now have a
   44-pixel minimum target height.

## Production checks

| Surface | Session and viewport | Result |
| --- | --- | --- |
| Course Builder | Signed out/read-only, 673 x 880 CSS pixels | Eight semantic headings, zero unnamed controls, no horizontal overflow (`673/673`), corrected campaign and integration colors, and no Course Builder form control below 44 pixels. The shared Back and Report Bug controls measured 36 and 40 pixels and remain above the WCAG 2.2 AA 24-pixel minimum. |
| Forum/Q&A | Public/signed out, 1280 x 720 CSS pixels | Main heading present, zero unnamed controls, no horizontal overflow (`1280/1280`), and corrected campaign color. Sign in, Create free account, and Report Bug measured 39, 39, and 40 pixels and remain above the 24-pixel minimum. |
| Personal Home | Free-plan fallback, 1280 x 720 CSS pixels | `Your Garden` heading present, zero unnamed controls, no horizontal overflow (`1280/1280`), corrected plan/campaign/tab colors, and all Personal Home actions at least 44 pixels. The shared Report Bug control measured 40 pixels. |

## Browser evidence

The in-app Browser captured genuine screenshots for all three production URLs during
this task. Each URL includes the full behavior commit as a release marker:

- `https://growpathai.com/courses/create?from=%2Fhome%2Fcommercial%2Fcourses&release=fcd1ebde03b1d6b37876cf35132a29da8ed589dc&verify=accessibility-live`
- `https://growpathai.com/forum?release=fcd1ebde03b1d6b37876cf35132a29da8ed589dc&verify=accessibility-live`
- `https://growpathai.com/home/personal?release=fcd1ebde03b1d6b37876cf35132a29da8ed589dc&verify=accessibility-live`

The Personal Home capture displayed the free-plan fallback and an
`Unable to refresh your grow overview` message. It proves rendered layout and
accessibility properties only; it does not prove authenticated grow-data loading.

## Automated verification

- Focused Jest: 4 suites, 11 tests passed.
- Edited TypeScript/TSX source lint: passed.
- GitHub `lint-and-audit`: passed in 3 minutes 17 seconds, including dependency
  install, Expo checks, production dependency audit, lint, delivery guards, and the
  complete test step.
- Local repository-wide TypeScript still reports existing baseline errors outside
  this accessibility patch.
- The local full Jest run did not terminate because of an existing open-handle
  condition after reporting no test failure; the authoritative GitHub full test
  step passed.

## Remaining acceptance work

- Repeat Personal Home and Course/Lives as authenticated Personal Pro and Commercial
  sessions.
- Run true phone-sized and physical-device checks rather than treating the 673-pixel
  Browser panel as mobile evidence.
- Complete keyboard, focus-order, font-scaling, and screen-reader-name traversal.
- Export durable screenshots/video outside the current Codex task.
- Recheck the existing hard-reload/session-reliability finding separately.


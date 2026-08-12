# Commercial Orders and Analytics State/Accessibility Production Evidence

Date: 2026-08-12

## Released scope

Commercial Orders and Commercial Analytics were hardened together so failed requests do not render a false empty or zero state and write/refresh actions cannot race each other.

Orders now:

- separates initial loading failures from order-update failures;
- retains the last good order list when an update fails;
- prevents overlapping loads and writes;
- requires explicit confirmation before cancelling an order;
- exposes named progress, error, retry, and disabled states; and
- preserves the Commercial order-write capability boundary.

Analytics now:

- does not render a false zero dashboard after a load failure;
- retains the last good metrics while a refresh fails;
- prevents overlapping refreshes;
- exposes named loading, retry, and refresh controls; and
- uses one level-one heading with named section headings and links.

The Commercial workflow method and its runtime/test guards were updated with the same retained-state and accessibility requirements.

## Source and release identity

- Source commit: `e7e495471ed8465be51092a381401aee0d7f3003`
- Branch: `codex/commercial-orders-analytics-state-a11y`
- Pull request: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/pull/472`
- Merged production commit: `74737bbaa7644ea15629a9af80760a82e0fad346`
- Production origin: `https://growpathai.com`

## Automated evidence

- Pull-request Frontend CI run `31548534104`: success for source commit `e7e495471ed8465be51092a381401aee0d7f3003`, completed `2026-08-12T00:08:08Z`.
  - `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/31548534104`
- Main Production Build Preflight run `31549124610`: success for merged commit `74737bbaa7644ea15629a9af80760a82e0fad346`, completed `2026-08-12T00:11:44Z`.
  - `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/31549124610`
- Main Frontend CI run `31549124653`: success for merged commit `74737bbaa7644ea15629a9af80760a82e0fad346`, completed `2026-08-12T00:17:31Z`.
  - `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/31549124653`
- Local focused Orders/Analytics tests: 46 tests passed.
- Local TypeScript, target ESLint, and diff checks: passed.
- Local full delivery guard: passed.
- Local full regression: all 94 Jest batches passed.

## Served production evidence

At `2026-08-12T00:18:05Z`, the cache-busted production Orders route returned HTTP 200:

`https://growpathai.com/home/commercial/orders?release=74737bba&verify=orders-analytics-live`

Observed response identity:

- `last-modified: Wed, 12 Aug 2026 00:10:04 UTC`
- `rndr-id: a4d4849c-412a-4435`
- served bundle: `/_expo/static/js/web/index-f900d4d234036b3b51ff028fccc39c7c.js`

The exact served bundle contained the released markers:

- `Confirm Cancel`
- `Updating commercial order in progress`
- `Keep Order`
- `Loading recorded commercial activity`
- `Refresh commercial analytics`

## In-app Browser evidence

The signed-in Browser session available for this check was a Facility account with Personal and Facility workspaces, not a Commercial workspace.

- Opening the cache-busted Commercial Orders route rendered one `Access denied` heading, the message `This page is only available in commercial mode`, and named Dashboard, Log out, and support actions.
- Opening the cache-busted Commercial Analytics route rendered the same correct Commercial access boundary.
- No browser console warnings or errors were observed during those route checks.

This proves that the released production routes and bundle are live and that a non-Commercial session cannot cross the Commercial boundary. It does not prove a populated signed-in Commercial order update, cancellation, retained-error state, analytics refresh, or data persistence path.

## Remaining acceptance boundary

Keep populated Commercial acceptance open until a real Commercial owner session verifies:

- initial order load, empty state, and load-retry behavior;
- update and cancellation confirmation, failure retention, reload persistence, and linked order/lead state;
- analytics initial load, event-backed totals, last-good-state retention, refresh, breakdowns, and links; and
- screenshots or video tied to the final SHA, production URL, timestamp, Commercial account/role, and checks performed.

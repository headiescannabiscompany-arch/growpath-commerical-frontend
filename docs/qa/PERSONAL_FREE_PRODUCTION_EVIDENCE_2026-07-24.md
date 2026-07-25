# Personal Free production evidence — 2026-07-24

## Release identity

- Production web: `https://growpathai.com`
- Production API: `https://api.growpathai.com`
- Final frontend commit: `4d03dcc29b9cd55fe8ef5e3f57aa06f5316096a7`
- Final backend commit: `64f6d2eaaec2eba31815848ad38534ce721e567b`
- Account: `free@growpathai.com`
- Workspace / role: Personal Free
- Final Browser verification completed:
  `2026-07-25T04:06:37.662Z` (`2026-07-25 12:06 AM ET`)

The final production URLs carried `release=4d03dcc2` and a named `verify`
parameter so the evidence can be distinguished from earlier deployment checks.

## Delivery chain

The backend repair was intentionally split and independently gated:

- PR
  [`#70`](https://github.com/headiescannabiscompany-arch/growpath-commerical/pull/70)
  merged as `c9048fa5c4bca65a74720bec49780767d557625a` at
  `2026-07-25T02:33:06Z`. Locked Free test accounts no longer receive the
  account-age promotional trial.
- PR
  [`#71`](https://github.com/headiescannabiscompany-arch/growpath-commerical/pull/71)
  merged as `a7534d1ce1afd73b274656b9b823148bb0f46090` at
  `2026-07-25T02:48:52Z`. Token reconciliation now uses the locked Free plan and
  restores the canonical five-credit weekly allowance.
- PR
  [`#72`](https://github.com/headiescannabiscompany-arch/growpath-commerical/pull/72)
  merged as `64f6d2eaaec2eba31815848ad38534ce721e567b` at
  `2026-07-25T03:11:18Z`. The Personal grow API now derives `maxGrows` from the
  canonical effective plan and rejects a second Free grow server-side.

Both backend checks passed for PR `#72`. After its production restart,
`GET https://api.growpathai.com/health` returned HTTP 200 at
`2026-07-25T03:12:25.187Z`.

The frontend repair and live-review findings were also split:

- PR
  [`#211`](https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/pull/211)
  merged as `69ab495b438424a7e56e8ae03365a3102fc33b27` at
  `2026-07-25T03:37:46Z`. It combines write capability with the quantitative
  grow limit, blocks the direct New Grow route at the limit, provides truthful
  recovery copy, and removes duplicate Journal and Tasks H1 headings.
- PR
  [`#212`](https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/pull/212)
  merged as the final SHA `4d03dcc29b9cd55fe8ef5e3f57aa06f5316096a7`
  at `2026-07-25T03:59:25Z`. It replaces the raw grow-id H1 with the loaded grow
  name and replaces the unusable Free Forum composer with a read-only recovery.

The frontend `lint-and-audit` gate passed in 3m33s for PR `#211` and in 3m13s
for PR `#212`.

## Production records and inputs

The Browser session used synthetic QA inputs only. No diagnosis claim, plant
identity claim, purchase, subscription, external message, or real cultivation
record was created.

- Grow: `Free QA Tomato Loop 2026-07-24`
  (`6a6425222e9098925d7b6c8d`)
- Plant: `Free QA Tomato 1`, Tomato / `Solanum lycopersicum`
  (`6a6425692e9098925d7b6ca5`)
- Baseline journal entry: `Free QA Tomato baseline`
  (`6a6425a42e9098925d7b6cd1`)
- Task: `Check Free QA tomato environment`
  (`6a6425ca2e9098925d7b6cef`)
- Environment Review ToolRun:
  `6a6425e72e9098925d7b6d07`
- Environment Review journal writeback:
  `6a6425f82e9098925d7b6d11`

The rule-based Environment Review used synthetic values: Veg, 24 °C day,
20 °C night, 60% RH, PPFD 250, CO2 420, and an 18-hour light period. The result
was `review`, with 0 risk flags and 1 issue. It correctly identified its
rule-based provider, retained the Tomato plant context, and charged no AI
credits.

## Final live checks

All checks below were repeated against frontend `4d03dcc2` and backend
`64f6d2e`:

- Fresh login resolved to `plan: free`, Personal mode, and a server-confirmed
  `5 / 5` weekly AI-credit balance.
- The balance reported 0 credits used across 0 billed requests and 0 refunded.
  The rule-based Environment Review did not change the balance.
- The Grows page retained exactly one grow, removed both New Grow entry points,
  and showed: “Free includes one active grow. Upgrade to Pro to create up to 10
  active grows.”
- A direct load of `/home/personal/grows/new` showed the same lock and no grow
  form. No second production grow was created.
- The grow overview used `Free QA Tomato Loop 2026-07-24` as its sole H1; the
  raw Mongo id was not exposed as a heading.
- Grow overview counts remained Journal 2, Tasks 1, Tool Runs 1.
- Plant, baseline journal entry, Environment Review writeback, task, and exact
  ToolRun all reopened with their connected context.
- Explicit hard reloads preserved the grow, plant, journal entries, task, and
  exact saved ToolRun. The ToolRun reopened with Tomato context and
  `status: review`.
- Journal and Tasks each exposed exactly one level-one heading after deployment.
- Personal Free could browse the Forum, expand existing replies, and received
  truthful “Posting is not available” / “Replying is not available” boundaries.
- Directly opening the Forum composer produced a concise read-only screen with
  no title field, grow-interest controls, photo control, or publish action.

## Evidence images

The images are genuine screenshots from the selected in-app Browser tab at
1280 × 720 and were visually inspected after saving.

| Evidence | File | SHA-256 |
| --- | --- | --- |
| Final grow-limit recovery | [`personal-free-grow-limit-4d03dcc2-2026-07-24.jpg`](evidence/personal-free-grow-limit-4d03dcc2-2026-07-24.jpg) | `0A70DD37C7EA56D2D84A236207A617EC3834F945EE1BE255A067BE8E0C00F0CA` |
| Final Free plan and 5/5 credits | [`personal-free-credits-4d03dcc2-2026-07-24.jpg`](evidence/personal-free-credits-4d03dcc2-2026-07-24.jpg) | `9313CCF8900ECF03044ED86276EA372876038E0629596D134546FFC2A1C091AA` |
| Final Forum write lock | [`personal-free-forum-lock-4d03dcc2-2026-07-24.jpg`](evidence/personal-free-forum-lock-4d03dcc2-2026-07-24.jpg) | `458328B06D0952AE5DC2E59045E9CED5D63BF3CCF70E3448A2F6C07E2A50EB21` |
| Final connected grow overview | [`personal-free-connected-grow-4d03dcc2-2026-07-24.jpg`](evidence/personal-free-connected-grow-4d03dcc2-2026-07-24.jpg) | `4B20F7918B7C075E1EC131C41EF36BAA9492440C9B23756A7EB14C8A29D5A95C` |

No video was exported for this focused session. The DOM assertions, exact
record ids, release-tagged URLs, CI runs, API health result, and final-SHA
screenshots are the retained evidence types.

## Local verification notes

- Initial changed-area frontend set: 25 tests passed across 3 suites.
- Live-finding follow-up set: 36 tests passed across 3 suites.
- Touched source lint and `git diff --check` passed.
- The local broad Jest run cleared many suites but entered a silent tail and
  was stopped after ten minutes without a failing assertion. It is not recorded
  as a pass.
- The local production export similarly entered a silent Metro rebuild and was
  stopped after ten minutes. No generated file entered the commit.
- GitHub CI completed the canonical full lint, audit, delivery guard, and test
  gates for both frontend PRs.


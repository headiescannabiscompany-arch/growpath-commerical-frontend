# Twitch backend recovery production evidence

Date: 2026-08-14

## Outcome

The Commercial Lives and Commercial Course Builder frontend already called the
authenticated Twitch connection contract, but production returned `404` because the
corresponding backend router and connection model had never reached backend `main`.
The old conflicting foundation pull request was not merged. Only the missing current
contract was recovered on top of the then-current backend main branch.

Backend pull request `#161` added:

- authenticated status, connect, validate, and disconnect routes;
- a state-bound OAuth callback with a ten-minute expiry;
- encrypted access/refresh credentials and EventSub webhook secret storage;
- raw-body HMAC verification, timestamp freshness, and replay-ID protection;
- Twitch online/offline updates for matching owner Live records; and
- fail-closed production configuration checks and truthful unconfigured guidance.

## Automated evidence

- Focused Twitch, production-configuration, and router-mount checks: 21/21 passed.
- Backend system suite: 32/32 passed.
- Exact changed-file lint and diff checks passed.
- Pull-request checks `lint-and-test` and `test` passed.
- Post-merge backend main workflow `31785393006` passed.

The local aggregate core command also passed 20 of 23 suites and 127 of 152 checks.
Its three failures were an existing Windows MongoMemoryServer temporary-file rename
lock. The existing full-repository lint command separately reports parser/configuration
debt in untouched numeric-separator files and five untouched lint findings. Neither
failure originated in the Twitch files, and GitHub's authoritative checks passed.

## Production evidence

- Backend merge commit: `f072e8402d924014aabf71e1842fabdc98a9d449`.
- Render service: `growpath-api` (`srv-d8tdngn7f7vs73c5qamg`).
- Render live deploy inspected: `dep-d9vdceb71rfs738sof80`.
- Production probes after deployment:
  - `GET https://api.growpathai.com/api/twitch/status` returned `401` without a
    session, proving the route exists and is authentication-protected.
  - `POST https://api.growpathai.com/api/twitch/connect` returned `401` without a
    session for the same reason.
  - a deliberately missing API route returned `404`, distinguishing the restored
    Twitch contract from the generic not-found response.
- In an authenticated Commercial workspace, `/home/commercial/lives` loaded the
  Twitch connection panel, all Live workflow fields, and the truthful state
  `Twitch OAuth is not configured on this deployment.` The Connect action remained
  disabled instead of claiming a connected channel.

## Remaining acceptance boundary

The code and deployed route gap is closed. End-to-end Twitch acceptance is not yet
complete because it requires owner-controlled Twitch developer application
credentials, callback registration, a real broadcaster authorization, EventSub
challenge delivery, online/offline events, and removal/reconnection verification.
Do not claim a connected Twitch channel until those external steps pass.

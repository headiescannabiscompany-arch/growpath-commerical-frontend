# Diagnosis Refund Production Release Evidence

Date: 2026-07-31 (America/New_York)

## Release

- Backend repository: `headiescannabiscompany-arch/growpath-commerical`
- Pull request: `#95`
- Backend main commit: `9108f02`
- Pull-request checks:
  - `test` passed (`30673777701`)
  - `lint-and-test` passed (`30673777757`), including full tests, lint, and
    the API security scan
- Main Backend CI: `30674324042` (passed)
- Production API: `https://api.growpathai.com`

## Confirmed defect

Plant Diagnosis reserved three AI credits before provider work and attempted an
atomic refund when the provider failed. Two acceptance gaps remained:

- the failed response did not state whether the refund succeeded or expose the
  restored balance; and
- the route marked provider work complete before diagnosis and ToolRun
  persistence finished, so a post-provider completion failure could return no
  saved result without refunding the reservation.

IPM already returned its restored balance and had a database-backed provider
failure test. The shared individual and Facility atomic refund service also had
database-backed coverage.

## Fix

- Diagnosis now reports `refunded`, `refund_failed`, or `not_charged` alongside
  zero credits used and the restored balance when available.
- Successful recovery returns `DIAGNOSIS_REFUNDED` and explicitly tells the
  user that all three credits were refunded.
- Failed recovery returns `DIAGNOSIS_REFUND_FAILED` and tells the user not to
  retry until credit recovery is reviewed.
- A diagnosis request is not marked complete until provider usage, Diagnosis,
  ToolRun, automation, and evidence-link persistence finish. Any failure before
  that point invokes the same atomic refund path.

## Automated acceptance

Thirteen focused tests passed across:

- Diagnosis provider timeout after a three-credit reservation;
- Diagnosis persistence failure after provider completion;
- IPM provider failure and one-credit recovery;
- successful individual reservation/completion;
- individual atomic refund; and
- Facility-only reservation/refund without changing the member's individual
  balance.

Targeted ESLint and `git diff --check` passed. GitHub independently passed the
full backend test/lint/security workflows before and after merge.

## Production deployment evidence

Before the merged release, `/health` reported approximately 99,456 seconds of
uptime. Immediately after main CI began, the production API returned HTTP 200
with uptime reset to 24 seconds; the next check remained healthy at 92 seconds.
This proves the live service restarted on the merged main release and remained
available.

## Remaining live acceptance

No provider outage was manufactured and no billable request was sent solely to
force an error. Final live failure acceptance still requires a genuine provider
or completion failure, with the Personal Pro balance and usage ledger captured
before and after, the `DIAGNOSIS_REFUNDED` response reviewed, and the restored
three credits confirmed after hard reload. Independent diagnosis-accuracy,
accessibility, and final screenshot/video review also remain open.

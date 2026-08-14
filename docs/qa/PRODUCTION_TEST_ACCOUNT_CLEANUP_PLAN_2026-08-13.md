# Production test-account cleanup plan — 2026-08-13

## Purpose

Remove synthetic QA, Codex, smoke, and legacy demo identities from the live product before store release without deleting or disabling owner, customer, brand, Facility-team, billing, moderation, or audit evidence.

This is a destructive-data plan. The exact production dry run has completed; permanent
anonymization has not run.

## Production dry-run evidence — 2026-08-14

- Production API deployment: `dep-d9vb0ntbedkc73bapv10`
- Exact ID-and-email allowlist entries resolved: 38 of 38
- Unique target IDs: 38
- Dry runs passed: 38
- Safety blockers: 0
- Missing targets: 0
- Mutations performed: 0

Each authenticated Admin preview reported `Exact production allowlist: approved`,
`Safety blockers: none`, and `Dry run: passed`. The next step is destructive and still
requires explicit action-time owner confirmation. After execution, the required search,
protected-identity, live-brand, Facility, audit, and session-revocation checks below must
be recorded before this cleanup can be marked complete.

## Read-only production inventory

The authenticated platform Admin user search showed 62 registered users on 2026-08-13. Searches for `qa`, `codex`, `test`, and `smoke`, combined with the legacy seed script, identified the exact candidates below. No status or data mutation was performed.

### Exact cleanup candidates

QA and register/probe identities:

- `commercial-qa-1783292679491@growpathai.com`
- `qa+1783708085260@growpathai.com`
- `qa-assign-1782683425696@example.test`
- `qa-assign-ui-1782684135932@example.test`
- `qa-assign-ui-1782685911592@example.test`
- `qa-assign-ui-1782686060783@example.test`
- `qa-batch-probe-1782688388978@example.test`
- `qa-batch-ui-1782688335726@example.test`
- `qa-batch-ui-1782688444736@example.test`
- `qa-batch-ui-1782688490061@example.test`
- `qa-batch-ui-1782688724477@example.test`
- `qa-compliance-1782691115311@example.test`
- `qa-facility-1782679460061@example.test`
- `qa-free-1782678818939@example.test`
- `qa-grow-1782680751294@example.test`
- `qa-growlink-1782684088274@example.test`
- `qa-me-facility-1782686154033@example.test`
- `qa-me-poll-1782686389791@example.test`
- `qa-register-commercial-1782696783761@example.test`
- `qa-register-facility-1782696493102@example.test`
- `qa-register-free-1782696783761@example.test`
- `qa-register-pro-1782696783761@example.test`
- `qa-rooms-1782680510852@example.test`
- `qa-rooms-probe-1782688557050@example.test`
- `support+qa-20260726-0905@growpathai.com`
- `support+qa-resend-20260726-0907@growpathai.com`

Codex and smoke identities:

- `codex-smoke-20260627024515@growpath.test`
- `smoke+1782497727521@growpathai.test`
- `support+codex-mode-free-1783773434744@growpathai.com`
- `support+codex-paid-commercial-1783754195876@growpathai.com`
- `support+codex-paid-facility-1783754195876@growpathai.com`
- `support+codex-paid-pro-1783754195876@growpathai.com`

Legacy seeded demo identities:

- `free@growpathai.com`
- `single@growpathai.com`
- `creator@growpathai.com`
- `commercial@growpathai.com`
- `facility@growpathai.com`

Mistyped synthetic identity:

- `headiescannabiscompsny@gmail.com`

Total exact candidates: 38.

## Protected identities and data

Do not target:

- `admin@growpathai.com`
- the real Headies personal account
- the real Living Soil Labs Commercial account or its brand/storefront/content
- the real Triple Bag Genetics Facility owner, team members, Facility, or operational records
- `john.collins15@alumni.morgan.edu`
- `exploringthegrowinguniverse@gmail.com`
- real outside-user accounts
- payment, refund, invoice, moderation, support, consent, audit, or legal-preservation records required for evidence or accounting

The older `livingsoillabs@triplebaggenetics.com` and `johnc@triplebaggenetics.com` identities remain protected pending explicit owner reconciliation because their names place them inside the two protected brands.

## Required deletion behavior

The live Admin API currently supports audited status changes but not audited platform-owner account deletion. The backend also contains an unsafe all-user deletion script; it must never be used for this cleanup.

The production cleanup operation must:

1. accept only this exact allowlist and reject patterns, globs, empty lists, and broad domains;
2. require the platform Admin role plus an explicit typed confirmation and reason;
3. refuse the current Admin, protected identities, or any user not on the allowlist;
4. reuse the privacy-deletion/anonymization policy instead of blindly cascading historical grow records;
5. revoke sessions and remove public/profile/search visibility immediately;
6. preserve required billing, refund, moderation, support, consent, audit, and legal evidence with anonymized references;
7. produce a dry-run count before mutation and an immutable per-user audit result afterward;
8. be idempotent and safe to retry;
9. verify the 38 candidates no longer appear in user search while protected identities and live brand/Facility records still load;
10. retain redacted before/after evidence with frontend/backend SHAs and the production timestamp.

## Completion gate

This cleanup is complete only after the audited backend operation exists, its focused and full gates pass, the exact dry run is reviewed, the production mutation succeeds for every approved candidate, and the protected-account/live-data regression pass succeeds. Suspend or Ban is not a substitute for deletion/anonymization.

# Data Rights Live Verification

Status: release-machine procedure is automated. Execution remains required with
a disposable production or staging account before store submission.

This check verifies the backend data-rights path end to end:

1. Log in as a disposable account.
2. Call account export.
3. Delete the account.
4. Verify the same credentials can no longer log in.
5. Write redacted evidence under `tmp/spec/data-rights-live/`.

## Command

```powershell
$env:GROWPATH_DATA_RIGHTS_API_URL="https://api.growpathai.com"
$env:GROWPATH_DATA_RIGHTS_EMAIL="disposable@example.com"
$env:GROWPATH_DATA_RIGHTS_PASSWORD="<disposable-password>"
$env:GROWPATH_DATA_RIGHTS_CONFIRM="DELETE_DISPOSABLE_ACCOUNT:disposable@example.com"
npm.cmd run verify:data-rights:live
```

The script refuses to run unless `GROWPATH_DATA_RIGHTS_CONFIRM` exactly matches
`DELETE_DISPOSABLE_ACCOUNT:<email>`.

## Safety Rules

- Use only a disposable account created for this verification.
- Do not use an employee, customer, creator, facility, or commercial account.
- Do not commit generated evidence from `tmp/spec/data-rights-live/`; it is
  intentionally ignored.
- Use HTTPS for release verification. The local insecure override is only for
  backend development validation.

## Passing Result

The command exits `0` and prints:

```text
Data-rights live verification passed. Evidence: tmp\spec\data-rights-live\<timestamp>.json
```

The evidence file redacts the email address and records only HTTP statuses,
request IDs, export top-level keys, and timestamps.

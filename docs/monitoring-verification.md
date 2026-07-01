# Monitoring Verification

Status: production crash monitoring is wired in the app and strict release
preflight now verifies that the configured Sentry DSN accepts events. A
production-like native build must still trigger and confirm one real app crash
event before store submission.

## Automated DSN Check

Run on the release machine after `EXPO_PUBLIC_SENTRY_DSN` is configured:

```powershell
$env:EXPO_PUBLIC_SENTRY_DSN="<production-sentry-dsn>"
npm.cmd run verify:sentry-dsn
```

The script sends a low-severity release verification event directly to the
Sentry project using the public DSN. It does not include user data, auth tokens,
or device identifiers.

Strict preflight also runs this check:

```powershell
$env:EXPO_PUBLIC_SENTRY_DSN="<production-sentry-dsn>"
npm.cmd run release:preflight:strict
```

## Native Build Confirmation

Before store submission, QA or release engineering must verify the SDK path from
a production-like iOS or Android build:

1. Install the production build on a test device.
2. Trigger one controlled test exception from an internal QA-only path or by
   temporarily enabling a release-candidate crash probe.
3. Confirm the event appears in the production Sentry project with the expected
   environment.
4. Record the crash-monitoring owner and triage SLA.

Do not ship a visible user-facing crash trigger.

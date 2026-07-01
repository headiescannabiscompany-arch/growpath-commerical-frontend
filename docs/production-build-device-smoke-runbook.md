# Production Build And Device Smoke Runbook

Status: release-machine procedure is automated for EAS build launch and
evidence capture. Physical-device execution remains required before store
submission.

## Build Commands

Dry run the exact production build commands:

```powershell
npm.cmd run release:builds:dry-run
```

Run both production builds from a trusted release machine:

```powershell
$env:EXPO_PUBLIC_SENTRY_DSN="<production-sentry-dsn>"
$env:GROWPATH_PRODUCTION_BUILD_CONFIRM="BUILD_PRODUCTION_GROWPATH"
npm.cmd run release:builds
```

The script runs:

```text
npx eas build --profile production --platform ios --non-interactive
npx eas build --profile production --platform android --non-interactive
```

It writes command/status evidence under `tmp/spec/release-builds/`. Attach the
EAS build URLs or artifacts from EAS/App Store Connect/Google Play to the release
packet.

## Required Pre-Build Gates

Run these before executing production builds:

```powershell
$env:EXPO_PUBLIC_SENTRY_DSN="<production-sentry-dsn>"
npm.cmd run release:preflight:strict
npm.cmd run verify:data-rights:live
```

Do not run production builds until strict preflight, live URLs, Sentry DSN, and
disposable-account export/delete verification pass.

## Device Smoke Matrix

Execute on at least one physical iOS device and one physical Android device
using the production builds.

| Area | Required evidence |
| --- | --- |
| Launch | App opens from cold start and returns from background without crashing |
| Authentication | Login, logout, failed login, token expiration or forced 401 handling |
| Profile privacy | Data export button returns export response; delete-account UI remains guarded |
| Personal core loop | Create/open grow, add plant, add log/photo, run tool, create task, verify timeline |
| AI diagnosis | Text diagnosis and photo diagnosis path with production provider status recorded |
| Home alerts | Active tasks, diagnosis/tool alerts, and telemetry warning states render correctly |
| Photo upload | Camera/library permission prompt, selected photo upload, remove/change path |
| Export/share | CSV export/share path works on device |
| Commercial | Storefront, products, inventory, orders, links, campaigns, courses surface smoke |
| Facility | Facility select, rooms, batch cycles, SOPs, tasks, reports, equipment, audit logs |
| Payments status | Subscription/payment status surfaces do not grant access from frontend callbacks |
| Offline/error | Offline state, timeout, unavailable API, and retry behavior |
| Notifications | Permission prompt and denied/granted fallback states |
| Monitoring | Controlled production-like crash event appears in Sentry |

## Evidence Format

Record device smoke evidence in `tmp/spec/release-device-smoke/` with:

- Build platform and EAS build URL.
- Device model and OS version.
- Tester name.
- Date/time.
- Pass/fail per matrix row.
- Screenshots or screen recordings for store-critical flows.
- Sentry event link for the controlled monitoring event.

Generated evidence is intentionally ignored by git. Attach it to the release
packet instead of committing it.

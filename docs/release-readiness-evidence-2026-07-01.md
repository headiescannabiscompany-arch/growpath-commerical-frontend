# Release Readiness Evidence - 2026-07-01

Status: engineering pre-live checks pass for the covered frontend flows. Store
submission is still blocked by external release evidence that cannot be produced
inside this workspace.

## Documents Reviewed

- `APP_STORE_CHECKLIST.md`
- `APP_STORE_LISTING.md`
- `QA_TODO.md`
- `FRONTEND_TODO.md`
- `FINAL_VERIFICATION_CHECKLIST.md`
- `STATUS_REALITY_CHECK.md`
- `docs/app-store-deployment-todo.md`
- `docs/app-store-deployment-checklist.md`
- `docs/production-launch-checklist.md`
- `docs/security-compliance-checklist.md`
- `docs/release-config-evidence-2026-06-21.md`
- `docs/release-secret-scan-evidence-2026-06-23.md`
- `docs/release-validation-evidence-2026-06-22.md`
- `docs/eas-submit-runbook.md`
- `docs/store-privacy-data-safety-2026-07-01.md`
- `docs/store-assets-evidence-2026-07-01.md`
- `docs/data-rights-live-verification.md`
- `docs/monitoring-verification.md`
- `docs/live-url-verification.md`

Note: older root-level historical verification notes such as
`FINAL_VERIFICATION_CHECKLIST.md` and `STATUS_REALITY_CHECK.md` contain stale
dates and mojibake from previous runs. They were read for context only. This
document and `APP_STORE_CHECKLIST.md` are the current release-readiness evidence
for the 2026-07-01 pass.

## Current Commits Reviewed

- `081566d` - Surface personal home alerts
- `7b79f0b` - Tighten privacy account release gate
- `b4b7e5a` - Add frontend crash monitoring
- `90a564f` - Block auth debug logs in release scan
- `eb2ea63` - Narrow Android media permissions
- `28e1d03` - Scan production EAS release config
- `6c32f81` - Cover profile account deletion controls

## Passing Local Release Gates

Repeatable command:

```text
npm.cmd run release:preflight
```

Result: passed on 2026-07-01.

The command runs the release scan, UI route inventory, focused release unit
tests, privacy/Home/core-loop Playwright specs, production web export, and
store graphics export.

```text
node scripts\scan-release.cjs
```

Result: passed. Checked 651 files.

```text
npm.cmd test -- tests\unit\monitoring.test.ts tests\release.scan.test.js src\api\__tests__\users.privacy.test.ts tests\unit\ProfilePrivacyControls.test.tsx src\features\personal\__tests__\homeModel.test.ts --runInBand
```

Result: passed. 5 suites, 12 tests.

```text
PLAYWRIGHT_USE_SYSTEM_CHROME=1
PLAYWRIGHT_WEB_PORT=19024
PLAYWRIGHT_DISABLE_VIDEO=1
npx.cmd playwright test e2e/profile-privacy-visual.spec.ts e2e/personal-home-task-sources-visual.spec.ts e2e/personal-core-loop.spec.ts --reporter=list
```

Result: passed. 5 Chromium tests.

Covered:

- Profile privacy/account export and guarded account deletion on desktop and
  mobile.
- Personal Home task source labels, diagnosis/tool/telemetry active alerts, and
  responsive rendering on desktop and mobile.
- Full personal grow core loop: grow -> plant -> log/photo -> tool run -> task
  -> timeline.

```text
npm.cmd run export:web:production
```

Result: passed. `dist` export uses `https://api.growpathai.com`.

```text
npm.cmd run export:store-assets
```

Result: passed. `store-assets/graphics` contains opaque 1024x1024 App Store
icon, opaque 512x512 Google Play icon, and opaque 1024x500 Google Play feature
graphic.

## Strict Release Gate

Repeatable command for the release machine:

```text
npm.cmd run release:preflight:strict
```

Current result: failed by design until production Sentry DSN is provided.

```text
$env:GROWPATH_STRICT_RELEASE='1'; node scripts\scan-release.cjs
```

Result: failed by design until a production frontend crash reporting DSN is
provided.

Blocking finding:

- `EXPO_PUBLIC_SENTRY_DSN` is missing from the production release environment.

Required fix before production build:

1. Create or confirm the production Sentry project for the mobile app.
2. Add `EXPO_PUBLIC_SENTRY_DSN` as an EAS production environment secret or
   protected CI/release-machine environment value.
3. Rerun strict release scan with the DSN present.
4. Confirm `npm.cmd run verify:sentry-dsn` accepts a release verification event.
5. Trigger one controlled captured exception in a production-like build and
   confirm it appears in Sentry.
6. Record the named crash-monitoring owner and triage SLA.

## URL Checks

Configured production URLs in `eas.json`:

- API: `https://api.growpathai.com`
- Privacy: `https://growpathai.com/privacy`
- Terms: `https://growpathai.com/terms`
- Support: `https://growpathai.com/support`
- Delete account: `https://growpathai.com/account/delete`

Local URL verification from this Codex shell is blocked by the Windows TLS
provider:

```text
curl: (35) schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS
```

Required release-machine check before production build:

```powershell
npm.cmd run verify:live-urls
```

Expected result: each URL returns HTTP 200 or a deliberate production redirect
to a 200 page.

## Remaining Production Blockers

These are not placeholders. They are the concrete items that must be completed
outside this local workspace before live testing or store submission.

1. Configure production `EXPO_PUBLIC_SENTRY_DSN` and verify crash capture.
   After the DSN is set, `npm.cmd run release:preflight:strict` must pass on
   the release machine.
2. Confirm live privacy, terms, support, delete-account, and API health URLs
   from a release machine with working TLS.
3. Run `eas build --profile production --platform ios` and retain build
   artifact evidence.
4. Run `eas build --profile production --platform android` and retain build
   artifact evidence.
5. Execute physical-device smoke on iOS and Android production builds:
   authentication, profile export/delete, personal core loop, photo upload,
   diagnosis, Home alerts, offline/error state, and logout.
6. Execute one staging or production-disposable account export and deletion
   request end-to-end against the real backend with
   `npm.cmd run verify:data-rights:live`, then verify the account can no longer
   authenticate.
7. Complete Apple privacy nutrition labels and Google Play data safety answers
   from `docs/store-privacy-data-safety-2026-07-01.md`, then attach
   legal/release-owner sign-off.
8. Attach legal approval for cannabis-related copy, age rating, jurisdiction
   disclaimers, image retention, and AI diagnosis limitations.
9. Capture final store screenshots from validated production builds.
10. Upload the generated store icon and feature graphic package from
    `store-assets/graphics/` after release-owner approval.
11. Assign named release, QA, support, and crash-monitoring owners.

## Current Go / No-Go

No-go for production store submission until the remaining production blockers
above are complete. The covered frontend release paths are ready for the next
release-machine validation pass.

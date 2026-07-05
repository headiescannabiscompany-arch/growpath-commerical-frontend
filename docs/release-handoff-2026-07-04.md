# Release Handoff - 2026-07-04

## Current Step

We are on the step: **commit and push the CI/EAS production build workflow and Expo dependency fixes**.

The last completed verification before this handoff:

- `npm.cmd run release:preflight` passed locally on `PLAYWRIGHT_WEB_PORT=19042`.
- `npx expo install --check` passed locally when run outside the sandbox with `NODE_OPTIONS=--use-system-ca`.
- `npx expo-doctor` passed locally when run outside the sandbox with `NODE_OPTIONS=--use-system-ca`.

If power goes out, resume by checking:

```powershell
git status --short
git log -3 --oneline
gh run list --repo headiescannabiscompany-arch/growpath-commerical-frontend --limit 10
```

Then continue at **Next Actions, item 1** below.

Update after pushing commit `6a9cfaf`: GitHub Actions reached the new `Production Build Preflight` workflow, but the release preflight job failed before EAS because Ubuntu runners do not provide the Windows `powershell` command. Commit `5b6ea2c` patched the release preflight and store asset tests to use `pwsh` on non-Windows runners. Commit `0b6f07c` widened the workflow path filters and reran `Production Build Preflight`; it passed `npm ci`, `expo install --check`, and `expo-doctor`, but failed in the store asset exporter under Ubuntu PowerShell. Commit `a6f28ed` moved store asset generation to a cross-platform Node exporter.

Latest production workflow run:

- Run ID: `28723871790`
- URL: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/28723871790`
- Release preflight: passed.
- Android EAS auth: passed. `npx eas-cli whoami` returned `GrowPathAI Production Build Token (robot) (authenticated using EXPO_TOKEN)`.
- iOS EAS auth: passed. `npx eas-cli whoami` returned `GrowPathAI Production Build Token (robot) (authenticated using EXPO_TOKEN)`.
- Android build start: failed.
- iOS build start: failed.
- Build-start blocker for both platforms: the Expo robot token only has `Viewer` role on `etgujays-organization`; EAS returned `Entity not authorized: AppEntity[6cc46b82-1bf2-4fe8-989a-0f77b7a51370] (viewer = RobotViewerContext, action = READ, ruleIndex = -1)`.
- Rerun of failed EAS jobs started at `2026-07-05T00:20:22Z`; iOS and Android again passed `Confirm EAS authentication` and failed at `Start EAS production build`, confirming this is still an Expo/EAS permission issue.
- Commit `dd537f6` fixed Frontend CI lint failures. Frontend CI run `28724338581` passed all steps: dependency install, Expo dependency check, Expo Doctor, production dependency audit, lint, sensitive-copy guard, delivery guard, and tests.
- Production Build Preflight run `28724338574` passed release preflight, then iOS and Android again passed EAS authentication and failed at `Start EAS production build`. The iOS log still shows the token as `GrowPathAI Production Build Token (robot)` with `etgujays-organization (Role: Viewer)`, followed by the same `Entity not authorized` EAS build-start error.

Current step: update the Expo robot/token permissions so it can read/build the EAS app, then rerun failed jobs or push a no-op workflow change if rerun permissions are unavailable.

## What Changed After Web Deployment

The web deployment commit already pushed:

- Commit: `c741133`
- Message: `Prepare GrowPath release deployment`
- Status: pushed to `origin/main`
- Live web verified at `https://growpathai.com`

New work after that commit:

- Added `.github/workflows/production-build-preflight.yml`.
- Added direct Expo/native peer dependencies to fix GitHub Actions `expo-doctor` failure:
  - `expo-font@~14.0.12`
  - `expo-constants@~18.0.13`
  - `@shopify/react-native-skia@2.2.12`
- Re-ran production web export through `release:preflight`, generating a new `dist` web bundle:
  - old bundle deleted: `dist/_expo/static/js/web/index-c6606531582777dd8992c81acac7b63e.js`
  - new bundle added: `dist/_expo/static/js/web/index-888d1eda26ea1f982c657769bd9838d5.js`

## GitHub Actions Situation

Only one workflow existed before this work:

- `.github/workflows/ci.yml`
- Workflow name: `Frontend CI`

Latest run for commit `c741133`:

- Run ID: `28722374594`
- URL: `https://github.com/headiescannabiscompany-arch/growpath-commerical-frontend/actions/runs/28722374594`
- Result: failed
- Failure step: `Run Expo Doctor`
- Root cause from logs:
  - missing direct peer dependencies: `expo-font`, `expo-constants`, `@shopify/react-native-skia`
  - duplicate/incompatible `expo-font`

Local fix verification:

- After dependency changes, `expo install --check` reports dependencies up to date.
- After dependency changes, `expo-doctor` reports `18/18 checks passed`.

Important limitation:

- Local `gh auth status` reports the default GitHub CLI token is invalid.
- `gh workflow run` failed with HTTP 401.
- Because of that, workflow dispatch could not be triggered manually from this machine.
- Pushing the workflow file to `main` should trigger `.github/workflows/production-build-preflight.yml` because it has a push trigger scoped to that path.

## New Production Build Workflow

Workflow file added:

```text
.github/workflows/production-build-preflight.yml
```

Workflow name:

```text
Production Build Preflight
```

Purpose:

1. Run CI release preflight:
   - `npm ci`
   - `npx expo install --check`
   - `npx expo-doctor`
   - `npm run release:preflight`
2. Confirm EAS authentication using:
   - `EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}`
   - `npx eas-cli whoami`
3. Start no-wait EAS production builds:
   - iOS: `npx eas-cli build --profile production --platform ios --non-interactive --no-wait`
   - Android: `npx eas-cli build --profile production --platform android --non-interactive --no-wait`

User confirmed:

- GitHub Actions repository secret exists:
  - `EXPO_TOKEN`

The next GitHub check should answer:

- Does `npx eas-cli whoami` authenticate successfully with `EXPO_TOKEN`?
- Do both iOS and Android EAS production build jobs start successfully?

## Verification Completed In This Session

Web deployment:

- `git push origin main` succeeded for commit `c741133`.
- `https://growpathai.com` returned 200.
- `https://www.growpathai.com` redirected to apex.
- Public routes returned 200:
  - `/`
  - `/login`
  - `/register`
  - `/store`
  - `/courses`
  - `/privacy`
  - `/terms`
  - `/support`
- `/home/personal` rendered.
- `/home/commercial` and `/home/facility` returned expected access guards when unauthenticated.
- `https://api.growpathai.com/health` returned 200.
- `https://api.growpathai.com/ready` returned 200.

Release checks:

- `npm.cmd run release:preflight` passed before web deployment.
- `npm.cmd run release:preflight` passed again after dependency/workflow changes.
- `npm.cmd run verify:live-urls` passed with `NODE_OPTIONS=--use-system-ca`.
- Evidence written:
  - `tmp/spec/live-url-checks/2026-07-04T23-03-21-546Z.json`
- `npm.cmd run export:store-assets` passed.
- Store graphics present:
  - `store-assets/graphics/app-store-icon-1024.png`
  - `store-assets/graphics/google-play-icon-512.png`
  - `store-assets/graphics/google-play-feature-graphic-1024x500.png`
  - `store-assets/graphics/manifest.json`
- `npm.cmd run release:builds:dry-run` passed and printed the expected EAS build commands.

EAS local check:

- `npx.cmd --cache .npm-cache eas-cli whoami` ran locally.
- Result: `Not logged in`.
- This is expected locally and does not test GitHub `EXPO_TOKEN`.

## Known Blockers That Need Human/Credential Input

App Store / Google Play final go/no-go is still blocked by required release evidence:

- Sentry native crash verification under `tmp/spec/monitoring-validation/`.
- Disposable-account export/delete verification under `tmp/spec/data-rights-live/`.
- Production iOS/Android build evidence under `tmp/spec/release-builds/`.
- Physical-device smoke evidence under `tmp/spec/release-device-smoke/`.
- Store screenshots evidence under `tmp/spec/store-screenshots/`.
- Store-console submission form evidence under `tmp/spec/store-submission/`.
- Legal release sign-off under `tmp/spec/legal-release-signoff/`.
- Named release/support/QA/crash owners under `tmp/spec/release-owners/`.
- Hotfix and rollback plan sign-off under `tmp/spec/hotfix-rollback/`.

Live test pack strict source validation is also blocked:

- `npm.cmd run verify:live-test-packs:sources` fails because there are 514 placeholder source/photo URLs.
- Planning mode passes:
  - `npm.cmd run verify:live-test-packs:sources:planning`

## Next Actions

1. Commit and push this handoff update:

   ```powershell
   git status --short
   git add docs/release-handoff-2026-07-04.md
   git commit -m "Document EAS production build permission blocker"
   git push origin main
   ```

2. Update Expo/EAS credentials:

   - Give the `GrowPathAI Production Build Token (robot)` enough access to the EAS app/project to read the app and start production builds, or replace the `EXPO_TOKEN` GitHub secret with a token from an Expo user/robot that has that access.
   - The current token authenticates, but its organization role is only `Viewer`.

3. Rerun the failed workflow jobs, or trigger the workflow again:

   ```powershell
   gh run list --repo headiescannabiscompany-arch/growpath-commerical-frontend --workflow "Production Build Preflight" --limit 5
   ```

4. If a run appears, inspect jobs:

   ```powershell
   gh run view <run-id> --repo headiescannabiscompany-arch/growpath-commerical-frontend --json status,conclusion,url,jobs
   ```

5. Confirm the EAS auth step:

   Look for this job step:

   ```text
   Confirm EAS authentication
   ```

   Success there means `EXPO_TOKEN` authenticates successfully.

6. Confirm the EAS build start steps:

   Look for:

   ```text
   Start EAS production build
   ```

   Success in both matrix jobs means iOS and Android production builds can authenticate and start.

7. If workflow fails before EAS:

   Fix the first failing preflight step.

8. If workflow fails at EAS auth:

   Recheck the GitHub Actions repository secret name:

   ```text
   EXPO_TOKEN
   ```

   Then confirm the token belongs to an Expo account with access to this EAS project.

9. If workflow starts builds successfully:

   Collect the EAS build URLs from logs and create release evidence under:

   ```text
   tmp/spec/release-builds/
   ```

10. After production builds complete:

   Run or record:

   - physical-device smoke
   - store screenshots
   - monitoring/Sentry evidence
   - data-rights disposable account verification
   - store-console/legal/owners/hotfix evidence

11. Re-run final gate:

    ```powershell
    npm.cmd run release:go-no-go
    ```

## Local Environment Notes

- PowerShell/curl sometimes fail HTTPS with Schannel certificate errors.
- Node and npm commands often need:

  ```powershell
  $env:NODE_OPTIONS='--use-system-ca'
  ```

- Local Expo checks may need escalation because Expo writes to:

  ```text
  C:\Users\jcind\.expo\native-modules-cache
  ```

- GitHub CLI auth is currently invalid locally:

  ```text
  gh auth status
  ```

  reports HTTP auth/token problems.

- The GitHub connector can read workflow logs, but cannot dispatch the workflow in this session.

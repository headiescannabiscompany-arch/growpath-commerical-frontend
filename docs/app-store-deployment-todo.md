# App Store / Deployment Prep TODO

> Status: BLOCKED FOR SUBMISSION
> Last reviewed: 2026-06-23

Store submission must wait until production-mode validation evidence exists.
Current known blockers:

- Playwright workflow coverage for Personal, Commercial, and Facility users
  passed against the static Expo web export and live backend on 2026-06-23.
  The bundled Chromium install is blocked, but `PLAYWRIGHT_USE_SYSTEM_CHROME=1`
  can launch installed Chrome.
- The local V1 AI schema pack is present and schema drift validation passes.
- `eas.json` no longer stores placeholder submit credentials. Real Apple and
  Google submit credentials still need to be supplied outside source control.
- Production iOS/Android builds and real-device smoke validation have not been
  attached as evidence. Local handoff checklists now exist under `tmp/spec/`.

## 1. Release Gate

- DONE: Static-web validation for required P0/P1 workflows against the live
  backend.
- Owner: QA + Engineering
- Current evidence: static web Playwright passed 10 tests using installed
  Chrome, static export at `127.0.0.1:8084`, and live backend at
  `127.0.0.1:5002`: `e2e/auth-shell-capabilities.spec.ts`,
  `tests/growLogs.spec.js`, `e2e/live-shells.spec.ts`,
  `e2e/live-facility-workflows.spec.ts`, and
  `e2e/smoke.personal.grows.spec.ts`.
- Evidence target: `tmp/spec/production_workflow_validation_2026-06-21.md`

- DONE: Backend schema and AI release evidence.
- Owner: Backend Engineering
- Current evidence: `npm run schema:preflight` passes and
  `npx jest tests\ai\ai.schema.drift.test.js --runInBand` passes with 20 active
  tests.
- Evidence target: `tmp/spec/backend_schema_ai_validation_2026-06-21.md`

## 2. Assets

- NOT DONE: Required screenshots for iOS and Android device classes.
- Owner: Product Marketing
- Next action: Capture final screenshots from production builds after workflow
  validation passes.
- Evidence target: `tmp/spec/store_assets_2026-06-21/screenshots/`

- NOT DONE: Final icon and feature graphic package.
- Owner: Design
- Next action: Export App Store and Google Play asset sizes from approved brand
  files.
- Evidence target: `tmp/spec/store_assets_2026-06-21/graphics/`

- PARTIAL: Store descriptions, keywords, privacy URL, and support URL.
- Owner: Product + Legal
- Current evidence: `tmp/spec/store_assets_2026-06-21/metadata.md`
  summarizes source values, listing draft sources, screenshot targets, and
  required release-owner/legal decisions.
- Next action: Confirm final app name, legally approved cannabis language, age
  rating, privacy URL, support URL, and final listing copy.
- Evidence target: `tmp/spec/store_assets_2026-06-21/metadata.md`

## 3. Metadata And Configuration

- PARTIAL: `app.json` release metadata sign-off.
- Owner: Mobile Engineering
- Current values: `name` is `GrowPath`, `slug` is
  `growpath`, `version` is `1.0.0`, iOS bundle identifier and Android
  package are both `com.growpathai.app`. Android verified App Links are not
  configured because the final public domain and hosted verification files are
  not confirmed; the app currently uses its custom scheme only. Twitch embeds
  require `EXPO_PUBLIC_TWITCH_PARENT_HOST` for production builds.
- Current evidence: source-config review captured in
  `docs/release-config-evidence-2026-06-21.md`; base app icon is 1024x1024 and the
  configured splash/icon assets exist.
- Next action: Release owner must confirm identifiers, public deep-link domain,
  Twitch parent host, and App Store/Play Console records before production
  builds.
- Evidence target: `docs/release-config-evidence-2026-06-21.md`

- PARTIAL: EAS submit configuration.
- Owner: Release Engineering
- Current state: Source-controlled placeholder submit values were removed from
  `eas.json`. Local service account JSON and Apple API key files are ignored by
  git. See `docs/eas-submit-runbook.md` and
  `tmp/spec/eas_submit_config_2026-06-21.md`.
- Next action: Store real Apple/Google submit values in a trusted release
  machine or protected CI secrets and confirm credential access.
- Evidence target: `tmp/spec/eas_submit_config_2026-06-21.md`

## 4. Production Builds

- NOT DONE: iOS production build artifact.
- Owner: Release Engineering
- Next action: Run `eas build --profile production --platform ios`.
- Evidence target: `tmp/spec/release_builds_2026-06-21.md`

- NOT DONE: Android production build artifact.
- Owner: Release Engineering
- Next action: Run `eas build --profile production --platform android`.
- Evidence target: `tmp/spec/release_builds_2026-06-21.md`

- NOT DONE: Real-device smoke validation.
- Owner: QA
- Next action: Validate authentication, Personal, Commercial, Facility, payments
  status, permissions, image upload, notifications, offline/error states, and
  logout on physical devices.
- Evidence target: `tmp/spec/release_device_smoke_2026-06-21.md`

## 5. Store Submission

- NOT DONE: App Store Connect and Google Play Console forms.
- Owner: Release Manager
- Next action: Complete listing, privacy, data safety, age rating, pricing,
  compliance, and review notes after production builds are validated.
- Evidence target: `tmp/spec/store_submission_2026-06-21.md`

- NOT DONE: Release notes and version information.
- Owner: Product
- Next action: Finalize changelog from verified functionality only.
- Evidence target: `tmp/spec/store_submission_2026-06-21.md`

## 6. Post-Submission

- NOT DONE: Review monitoring and hotfix plan.
- Owner: Release Manager + Support
- Current evidence: `tmp/spec/post_submission_plan_2026-06-21.md` defines the
  review monitoring, crash/support monitoring, hotfix, and launch-comms plan.
- Next action: Assign named release, support, QA, and crash-monitoring owners.
- Evidence target: `tmp/spec/post_submission_plan_2026-06-21.md`

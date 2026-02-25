# App Store / Deployment Prep Checklist

Date: 2026-02-25
Status policy: each item is `DONE` or `NOT DONE` with owner, next action, and evidence path.

## 1. App Store Assets

- NOT DONE: Final screenshots for required device classes.
- Owner: Product Marketing
- Next action: Capture and export approved screenshots.
- Evidence target: `tmp/spec/store_assets_2026-02-25/screenshots/`

- NOT DONE: Final icon/graphic package and listing copy.
- Owner: Product Marketing
- Next action: Publish icon set and listing text package.
- Evidence target: `tmp/spec/store_assets_2026-02-25/metadata.md`

- NOT DONE: Privacy policy/support URLs validated in listing content.
- Owner: Product + Legal
- Next action: Verify production URLs and insert into listing forms.
- Evidence target: `tmp/spec/store_assets_2026-02-25/urls.md`

## 2. Metadata & Configuration

- NOT DONE: Final `app.json` release metadata sign-off.
- Owner: Mobile Engineering
- Next action: Freeze release version/build numbers and permissions.
- Evidence target: `tmp/spec/release_config_2026-02-25.md`

- NOT DONE: Final bundle identifiers/package names confirmation.
- Owner: Mobile Engineering
- Next action: Verify ids across Expo, Apple, and Google.
- Evidence target: `tmp/spec/release_config_2026-02-25.md`

## 3. Production Builds

- NOT DONE: iOS production build artifact.
- Owner: Release Engineering
- Next action: Run `eas build --profile production --platform ios`.
- Evidence target: `tmp/spec/release_builds_2026-02-25.md`

- NOT DONE: Android production build artifact.
- Owner: Release Engineering
- Next action: Run `eas build --profile production --platform android`.
- Evidence target: `tmp/spec/release_builds_2026-02-25.md`

- NOT DONE: Real-device smoke validation of production builds.
- Owner: QA
- Next action: Execute smoke checklist on test devices.
- Evidence target: `tmp/spec/release_device_smoke_2026-02-25.md`

## 4. Store Submission

- NOT DONE: App Store Connect and Google Play forms complete.
- Owner: Release Manager
- Next action: Fill listing/compliance forms and upload builds.
- Evidence target: `tmp/spec/store_submission_2026-02-25.md`

- NOT DONE: Release notes/version data finalized.
- Owner: Product
- Next action: Finalize release notes and changelog for submission.
- Evidence target: `tmp/spec/store_submission_2026-02-25.md`

## 5. Post-Submission

- NOT DONE: Review monitoring and response plan published.
- Owner: Release Manager + Support
- Next action: Define reviewer-response SLA and hotfix path.
- Evidence target: `tmp/spec/post_submission_plan_2026-02-25.md`

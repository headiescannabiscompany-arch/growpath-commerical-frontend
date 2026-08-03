# App Store / Deployment Prep Checklist

Reconciled: 2026-08-02

Status policy:

- `DONE`: the named source artifact or local evidence exists.
- `PARTIAL`: draft/source evidence exists, but owner, legal, release-machine, or
  store-console acceptance is still required.
- `NOT DONE`: the release artifact or acceptance evidence does not yet exist.

This checklist is synchronized with `docs/app-store-deployment-todo.md` and
`APP_STORE_CHECKLIST.md`. Those files retain the detailed procedures and release
inputs; this file must not turn source readiness into a claim of store submission.

## 1. App Store Assets

- DONE: Final icon and Google Play feature-graphic package exported from the
  current tracked source assets.
- Owner: Design
- Evidence: `docs/store-assets-evidence-2026-07-01.md` and
  `store-assets/graphics/`.
- Next action: Upload the approved files in the store consoles after release-owner
  approval.

- NOT DONE: Final screenshots for all required iPhone, iPad, Android phone, and
  Android tablet device classes.
- Owner: Product Marketing + QA
- Next action: Capture approved screenshots from validated production builds.
- Evidence target: `tmp/spec/store_assets_2026-06-21/screenshots/`
- Procedure: `docs/store-screenshot-capture-runbook.md`

- PARTIAL: Store listing copy and production URLs.
- Owner: Product + Legal
- Current evidence: `APP_STORE_LISTING.md` contains draft listing copy, age-rating
  guidance, review notes, and draft privacy, support, and marketing URLs.
- Next action: Approve the cannabis language, final app name, subtitle, keywords,
  age rating, review notes, and listing copy; then validate every public URL from a
  release machine with working TLS.
- Evidence target: `tmp/spec/store_assets_2026-06-21/metadata.md`

## 2. Metadata And Configuration

- PARTIAL: `app.json` release metadata and store identifiers.
- Owner: Mobile Engineering + Release Owner
- Current source values: app name `GrowPath`, version `1.0.0`, Expo slug
  `growpath-ai`, iOS bundle identifier `com.growpathai.app`, Android package
  `com.growpathai.app`, and custom scheme `growpath`.
- Next action: Confirm these values against the existing EAS project, App Store
  Connect record, and Google Play Console record. Confirm domain ownership before
  enabling App Links or Associated Domains.
- Evidence: `docs/release-config-evidence-2026-06-21.md`

- PARTIAL: EAS submit configuration.
- Owner: Release Engineering
- Current evidence: source-controlled placeholder submit values were removed from
  `eas.json`; local Apple and Google credential files are ignored by git.
- Next action: Supply and verify the real submit credentials through a trusted
  release machine or protected CI secrets.
- Procedure: `docs/eas-submit-runbook.md`

## 3. Release Gate And Production Builds

- DONE: The documented local pre-live release batch, production web export checks,
  backend schema/AI checks, and production DNS/backend-health checks have recorded
  passing evidence.
- Evidence: `docs/release-readiness-evidence-2026-07-01.md` and
  `docs/release-config-evidence-2026-06-21.md`

- NOT DONE: Automated release-machine gate with real production inputs.
- Owner: Release Engineering + QA
- Next action: Configure the production Sentry DSN, disposable data-rights account,
  production-build confirmation, and release-machine confirmation on the trusted
  release machine; then run `npm.cmd run release:machine -- --execute` followed by
  `npm.cmd run release:go-no-go`.
- Evidence target: `tmp/spec/strict-preflight/`, `tmp/spec/data-rights-live/`, and
  `tmp/spec/release-builds/`

- NOT DONE: iOS production build artifact.
- Owner: Release Engineering
- Next action: Run `npm.cmd run release:builds` from a trusted release machine.
- Evidence target: `tmp/spec/release_builds_2026-06-21.md`

- NOT DONE: Android production build artifact.
- Owner: Release Engineering
- Next action: Run `npm.cmd run release:builds` from a trusted release machine.
- Evidence target: `tmp/spec/release_builds_2026-06-21.md`

- NOT DONE: Real-device smoke validation of both production builds.
- Owner: QA
- Next action: Validate authentication, Personal, Commercial, Facility, payment
  status, permissions, uploads, notifications, offline/error states, and logout on
  physical iOS and Android devices.
- Evidence target: `tmp/spec/release_device_smoke_2026-06-21.md`
- Procedure: `docs/production-build-device-smoke-runbook.md`

- NOT DONE: Live disposable-account data export/delete verification.
- Owner: QA + Backend
- Next action: Run `npm.cmd run verify:data-rights:live` with an approved disposable
  account and attach the redacted evidence.
- Evidence target: `tmp/spec/data-rights-live/`

## 4. Store Submission

- PARTIAL: App Store Connect and Google Play Console forms.
- Owner: Release Manager + Legal
- Current evidence: `docs/store-privacy-data-safety-2026-07-01.md` contains
  source-derived Apple privacy and Google Play data-safety inputs.
- Next action: Complete and approve listing, privacy/data-safety, age-rating,
  pricing, compliance, availability, and review-note fields after the production
  builds pass validation.
- Evidence target: `tmp/spec/store_submission_2026-06-21.md`

- PARTIAL: Release notes and version information.
- Owner: Product + Release Owner
- Current evidence: `APP_STORE_LISTING.md` contains draft initial-release copy and
  `CHANGELOG.md` contains the unreleased worktree summary.
- Next action: Finalize the changelog and store-specific release notes from verified
  functionality at the approved release SHA; do not include unverified or deferred
  workflows.
- Evidence target: `tmp/spec/store_submission_2026-06-21.md`

## 5. Post-Submission

- PARTIAL: Review monitoring, support response, crash monitoring, and hotfix plan.
- Owner: Release Manager + Support + QA
- Current procedure: `docs/release-signoff-runbook.md` defines the sign-off process.
- Evidence target: `tmp/spec/post_submission_plan_2026-06-21.md` is not present in
  this worktree and must be produced on the release machine.
- Next action: Assign named owners, attach hotfix/rollback evidence, and record review
  feedback and resubmission decisions after submission.

## Go / No-Go

Store submission remains blocked until the genuine external gates above are complete
and `npm.cmd run release:go-no-go` passes on the trusted release machine.

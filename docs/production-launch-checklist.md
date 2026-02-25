# Production Launch Checklist

Date: 2026-02-25
Status policy: each item is `DONE` or `NOT DONE` with owner, next action, and evidence path.

## 1. Final QA and Regression Testing

- DONE: Regression suite executed in nightly.
- Owner: Engineering
- Evidence: `tmp/overnight/summary_night.txt`, `tmp/overnight/test_night.txt`

- NOT DONE: Cross-device manual flows (iOS/Android/web) fully signed off.
- Owner: QA
- Next action: Execute manual device matrix and attach screenshots/videos per flow.
- Evidence target: `tmp/spec/device_matrix_2026-02-25.md`

- NOT DONE: Accessibility sign-off (screen reader, contrast, font scaling).
- Owner: QA + Product
- Next action: Run accessibility sweep and document findings/remediations.
- Evidence target: `tmp/spec/accessibility_audit_2026-02-25.md`

- NOT DONE: Localization testing.
- Owner: Product
- Next action: Confirm localization scope (enabled/disabled) and test if enabled.
- Evidence target: `tmp/spec/localization_check_2026-02-25.md`

## 2. Security & Compliance Review

- DONE: Sensitive-copy and delivery checks executed nightly.
- Owner: Engineering
- Evidence: `tmp/overnight/sensitive_night.txt`, `tmp/overnight/verify_night.txt`

- NOT DONE: Formal security review sign-off.
- Owner: Security
- Next action: Complete checklist in `docs/security-compliance-checklist.md` and attach report.
- Evidence target: `tmp/spec/security_review_2026-02-25.md`

## 3. App Store/Deployment Prep

- NOT DONE: Store assets and metadata package finalized.
- Owner: Product Marketing
- Next action: Compile screenshots/icons/copy/privacy URLs and upload package.
- Evidence target: `tmp/spec/store_assets_2026-02-25/`

- NOT DONE: Production builds and on-device validation.
- Owner: Release Engineering
- Next action: Run production builds and validate smoke tests on physical devices.
- Evidence target: `tmp/spec/release_builds_2026-02-25.md`

## 4. Monitoring & Analytics

- NOT DONE: Crash reporting and analytics production validation.
- Owner: Platform
- Next action: Verify Sentry/analytics events in production build.
- Evidence target: `tmp/spec/monitoring_validation_2026-02-25.md`

## 5. Backup & Rollback Plan

- NOT DONE: Backup/restore drill and rollback runbook sign-off.
- Owner: Backend/DevOps
- Next action: Execute restore test and record rollback procedure.
- Evidence target: `tmp/spec/rollback_drill_2026-02-25.md`

## 6. Final Documentation & Handoff

- DONE: Product route/button docs updated to current implementation state.
- Owner: Engineering
- Evidence: `docs/product/ROUTES.md`, `docs/product/BUTTON_REGISTRY.md`

- NOT DONE: Support/ops handoff packet.
- Owner: Product + Support
- Next action: Publish support SOP and escalation contacts.
- Evidence target: `tmp/spec/support_handoff_2026-02-25.md`

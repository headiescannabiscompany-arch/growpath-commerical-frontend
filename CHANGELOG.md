# Changelog

## Unreleased

### Fixed

- Preserve the Commercial workspace choice for active or trialing Facility-plan
  accounts without granting Commercial access to users who only share Facility
  membership.
- Consolidate the duplicate Facility Audit Logs and SOP Runs index implementations
  behind their canonical route modules, with route-inventory guards for normalized
  duplicate paths and re-exported default routes.
- Keep one context-appropriate Back control across shared Courses and Forum entry
  points, selected Course details, Facility creation and operational routes, Personal
  Field Study details, and public storefront product/course details instead of
  duplicate page-level Back actions.
- Keep Personal Field Study detail failures recoverable and expose explicit heading and
  alert semantics on Field Study and public storefront detail states.
- Apply the active theme's selected and unselected colors to Commercial and Facility
  workspace tabs.

### Validation

- Add regression coverage for Facility-plan workspace eligibility, invalid-token versus
  unavailable-server auth transitions, canonical route detection, shared Back behavior,
  Field Study recovery, public storefront detail semantics, and narrow workspace tabs.
- Extend the grow-workspace visual audit to fail on horizontal overflow and browser
  runtime errors.
- Pass all 89 frontend CI batches, all 21 backend suites / 193 backend tests, the
  desktop/mobile grow-workspace Playwright audit, and the complete release preflight
  including contracts, 8 focused browser tests, production web export, SEO, and store
  asset verification.

## 2026-02-08

- Initial docs & policies pack generated.

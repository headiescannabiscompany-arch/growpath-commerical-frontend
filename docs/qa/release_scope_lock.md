# Release Scope Lock (Frontend)

This file is the canonical lock for what must be complete before App Store test readiness.

## Roles / Modes
- personal-free
- personal-pro
- commercial
- facility-owner
- facility-manager
- facility-staff
- facility-viewer

## Must-Ship (all roles where applicable)
- Authentication session flow (login, restore, logout).
- Mode-correct landing route (personal/commercial/facility).
- Core navigation shell with non-crashing tab/subpage transitions.
- Stable loading/empty/error states on top-level screens.
- API client stability (`src/api/client.js`) with no parse/runtime corruption.

## Must-Ship by Role
### personal-free
- Personal home shell and primary tabs.
- Feed/forum read + basic interaction paths.
- Gated premium affordances show explicit CTA (not dead button).

### personal-pro
- All personal-free flows plus pro-gated features enabled.
- Courses/live/profile advanced actions exposed where intended.

### commercial
- Commercial home shell and commercial route tree.
- Commercial inventory/tasks/logs screens render and route correctly.
- Commercial-only tools visible and non-crashing.

### facility-owner
- Facility selection + facility shell.
- Full facility tabs and admin tools accessible.
- Audit/compliance/task/log flows reachable.

### facility-manager
- Facility shell + manager-level tools.
- Restricted owner-only tools hidden/disabled with deterministic message.

### facility-staff
- Facility shell + operational tools only.
- Admin-only tools hidden or read-only where required.

### facility-viewer
- Facility shell read-only experience.
- No mutating actions available unless explicitly allowed.

## Can-Slip (post App Store test readiness)
- Non-critical polish screens that are not entry/navigation blocking.
- Optional advanced analytics/creator-commercial add-ons.
- Low-usage admin utility routes without role-critical impact.

## Unknown (needs confirmation)
- Final Stripe marketplace UX boundaries per role (checkout placement, role-specific upsell paths).
  - Missing signal: finalized product/payment flow contract and backend entitlement mapping.
- Final compliance report breadth required for App Store test milestone.
  - Missing signal: locked acceptance list from product/backend stakeholders.

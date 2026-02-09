# ACCOUNT_MODE_CONTRACT.md

## Overview & Intent

This contract defines the canonical account modes, navigation, feature access, and guardrails for GrowPath. It is the immutable source of truth for audits, onboarding, and all future development.

## Canonical Account Modes

There are exactly three account modes. No hybrids, no implicit fallbacks.

- **SINGLE_USER**: Personal grower / individual user. User-owned data only. No facilities, teams, shared resources, or compliance obligations. Limited AI tools.
- **COMMERCIAL**: Brand/operator without facility ops. Brand-level data. Can own brands, manage inventory, SOP templates, genetics, run AI analysis at brand scope, optionally access facilities as a member. No facility-only operations unless a facility context is entered.
- **FACILITY**: Physical grow/regulated operation. Facility-scoped, role-gated data. Requires facilityId. Role-gated (OWNER/MANAGER/STAFF/VIEWER). Full compliance surface, tasks, rooms, grows, deviations, SOP enforcement. May bounce back to Commercial context.

## Mode Resolution Rules

Mode is resolved once, at app entry and on explicit switches.

- type AccountMode = "SINGLE_USER" | "COMMERCIAL" | "FACILITY"
- Resolution order: explicit user selection (mode switcher), route requirements, account entitlements, fallback rules
- Fallback rules: If user has no brands/facilities → SINGLE_USER; If user has brands but no active facility context → COMMERCIAL; If route requires facility and no facilityId → redirect to /home/facility/select
- Never: auto-create facilities, infer facility from past session, carry facilityId across mode switches

## Mode Switching Rules

Allowed transitions:

| From       | To         | Allowed | Rule                             |
| ---------- | ---------- | ------- | -------------------------------- |
| SINGLE     | COMMERCIAL | ✅      | Explicit upgrade/brand creation  |
| SINGLE     | FACILITY   | ❌      | Must go through Commercial first |
| COMMERCIAL | FACILITY   | ✅      | User selects facility            |
| FACILITY   | COMMERCIAL | ✅      | Clears facility context          |
| FACILITY   | SINGLE     | ❌      | Must exit to Commercial first    |

Switch side effects:

- Switching to FACILITY: facilityId must be selected
- Switching away from FACILITY: facilityId is cleared, all facility-scoped stores reset
- Switching to SINGLE: clear brand + facility context

## Route Access Contract

- Global routes: accessible in all modes (/home, /settings, /account, /billing, /ai)
- Commercial routes: require COMMERCIAL mode (/home/commercial, /inventory, /sops, /genetics, /ai/commercial/\*). If accessed in SINGLE → redirect to /upgrade; FACILITY → allowed only if facility context is cleared
- Facility routes: require FACILITY mode and facilityId (/home/facility, /home/facility/compliance/\*, /home/facility/tasks, /home/facility/grows, /home/facility/rooms, /home/facility/team). If accessed without facilityId → redirect to /home/facility/select

## Feature Visibility Matrix

| Feature        | Single   | Commercial   | Facility        |
| -------------- | -------- | ------------ | --------------- |
| Home Dashboard | Limited  | Brand-level  | Facility-level  |
| AI Tools       | Limited  | Full (brand) | Full (facility) |
| Compliance     | ❌       | ❌/Summary   | ✅              |
| Inventory      | ❌       | ✅           | ✅              |
| SOPs           | ❌       | Templates    | Enforced        |
| Deviations     | ❌       | ❌           | ✅              |
| Tasks          | ❌       | ❌           | ✅              |
| Rooms          | ❌       | ❌           | ✅              |
| Grows          | Personal | ❌           | ✅              |
| Team           | ❌       | Brand team   | Facility team   |
| Billing        | ✅       | ✅           | ❌              |

## UI / CTA Rules

Every page must follow one of these patterns:

- Not Visible: feature does not appear at all
- Visible but Disabled: clear reason shown, CTA to upgrade or switch mode
- Fully Active: correct context, data, permissions
- Never: show broken buttons, link to inaccessible routes, assume context exists

## Guardrails & Forbidden Patterns

Mandatory hooks:

- useAccountMode()
- useFacility() (only valid in FACILITY)
- useBrand() (COMMERCIAL/FACILITY only)

Forbidden:

- Reading facilityId outside FACILITY mode
- Feature logic branching on "best guess"
- Implicit upgrades or context reuse

## Change Control

- v1 locked as of 2026-02-08
- All changes must be reviewed and versioned

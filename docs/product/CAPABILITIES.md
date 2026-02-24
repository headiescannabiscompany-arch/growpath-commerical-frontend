# Capabilities (v1 canonical)

## Canonical formats (locked)
- FacilityRole canonical: OWNER | MANAGER | STAFF | VIEWER
  - Legacy alias: TECH -> STAFF

- CapabilityKey canonical: UPPER_SNAKE_CASE
  - All permission checks must normalize to this form

---

## Canonical capability keys (minimum set for v1)
### Cross-mode (used for Single + Commercial)
- AI_ASSISTANT
- FEED_VIEW
- ALERTS_VIEW
- ALERTS_ACK
- DIAGNOSE_BASIC
- DIAGNOSE_AI
- DIAGNOSE_ADVANCED
- DIAGNOSE_EXPORT
- COURSES_VIEW
- SEE_PAID_COURSES
- COURSES_CREATE
- COURSES_ANALYTICS
- COURSES_AFFILIATE
- PUBLISH_COURSES
- FORUM_VIEW
- FORUM_POST
- GROWS_PERSONAL_VIEW
- GROWS_PERSONAL_WRITE
- LOGS_PERSONAL_VIEW
- LOGS_PERSONAL_WRITE
- PLANTS_PERSONAL_VIEW
- PLANTS_PERSONAL_WRITE
- TOOLS_VPD

### Commercial overlays
- COMMERCIAL_HOME
- COMMERCIAL_INVENTORY_VIEW
- COMMERCIAL_INVENTORY_WRITE
- COMMERCIAL_FEED_VIEW
- COMMERCIAL_ALERTS_VIEW
- COMMERCIAL_TASKS_VIEW
- CREATOR_EARNINGS_VIEW
- CREATOR_PAYOUT_REQUEST
- STORE_FRONT_VIEW
- STORE_FRONT_WRITE

### Facility ops (role-based)
- FACILITY_ACCESS
- TEAM_VIEW
- TEAM_INVITE
- TEAM_UPDATE_ROLE
- TEAM_REMOVE
- TASKS_READ
- TASKS_WRITE
- GROWS_READ
- GROWS_WRITE
- PLANTS_READ
- PLANTS_WRITE
- GROWLOGS_READ
- GROWLOGS_WRITE
- GROWLOGS_EXPORT
- GROWLOGS_MULTI
- GROWLOGS_BATCH
- GROWLOGS_COMPLIANCE
- INVENTORY_READ
- INVENTORY_WRITE
- COMPLIANCE_READ
- COMPLIANCE_WRITE
- AUDIT_READ
- SOP_RUNS_READ
- SOP_RUNS_WRITE
- FACILITY_SETTINGS_EDIT
- EXPORT_COMPLIANCE

---

## Alias map (legacy -> canonical)
- TECH -> STAFF
- facility.settings.edit -> FACILITY_SETTINGS_EDIT

Feature-key aliases (snake/lower -> canonical)
- diagnose_ai -> DIAGNOSE_AI
- diagnose_advanced -> DIAGNOSE_ADVANCED
- diagnose_export -> DIAGNOSE_EXPORT
- courses_analytics -> COURSES_ANALYTICS
- courses_create -> COURSES_CREATE
- growlogs_export -> EXPORT_COMPLIANCE
- forum_brand -> FORUM_VIEW (or FORUM_BRAND if you keep it separate)

Entitlements/types.ts style aliases (if present)
- GROWS_VIEW -> GROWS_READ (facility) or GROWS_PERSONAL_VIEW (single) depending on mode
- GROWS_EDIT -> GROWS_WRITE (facility) or GROWS_PERSONAL_WRITE (single)
- TASKS_VIEW -> TASKS_READ
- TASKS_EDIT -> TASKS_WRITE
- PLANTS_VIEW -> PLANTS_READ
- PLANTS_EDIT -> PLANTS_WRITE
- TEAM_MANAGE -> TEAM_INVITE (plus TEAM_UPDATE_ROLE, TEAM_REMOVE)
- TEAM_VIEW -> TEAM_VIEW

Rule: aliases must be applied at the boundary (me ingestion + ent.can()) so UI never depends on raw legacy keys.

---

## Role bundles (Facility v1 = role bundles, not checkbox overrides)
OWNER:
- all facility ops capabilities (TEAM_*, TASKS_*, GROWS_*, PLANTS_*, GROWLOGS_*, INVENTORY_*, COMPLIANCE_*, AUDIT_READ, SOP_RUNS_*, FACILITY_SETTINGS_EDIT, EXPORT_COMPLIANCE)

MANAGER:
- same as OWNER, optionally exclude FACILITY_SETTINGS_EDIT if you want owner-only settings

STAFF:
- TASKS_WRITE, GROWS_WRITE, PLANTS_WRITE, GROWLOGS_WRITE, INVENTORY_WRITE
- no TEAM_* admin keys

VIEWER:
- *_READ keys only (no writes)

---

## Plan mapping (high level)
Free Single:
- everything in Single User is available except hard locks in LIMITS_AND_LOCKS.md
- limits apply

Pro Single:
- same surface; increased limits; optional unlocks: SEE_PAID_COURSES, COURSES_ANALYTICS, DIAGNOSE_ADVANCED

Commercial:
- Pro Single surface + commercial overlays capabilities

Facility:
- facility bundles derived from facilityRole

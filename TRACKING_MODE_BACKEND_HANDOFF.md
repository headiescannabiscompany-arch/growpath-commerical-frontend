# Tracking Mode – Implementation Checklist & Status (Facility OS Primitive)

> Status: CANONICAL
> Owner: Product/Backend
> Date: January 12, 2026
> Last reviewed: 2026-01-24
> Source of truth for: Facility trackingMode, backend contract, and OS-aligned authority

---

## OS Keystone Requirement (Do Not Skip)

All facility workflows depend on:

GET /api/auth/me

It must return enough context to prevent UI guessing:

```json
{
  "id": "...",
  "email": "...",
  "mode": "personal|commercial|facility",
  "plan": "free|pro|commercial|facility",
  "capabilities": { "facility_tracking": true, "batch_tracking": true },
  "facilitiesAccess": [{ "facilityId": "...", "role": "OWNER|MANAGER|STAFF" }]
}
```

Tracking mode is only relevant inside facility mode.

---

## Frontend Delivered (Reality-Based)

### New Screens

- src/screens/facility/FacilitySetupTrackingMode.js
- src/screens/facility/BatchCycleList.js
- src/screens/facility/BatchCycleForm.js

### Modified

- src/api/facility.js (trackingMode + batch cycle functions)
- src/navigation/FacilityTabs.js (tab changes driven by facility.trackingMode)
- src/screens/facility/FacilityDashboard.js (trackingMode card + modal)
- src/screens/facility/PlantForm.js (soft warnings for scale)

Note: UI uses mock/empty states and will not be “feature-complete” until backend primitives exist.

---

## Facility Tracking Modes

Facility.trackingMode enum:

- individual – track plants individually (small grows)
- batch – track by batches/cycles (default; scalable)
- zone – track benches/zones (greenhouse)
- metrc-aligned – checkpoint counts only (compliance-aligned tracking)

Default: batch

---

## Authority Rules (Minimum Required)

- Changing trackingMode: OWNER|MANAGER only
- BatchCycles:
  - Create/update: OWNER|MANAGER
  - View: any facility member
  - Delete: recommend soft-delete (archive) rather than hard delete

These are facility OS operations, not personal-grow convenience actions.

---

## Backend Work Required

### Model Updates

- Facility: add trackingMode (default batch)
- Room: optional trackingModeOverride (nullable)
- Add BatchCycle model
- Optional Phase 2: add Zone model

### Required Endpoints

#### Facility trackingMode

- GET /api/facilities/:id → must include trackingMode
- PATCH /api/facilities/:id → allow { trackingMode } updates (role-gated)

#### Batch cycles (Phase 1)

- GET /api/batch-cycles?facility=...&room=...
- POST /api/batch-cycles
- GET /api/batch-cycles/:id
- PATCH /api/batch-cycles/:id
- DELETE /api/batch-cycles/:id (soft-delete recommended)

#### Zones (Phase 2)

- GET /api/zones?room=...
- POST /api/zones
- PATCH /api/zones/:id
- DELETE /api/zones/:id

---

## Response Contract (Freeze This)

All endpoints must use one consistent format.

Success

```json
{ "success": true, "data": {} }
```

Error

```json
{ "success": false, "message": "User-friendly message", "code": "OPTIONAL_CODE" }
```

---

## Validation Rules (BatchCycle)

- facilityId: required, must exist, must be accessible by user
- roomId: required, must belong to facility
- name: required (1–255)
- estimatedPlantCount: required (>= 1)
- actualPlantCount: optional (>= 0)
- stage: enum default seedling
- startDate: default now
- expectedHarvestDate: required, must be after startDate

Indexes recommended:

- { facilityId: 1, roomId: 1, startDate: -1 }
- { facilityId: 1, stage: 1 }

---

## Integration Expectations (Frontend Calls)

- Facility detail: expects data.trackingMode (or defaults to batch if missing)
- Update facility: PATCH /api/facilities/:id { trackingMode }
- Batch list: expects array of BatchCycle records filtered by facility and optionally room

---

## Migration

- For existing facilities: set trackingMode = "batch"
- Ensure GET responses default to batch if field is missing (backward safety)

---

## Success Criteria

- TrackingMode persists and rehydrates correctly
- FacilityTabs show correct tabs based on mode
- BatchCycle CRUD works with facility scoping + role gating
- No hard plant limits enforced server-side

---

## End

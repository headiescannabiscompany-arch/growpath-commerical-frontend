# Facility Role Evidence Run (2026-02-25)

SOP: `docs/workflows/SOP-VERIFY-FACILITY-001.md`

## Current automated evidence

- Nightly checks pass: `tmp/overnight/summary_night.txt`
- Role gate usage exists in code:
  - `src/screens/facility/FacilityTasks.tsx`
  - `src/screens/facility/SettingsScreen.js`
  - `src/app/home/facility/(tabs)/team.tsx`

## Blocking issue for role proof completion

- Existing auth dump payloads are not facility sessions:
  - `tmp/auth-dumps/raw/me_personal.json`
  - `tmp/auth-dumps/raw/me_commercial.json`
  - `tmp/auth-dumps/raw/me_facility.json`
- All three currently show:
  - `ctx.mode: "personal"`
  - `ctx.facilityId: null`
  - `ctx.facilityRole: null`

Result: role evidence set is NOT DONE.

## Required manual capture (execute exactly)

1. Open 4 isolated sessions: OWNER, MANAGER, STAFF, VIEWER.
2. In each session, capture GET `/api/me` response in DevTools network.
3. Verify and record:
   - `mode === "facility"`
   - `facilityId` matches selected facility
   - `facilityRole` matches session role
4. Force one restricted action per blocked role and capture `403` response.
5. Save screenshots/response snippets under:
   - `tmp/spec/facility-role/owner/`
   - `tmp/spec/facility-role/manager/`
   - `tmp/spec/facility-role/staff/`
   - `tmp/spec/facility-role/viewer/`

## Pass matrix (fill)

- OWNER: `/api/me` __ ; restricted action expected: none ; status __
- MANAGER: `/api/me` __ ; restricted action expected: none ; status __
- STAFF: `/api/me` __ ; forced restricted action 403 __ ; status __
- VIEWER: `/api/me` __ ; forced restricted action 403 __ ; status __

Overall status: NOT DONE (awaiting manual role-session evidence)
Owner: QA + Backend

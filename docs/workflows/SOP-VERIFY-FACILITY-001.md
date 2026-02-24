# SOP-VERIFY-FACILITY-001 (Facility Roles)

Rule: We do not say done. We execute this SOP and mark Verified only after pass.

## Role verification checks (required for every session)
A) Identity + role truth (one screenshot per session)
- In DevTools Network, click GET `/api/me` and confirm:
  - `mode === "facility"`
  - `facilityId` matches the selected facility
  - `facilityRole` is correct (TECH must behave as STAFF)

B) Backend enforcement truth (one forced 403 per restricted role)
- For a role that should be blocked, force one action and confirm:
  - UI disabled or hidden
  - Backend response is 403 (Network response or backend logs)

## Setup
- Backend running on :5001
- Frontend uses `EXPO_PUBLIC_API_URL=http://localhost:5001`
- Create 4 separate sessions (browser profiles/incognito):
  OWNER / MANAGER / STAFF / VIEWER

## 1) OWNER session
- Team: invite manager+test, staff+test, viewer+test (manual link flow)
- Tasks: create -> IN_PROGRESS -> DONE -> assign to another member
Expected: all allowed; no 403s

## 2) MANAGER session
- Tasks: create -> assign -> IN_PROGRESS -> DONE
- Team: invite (allowed per v1 model)
Expected: allowed; no 403s

## 3) STAFF session
- Tasks: create -> IN_PROGRESS -> DONE
- Assign: blocked in UI; backend 403 if forced
- Team/invite: hidden or disabled
Expected: ops write only; no admin

## 4) VIEWER session
- Lists/detail only
- Mutations blocked (UI + backend 403)
- Team/invite: hidden
Expected: read-only

## Planned modules check
- Facility Dashboard shows planned items
- Planned routes show Planned screen; no broken calls

## Results (paste back)
OWNER: invite __ / create __ / assign __ / status __ / /api/me role __
MANAGER: invite __ / create __ / assign __ / status __ / /api/me role __
STAFF: create __ / status __ / assign blocked UI __ / assign backend 403 __ / /api/me role __
VIEWER: view __ / mutate blocked UI __ / mutate backend 403 __ / /api/me role __
Planned modules: ok __

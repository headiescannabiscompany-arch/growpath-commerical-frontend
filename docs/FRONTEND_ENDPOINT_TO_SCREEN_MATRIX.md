# FRONTEND_ENDPOINT_TO_SCREEN_MATRIX

This document maps every frontend screen → every backend endpoint it calls → expected response envelope → normalization rules → error handling contract.

Goal: make the app “3D printable”: you can wire screens deterministically without guessing, and you can spot backend/FE mismatches instantly.

## Global API Contract (All Screens)

**Canonical call path**

- All screens must call API via: `apiRequest(url, options?)` and `endpoints.<fn>(...)`

**Canonical error handling**

- All facility screens use:
  - `const handleApiError = useApiErrorHandler();`
  - `catch (e) { setError(handleApiError(e)); }`
  - `<InlineError error={error} />`

**Canonical success envelopes (frontend expectations)**

- Preferred list envelope: `{ "success": true, "<itemsKey>": [], "count": 0 }`
- Allowed list alternates: `{ "items": [] }`, `{ "<itemsKey>": [] }`, `[]`
- Preferred get-by-id envelope: `{ "success": true, "<entityKey>": { } }`
- Allowed get-by-id alternates: `{ "<entityKey>": { } }`, `{ }`

**Normalization Helpers (Required)**

- `normalizeList(res, keys[])`: returns the first array found among keys, or res.items, or res if array, else []
- `normalizeEntity(res, key)`: returns res[key] if exists, else res if looks like entity, else null

## Screen → Endpoint Matrix

### Root / Auth

- `/` src/app/index.tsx
  - Endpoints: GET /api/me (endpoints.me())
  - Expected: 200 user payload, 401 unauthenticated
- `/(auth)/login` src/app/(auth)/login.tsx
  - Endpoints: POST /api/auth/login (endpoints.authLogin())
  - Expected: 200 token, 401 invalid credentials

### Home

- `/home` src/app/home/index.tsx
  - Endpoints: none required

### Facility Gate & Select

- `/home/facility/select` src/app/home/facility/select.tsx
  - Endpoints: GET /api/facilities/mine (endpoints.facilitiesMine())
  - Expected: { success: true, facilities: [], count: 0 }

### Facility Tabs

- `/home/facility/(tabs)/dashboard` ... `/home/facility/(tabs)/profile`
  - Endpoints: see contract for each tab (tasks, inventory, team, logs, grows, plants, profile)
  - All: gate on facilityId, safe-mount, no detail logic in tab

- `/home/facility/(tabs)/audit-logs` (tab)
  - Endpoints: none (tab is launchpad/stub)
  - Navigation: routes to /home/facility/audit-logs

- `/home/facility/(tabs)/sop-runs` (tab)
  - Endpoints: none (tab is launchpad/stub)
  - Navigation: routes to /home/facility/sop-runs and /home/facility/sop-runs/presets

### Facility Drill-ins

- `/home/facility/audit-logs` src/app/home/facility/audit-logs/index.tsx
  - Endpoints: GET /api/facility/:facilityId/audit-logs (endpoints.auditLogs(facilityId))
  - Preferred: { success: true, items: [], count: 0 }
  - Normalize: list = normalizeList(res, ["items", "auditLogs", "logs"])

- `/home/facility/audit-logs/:id` src/app/home/facility/audit-logs/[id].tsx
  - Endpoints: GET /api/facility/:facilityId/audit-logs/:id (endpoints.auditLogById(facilityId, id))
  - Preferred: { success: true, item: { ... } }
  - Normalize: entity = res.item || res.auditLog || res

- `/home/facility/sop-runs` src/app/home/facility/sop-runs/index.tsx
  - Endpoints: GET /api/facility/:facilityId/sop-runs (endpoints.sopRuns(facilityId))
  - Preferred: { success: true, runs: [], count: 0 }
  - Normalize: list = normalizeList(res, ["runs", "items"])

- `/home/facility/sop-runs/:id` src/app/home/facility/sop-runs/[id].tsx
  - Endpoints: GET /api/facility/:facilityId/sop-runs/:id (endpoints.sopRunById(facilityId, id))
  - Preferred: { success: true, run: { ... } }
  - Normalize: run = res.run || res.item || res

- `/home/facility/sop-runs/presets` src/app/home/facility/sop-runs/presets.tsx
  - Endpoints: GET /api/facility/:facilityId/compare-presets (endpoints.comparePresets(facilityId))
  - DELETE /api/facility/:facilityId/compare-presets/:id (endpoints.comparePresetDelete(facilityId, id))
  - Preferred: { success: true, presets: [], count: 0 }
  - Normalize: list = normalizeList(res, ["presets", "items"])

### AI Tools (Facility Mode)

- `/home/facility/ai` (if present)
  - Endpoints: POST /api/facility/:facilityId/ai/call (endpoints.aiCall(facilityId))
  - Preferred: { success: true, insight: { ... } }
  - Normalize: use your existing normalizeAiInsight(...)

## Status Codes & UX Policy

- 401 UNAUTHENTICATED: useApiErrorHandler must force logout/redirect deterministically.
- 403 FORBIDDEN: show inline: “You don’t have access to this facility or action.”
- 404 NOT_FOUND: show inline: “Not found” and provide a back button.
- 500 INTERNAL_ERROR: show inline error (do not crash), allow retry

## Endpoint Naming Checklist (endpoints.ts)

- Core: me(), authLogin(), facilitiesMine()
- Facility-scoped: tasks(facilityId), inventory(facilityId), facilityTeam(facilityId), grows(facilityId), plants(facilityId), growLogs(facilityId)
- Audit Logs: auditLogs(facilityId), auditLogById(facilityId, id)
- SOP Runs: sopRuns(facilityId), sopRunById(facilityId, id)
- AI: aiCall(facilityId)
- Compare Presets: comparePresets(facilityId), comparePresetDelete(facilityId, id)

## Deterministic Dev Workflow

- Add route file (one screen only)
- Add endpoint fn in endpoints.ts
- Implement screen using: facility gate, apiRequest, useApiErrorHandler + InlineError, normalizeList
- Run: npx expo start -c --web
- If you see index.bundle 500, ignore browser and fix the first Metro error.

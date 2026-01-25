# Frontend ↔ Backend Integration TODO (GrowPath OS Contract)

> Status: CANONICAL
> Owner: Product/Platform
> Date: Jan 12, 2026
> Goal: Replace mock/stub data with real backend workflows without breaking shell separation.

---

## 0) Freeze the OS Contract (Do this first)

- Implement /api/auth/me as the single source of truth
  - Must return: mode, plan, capabilities, facilitiesAccess[]
- Lock one response format
  - Success: { success: true, data }
  - Error: { success: false, message, code? }
- Lock one base URL strategy
  - Dev: http://127.0.0.1:5001/api
  - Prod: environment-driven (no hardcoding in files)
- If these aren’t locked, every other integration will drift.

---

## 1) API Client Foundation

### Base URL & Environment

- Ensure all API modules use the same API client (src/api/client.js)
- Confirm base URL is one place only
  - Example: API_BASE_URL=http://127.0.0.1:5001 and client appends /api

### Auth Token Handling

- Confirm token storage exists (AsyncStorage) and is used consistently
- Add Authorization header automatically in client interceptor/middleware:
  - Authorization: Bearer <token>
- Global handling:
  - 401 → logout + redirect to Login
  - 403 → show “Insufficient permissions” (capability/role issue)

---

## 2) Shell Separation (Non-negotiable)

- Facility screens must live in Facility shell only
- Commercial screens must live in Commercial shell only
- Shared modules must be explicitly shared (not accidentally mounted under Facility)
- Concrete action:
  - Remove commercial routes from FacilityStack / FacilityTabs
  - Create/confirm CommercialStack and mount commercial screens there

---

## 3) Capability Gating (Stop role-only gating)

- For every screen/tool, gate on:
  - mode → capabilities → facilityRole (if facility-scoped)
- Add a small helper:
  - can(capabilityKey) and requireMode(mode)
- Replace “PRO only” comments with actual capability keys, e.g.:
  - capability.ai_diagnose
  - capability.feeding_schedule_ai
  - capability.export_pdf
  - capability.tasks
  - capability.compliance
  - capability.advertising
  - capability.marketplace

---

## 4) Integrate by Workflow (Not by Screen)

### Personal (single-user)

- Dashboard summary pulls real data (grows, plants, recent logs)
- Grow Logs CRUD (already partially wired in prior work)
- Diagnose uses real endpoint + saves result to log/history

### Facility (multi-tenant)

- Facility scoping enforced on every request (facilityId required)
- Tracking mode integration:
  - Facility trackingMode persists and rehydrates
  - BatchCycle CRUD works if mode is batch
- Tasks:
  - Create/assign/complete reflects facility role rules
- Compliance primitives are workflow-based, not CRUD-by-default

### Commercial (storefront/marketing)

- Marketplace browse → real list endpoint
- Purchase flow → creates immutable purchase record
- Earnings ledger → creator dashboard reads real totals
- Communities → real membership + discussions
- Advertising → campaign records exist (platform integrations can be mocked initially)

---

## 5) Error Handling & Observability

- Standardize user-facing error messages from backend message
- Add a global network error banner/toast:
  - offline
  - timeout
  - server unavailable
- Log request IDs (if backend provides them)

---

## 6) Testing (Make tests prove OS rules)

- Run Playwright “live backend” tests per workflow:
  - Auth → /me contract correct
  - Facility scoping enforced
  - Mode gating works (screens disappear when capability false)
- Add 3 critical tests (if missing):
  - Facility user cannot access other facilityId
  - Commercial-only screen not reachable in Facility shell
  - Capability false hides tool + blocks endpoint

---

## 7) Docs & Reference (Make them real)

- Remove references that may not exist:
  - ❌ “Review API docs at /docs/cultivation and /docs/facilities” (only keep if confirmed)
- Replace with:
  - Maintain API_CONTRACT.md with:
    - /auth/me response
    - capability keys list
    - per-mode route map
  - Maintain FRONTEND_SCREEN_MAP.md aligned to shells (Personal / Commercial / Facility)

---

## Immediate Fixes (Based on the drift we saw)

- Delete any doc claiming “frontend 100% complete” unless backend workflows exist
- Replace “integrate vendor/compliance features” with a specific list of primitives + authority rules
- Move commercial screens out of FacilityStack (again)

---

## End

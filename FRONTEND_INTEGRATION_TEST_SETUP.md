# FRONTEND_INTEGRATION_TEST_SETUP.md (GrowPath OS Aligned)

> Status: CANONICAL
> Owner: QA/Platform
> Last reviewed: 2026-01-24
> Source of truth for: Playwright integration test setup, OS contract enforcement, and facility context

---

## Prereqs

Backend running:

```sh
cd C:\growpath-commercial\backend
npm run dev
```

Backend: http://127.0.0.1:5001

Health check:

```sh
curl http://127.0.0.1:5001/api/health
```

---

## Test User + Facility Seeding (OS Correct)

### Create test user

Use the project’s actual endpoints (prefer /register or /signup, but match code).

Example:

POST /api/auth/signup

```json
{
  "email": "equiptest@example.com",
  "password": "Password123",
  "displayName": "Equipment Tester"
}
```

### Create facility + membership

Facility must be created and membership assigned.
Facility role must be one of: OWNER | MANAGER | STAFF

Seed (conceptually):

```json
facilitiesAccess: [{ "facilityId": <ObjectId>, "role": "OWNER" }]
```

---

## Keystone Requirement: /api/auth/me must define reality

All live tests must validate /api/auth/me returns:

```json
{
  "id": "...",
  "email": "...",
  "mode": "facility",
  "capabilities": { "facility": true, "equipment": true },
  "facilitiesAccess": [{ "facilityId": "...", "role": "OWNER" }]
}
```

If this isn’t true, tests should fail immediately with a clear message:

> “Auth contract invalid — cannot run facility integration tests.”

---

## Running Live Integration Tests

```sh
cd C:\growpath-commercial\frontend
npx playwright test tests/playwright/equipment-live.spec.js --headed
```

Optional:

```sh
npx playwright test tests/playwright/equipment-live.spec.js --timeout=120000
```

---

## What Live Tests Must Do (No Storage Hacks)

Live tests should:

- Login via /api/auth/login
- Call /api/auth/me
- Select the facility context using the returned facilitiesAccess
- Run Equipment CRUD

Do not hardcode:

- facility IDs
- storage keys
- “facility-1” unless your DB truly uses string IDs

---

## Endpoint Reference (OS Correct)

### Equipment (facility-scoped)

- GET /api/facilities/:facilityId/equipment
- POST /api/facilities/:facilityId/equipment
- PUT /api/facilities/:facilityId/equipment/:id
- DELETE /api/facilities/:facilityId/equipment/:id

### Plants (should be facility-scoped)

Prefer:

- GET /api/facilities/:facilityId/plants
- POST /api/facilities/:facilityId/plants
- PUT /api/facilities/:facilityId/plants/:id
- DELETE /api/facilities/:facilityId/plants/:id

If the code currently uses /api/plants, document it as legacy and add a TODO:

> “Must be facility-scoped before multi-tenant launch.”

### Grow Logs (should be facility-scoped)

Prefer:

- GET /api/facilities/:facilityId/growlog
- POST /api/facilities/:facilityId/growlog
- PUT /api/facilities/:facilityId/growlog/:id
- DELETE /api/facilities/:facilityId/growlog/:id

---

## Troubleshooting (Add These Two)

### Auth/me mismatch

If login succeeds but tests fail:

- inspect /api/auth/me
- verify it returns mode, capabilities, facilitiesAccess

### Cross-facility leakage

If equipment returns items from other facilities:

- confirm queries always include facilityId
- confirm middleware checks membership for that facilityId

---

## Final Verdict

Your current doc is good test ergonomics, but it still allows:

- wrong roles (ADMIN)
- missing keystone (/auth/me contract)
- non-scoped resources (/api/plants)
- brittle facility selection (storage hacks)

The corrected version makes tests enforce the OS rules — which is exactly what you want Playwright to do.

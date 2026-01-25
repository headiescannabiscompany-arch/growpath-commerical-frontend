# BACKEND IMPLEMENTATION CHECKLIST

> Status: CANONICAL
> Owner: Backend/Product
> Last reviewed: 2026-01-24
> Source of truth for: Backend implementation phases, deliverables, and validation

## Reality Check (Read This First)

Frontend is structurally complete, but backend must define reality:

- Modes, roles, capabilities, money, and authority are defined by backend, not frontend.
- GET /api/auth/me must return the full contract (id, email, role, plan, mode, capabilities, facilitiesAccess[]).
- Facility is an operating context, not just a resource.
- Stripe webhooks and idempotent models are the authority for money and access.
- Playwright and QA tests validate interface contracts, not business truth—backend rules take precedence.

# ...existing checklist content below remains, now under the correct product reality...

**Updated:** 2024-01-15
**Frontend Status:** ✅ 100% COMPLETE
**Backend Status:** ⏳ READY FOR DEVELOPMENT

---

## Quick Start for Backend Team

### 1. Read These Documents (30 min)

- [ ] `BACKEND_COMPLETE_SPECIFICATION.md` - All endpoint specs
- [ ] `DELIVERY_COMPLETE.md` - Architecture overview
- [ ] This file - Implementation checklist

### 2. Setup Backend (1 hour)

- [ ] Clone/create backend repo
- [ ] Install Node.js dependencies
- [ ] Setup MongoDB connection
- [ ] Configure environment variables
- [ ] Enable CORS for localhost:19009

### 3. Implement Phases (Follow Order)

- [ ] Phase 1: Auth + Facility (1-2 days)
- [ ] Phase 2: Equipment (1 day)
- [ ] Phase 3: Plants (1 day)
- [ ] Phase 4: Grow Logs (1 day)
- [ ] Phase 5: Rooms/Tasks/Team (1-2 days)
- [ ] Phase 6: Compliance (1-2 days)
- [ ] Phase 7: Commercial (1 day)
- [ ] Phase 8: Full Validation (1 day)

**Total Estimated Time:** 7-10 days

---

## Phase 1: Authentication & Foundation ⏳

**Priority:** 🔴 CRITICAL
**Duration:** 1-2 days
**Blocks All Other Phases:** YES

### Must Have Test User

```javascript
{
  email: "equiptest@example.com",
  password: "Password123",
  displayName: "Equipment Tester",
  role: "cultivator",
  isCommercial: false,
  facilitiesAccess: [{
    facilityId: "facility-1",
    role: "admin",
    permissions: ["read", "write", "delete"]
  }]
}
```

### Endpoints to Implement

- [ ] POST /auth/register
- [ ] POST /auth/login
- [ ] GET /auth/me
- [ ] GET /facilities
- [ ] GET /facilities/:id
- [ ] POST /facilities
- [ ] PUT /facilities/:id
- [ ] DELETE /facilities/:id

### Models to Create

- [ ] User (email, password, displayName, role, facilitiesAccess[])
- [ ] Facility (name, address, owner, type, area, maxCapacity, rooms[], plants[], equipment[], members[])

### Validation Checklist

- [ ] All 8 endpoints working
- [ ] JWT tokens 24-hour expiration
- [ ] Bearer token required on all endpoints (except register/login)
- [ ] CORS enabled for localhost:19009
- [ ] Test user seeded with facilitiesAccess array
- [ ] Response format matches BACKEND_COMPLETE_SPECIFICATION.md

### Frontend Validation

```bash
npm run test:all
# Should show Phase 1 tests passing
```

---

## Phase 2: Equipment Management 🎯

**Priority:** 🔴 CRITICAL
**Duration:** 1 day
**Blocks:** Phase 5

### Endpoints to Implement

- [ ] GET /facilities/:facilityId/equipment
- [ ] GET /facilities/:facilityId/equipment/:id
- [ ] POST /facilities/:facilityId/equipment
- [ ] PUT /facilities/:facilityId/equipment/:id
- [ ] DELETE /facilities/:facilityId/equipment/:id

### Models to Create

- [ ] Equipment (facilityId, name, type, manufacturer, model, serialNumber, cost, warrantyExpiry, location, powerUsage, maintenanceSchedule, nextMaintenance, notes)

### Test Data Seed

```javascript
{
  facilityId: "facility-1",
  name: "LED Grow Light Panel",
  type: "lighting",
  manufacturer: "GrowLux",
  model: "GL-3000",
  serialNumber: "SN123456",
  purchaseDate: "2023-06-01",
  cost: 1500,
  warrantyExpiry: "2025-06-01",
  location: "room-1",
  powerUsage: 300,
  maintenanceSchedule: 500,
  nextMaintenance: "2024-02-01"
}
```

### Validation Checklist

- [ ] All 5 endpoints working
- [ ] Facility-scoped filtering implemented
- [ ] Test equipment seeded in facility-1
- [ ] Response format matches specification

### Frontend Validation

```bash
node scripts/run-all-tests.js 2
# Should show: equipment-live.spec.js ✅ 3/3 tests passing
```

---

## Phase 3: Plants Management 🌱

**Priority:** 🔴 CRITICAL
**Duration:** 1 day

### Endpoints to Implement

- [ ] GET /plants (with facilityId filter)
- [ ] GET /plants/:id
- [ ] POST /plants
- [ ] PUT /plants/:id
- [ ] DELETE /plants/:id
- [ ] GET /plants/:id/logs
- [ ] POST /plants/:id/logs

### Models to Create

- [ ] Plant (facilityId, strain, plantDate, stage, location, parentPlantId, lineage, healthStatus, tags[], logs[], images[])
- [ ] PlantLog (plantId, date, stageAtTime, height, healthNotes, actionTaken, tags[], images[])

### Test Data Seed

```javascript
{
  facilityId: "facility-1",
  strain: "OG Kush",
  plantDate: "2024-01-01",
  stage: "vegetative",
  location: "room-1",
  lineage: "OG Kush x Wedding Cake",
  notes: "Mother plant, vigorous growth",
  tags: ["mother", "auto-flowering"]
}
```

### Validation Checklist

- [ ] All 7 endpoints working
- [ ] Plant logs can be created and retrieved
- [ ] Facility-scoped filtering working
- [ ] Response format matches specification

### Frontend Validation

```bash
node scripts/run-all-tests.js 3
# Should show: plants-live.spec.js ✅ 2/2 tests passing
```

---

## Phase 4: Grow Logs 📝

**Priority:** 🔴 CRITICAL
**Duration:** 1 day

### Endpoints to Implement

- [ ] GET /growlog (with keyword, dateFrom, dateTo, tags filters)
- [ ] GET /growlog/:id
- [ ] POST /growlog
- [ ] PUT /growlog/:id
- [ ] DELETE /growlog/:id
- [ ] POST /growlog/:id/auto-tag (can return mock tags initially)

### Models to Create

- [ ] GrowLog (facilityId, title, content, date, tags[], author, images[], attachments[])

### Test Data Seed

```javascript
{
  facilityId: "facility-1",
  title: "Week 2 Update - Plants looking great",
  content: "All plants showing healthy growth...",
  date: "2024-01-05T10:00:00Z",
  tags: ["update", "healthy"]
}
```

### Validation Checklist

- [ ] All 6 endpoints working
- [ ] Search/filtering working (keyword, dateFrom, dateTo, tags)
- [ ] Auto-tag endpoint working (mock tags okay initially)
- [ ] Response format matches specification

### Frontend Validation

```bash
node scripts/run-all-tests.js 4
# Should show: grows.spec.js ✅ all tests passing
```

---

## Phase 5: Rooms, Tasks, Team 🏗️

**Priority:** 🟡 MEDIUM
**Duration:** 1-2 days

### Rooms Endpoints

- [ ] GET /facilities/:facilityId/rooms
- [ ] GET /facilities/:facilityId/rooms/:id
- [ ] POST /facilities/:facilityId/rooms
- [ ] PUT /facilities/:facilityId/rooms/:id
- [ ] DELETE /facilities/:facilityId/rooms/:id

### Tasks Endpoints

- [ ] GET /tasks (with status, assignedTo filters)
- [ ] GET /tasks/:id
- [ ] POST /tasks
- [ ] PUT /tasks/:id
- [ ] PUT /tasks/:id/complete
- [ ] DELETE /tasks/:id

### Team Endpoints

- [ ] GET /facilities/:facilityId/team
- [ ] POST /facilities/:facilityId/team/invite
- [ ] PUT /facilities/:facilityId/team/:userId
- [ ] DELETE /facilities/:facilityId/team/:userId

### Models to Create

- [ ] Room (facilityId, name, type, area, temperature, humidity, equipment[], plants[], notes)
- [ ] Task (facilityId, title, description, dueDate, priority, status, assignedTo, assignedBy, recurrence, completedAt)

### Validation Checklist

- [ ] All endpoints working (14 total)
- [ ] Facility-scoped filtering working
- [ ] Task completion workflow working
- [ ] Response format matches specification

### Frontend Validation

```bash
node scripts/run-all-tests.js 5
# Should show: rooms-live.spec.js ✅ 2/2 passing
# Should show: tasks-live.spec.js ✅ 3/3 passing
```

---

## Phase 6: Compliance Features 📋

**Priority:** 🟡 MEDIUM
**Duration:** 1-2 days

### Endpoints to Implement

#### Audit

- [ ] GET /facilities/:facilityId/audit (with user, action, date filters)
- [ ] Auto-log all create/update/delete operations

#### SOP Templates

- [ ] GET /facilities/:facilityId/sop
- [ ] GET /facilities/:facilityId/sop/:id
- [ ] POST /facilities/:facilityId/sop
- [ ] PUT /facilities/:facilityId/sop/:id (with versioning)
- [ ] DELETE /facilities/:facilityId/sop/:id

#### Verification

- [ ] GET /facilities/:facilityId/verification
- [ ] POST /facilities/:facilityId/verification/:recordId
- [ ] PUT /facilities/:facilityId/verification/:recordId/reject

#### Deviations

- [ ] GET /facilities/:facilityId/deviations
- [ ] GET /facilities/:facilityId/deviations/:id
- [ ] POST /facilities/:facilityId/deviations
- [ ] PUT /facilities/:facilityId/deviations/:id/resolve
- [ ] DELETE /facilities/:facilityId/deviations/:id

#### Green Waste

- [ ] GET /facilities/:facilityId/green-waste
- [ ] GET /facilities/:facilityId/green-waste/:id
- [ ] POST /facilities/:facilityId/green-waste
- [ ] DELETE /facilities/:facilityId/green-waste/:id

### Models to Create

- [ ] AuditLog (facilityId, user, action, resourceType, resourceId, resourceName, changes, timestamp, ipAddress)
- [ ] SOP (facilityId, title, content, version, createdBy, lastModifiedBy, steps[])
- [ ] Verification (facilityId, batchId, recordType, recordId, status, verifiedBy, verificationDate)
- [ ] Deviation (facilityId, title, severity, status, reportedBy, reportedDate, rootCause, actionTaken)
- [ ] GreenWaste (facilityId, date, materialType, weight, unit, disposalMethod, approvedBy, manifesto)

### Validation Checklist

- [ ] All endpoints working (22 total)
- [ ] Audit logging auto-triggered for mutations
- [ ] SOP versioning implemented
- [ ] Verification workflow complete
- [ ] Response format matches specification

### Frontend Validation

```bash
node scripts/run-all-tests.js 6
# Should show: compliance-live.spec.js ✅ 5/5 passing
```

---

## Phase 7: Commercial Features 💼

**Priority:** 🟡 MEDIUM
**Duration:** 1 day

### Endpoints to Implement

- [ ] GET /vendors
- [ ] GET /vendors/:id
- [ ] POST /vendors
- [ ] PUT /vendors/:id
- [ ] DELETE /vendors/:id

### Models to Create

- [ ] Vendor (name, type, contactEmail, contactPhone, website, address, city, state, zipCode, rating, reviews)

### Authentication Update

- [ ] Add `isCommercial` flag to user on login
- [ ] Return flag when `GET /auth/me` called

### Test Data

Create vendor or ensure facilities seeded with commercial user flag

### Validation Checklist

- [ ] All 5 endpoints working
- [ ] isCommercial flag returned on auth
- [ ] Commercial users can access vendor endpoints
- [ ] Response format matches specification

### Frontend Validation

```bash
node scripts/run-all-tests.js 7
# Should show: commercial-live.spec.js ✅ 6/6 passing
```

---

## Phase 8: Full E2E Validation ✅

**Priority:** 🔴 CRITICAL
**Duration:** 1 day

### Complete Suite Run

```bash
node scripts/run-all-tests.js
# Expected: 50/50 tests passing ✅
```

### Manual Validation Checklist

- [ ] All 12 feature areas working
- [ ] All 40+ screens render correctly
- [ ] No console errors in browser
- [ ] No backend errors in logs
- [ ] Response times < 2 seconds (95th percentile)
- [ ] All database models populated correctly
- [ ] CORS working for localhost:19009
- [ ] Bearer token validation working
- [ ] Facility scoping enforced everywhere
- [ ] Role-based gating working (commercial vs facility)

### Performance Targets

- [ ] List endpoints: < 500ms
- [ ] Create endpoints: < 1000ms
- [ ] Update endpoints: < 1000ms
- [ ] Delete endpoints: < 500ms

### Security Checks

- [ ] Passwords hashed (bcrypt)
- [ ] JWT tokens validated on all requests
- [ ] Facility scoping prevents cross-facility access
- [ ] Role permissions enforced
- [ ] No sensitive data in logs

---

## Database Schema Checklist

### Collections to Create

- [ ] **users** - Stores user accounts
- [ ] **facilities** - Stores facility records
- [ ] **equipment** - Stores equipment inventory
- [ ] **plants** - Stores plant records
- [ ] **plantLogs** - Stores plant growth logs
- [ ] **growLogs** - Stores facility grow journals
- [ ] **rooms** - Stores facility rooms
- [ ] **tasks** - Stores task assignments
- [ ] **auditLogs** - Stores activity history
- [ ] **sops** - Stores SOP templates
- [ ] **verifications** - Stores verification records
- [ ] **deviations** - Stores deviation incidents
- [ ] **greenWastes** - Stores waste disposal logs
- [ ] **vendors** - Stores vendor information

### Indexes to Create

- [ ] `users.email` (unique)
- [ ] `plants.facilityId`
- [ ] `equipment.facilityId`
- [ ] `rooms.facilityId`
- [ ] `tasks.assignedTo`
- [ ] `tasks.facilityId`
- [ ] `growLogs.facilityId`
- [ ] `growLogs.date`
- [ ] `auditLogs.facilityId`
- [ ] `auditLogs.timestamp`

---

## Testing Roadmap

### Phase 1 Tests

```bash
npm run test:all
# Expected: auth.spec.js passes
```

### Phase 2 Tests

```bash
node scripts/run-all-tests.js 2
# Expected: 3/3 equipment tests pass
```

### Phase 3 Tests

```bash
node scripts/run-all-tests.js 3
# Expected: 2/2 plants tests pass
```

### Phases 4-7 Tests

```bash
node scripts/run-all-tests.js 4  # 5+ tests
node scripts/run-all-tests.js 5  # 10+ tests
node scripts/run-all-tests.js 6  # 5+ tests
node scripts/run-all-tests.js 7  # 6+ tests
```

### Full Suite

```bash
node scripts/run-all-tests.js
# Expected: 50/50 tests pass ✅
```

---

## Common Issues & Fixes

### Issue: Tests Can't Connect to Backend

**Solution:**

- Check backend running on http://127.0.0.1:5001
- Check CORS enabled for localhost:19009
- Check MongoDB connected

### Issue: Test User Not Found

**Solution:**

- Seed user: equiptest@example.com / Password123
- Ensure facilitiesAccess array includes facility-1
- Restart backend server

### Issue: "Facility not found"

**Solution:**

- Seed facility: facility-1
- Ensure user has facilitiesAccess entry for facility-1

### Issue: Playwright Timeout

**Solution:**

- Check frontend running on localhost:19009
- Check navigation ref exposed on window
- Increase timeout in test file

### Issue: CORS Error

**Solution:**

- Add to backend: `app.use(cors({origin: "http://localhost:19009"}))`
- Check preflight requests returning 200
- Check headers match specification

---

## Success Criteria

| Phase | Success Criteria                                    | Frontend Test                               |
| ----- | --------------------------------------------------- | ------------------------------------------- |
| 1     | All auth endpoints working, test user created       | `auth.spec.js`                              |
| 2     | Equipment CRUD working                              | `equipment-live.spec.js` (3/3)              |
| 3     | Plants + logs CRUD working                          | `plants-live.spec.js` (2/2)                 |
| 4     | Grow logs CRUD + search working                     | `grows.spec.js` (all pass)                  |
| 5     | Rooms, Tasks, Team endpoints working                | `rooms-live.spec.js` + `tasks-live.spec.js` |
| 6     | All compliance endpoints working                    | `compliance-live.spec.js` (5/5)             |
| 7     | Vendor endpoints working, isCommercial flag working | `commercial-live.spec.js` (6/6)             |
| 8     | Full suite passing, no console errors               | `node scripts/run-all-tests.js` (50/50)     |

---

## Rollout Timeline

```
Day 1:    Phase 1 (Auth + Facility)
Day 2:    Phase 2 (Equipment)
Day 3:    Phase 3 (Plants)
Day 4:    Phase 4 (Grow Logs)
Day 5-6:  Phase 5 (Rooms/Tasks/Team)
Day 7-8:  Phase 6 (Compliance)
Day 9:    Phase 7 (Commercial)
Day 10:   Phase 8 (Full Validation & QA)
```

---

## Sign-Off

When complete, update this checklist and mark phases as done:

- [ ] Phase 1: ✅ Complete (Date: **\_\_\_**)
- [ ] Phase 2: ✅ Complete (Date: **\_\_\_**)
- [ ] Phase 3: ✅ Complete (Date: **\_\_\_**)
- [ ] Phase 4: ✅ Complete (Date: **\_\_\_**)
- [ ] Phase 5: ✅ Complete (Date: **\_\_\_**)
- [ ] Phase 6: ✅ Complete (Date: **\_\_\_**)
- [ ] Phase 7: ✅ Complete (Date: **\_\_\_**)
- [ ] Phase 8: ✅ Complete (Date: **\_\_\_**)
- [ ] Full Platform: ✅ READY FOR PRODUCTION (Date: **\_\_\_**)

**Completed By:** **\*\***\_\_\_**\*\***
**Date:** **\*\***\_\_\_**\*\***
**Notes:**

---

**For Questions:** Review BACKEND_COMPLETE_SPECIFICATION.md or run individual tests for details.

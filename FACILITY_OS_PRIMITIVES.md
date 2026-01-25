# GrowPath AI – Facility Operating System Data Model (v1)

> Status: CANONICAL
> Owner: Backend/Product
> Last reviewed: 2026-01-24
> Source of truth for: Facility OS primitives, enforcement rules, and backend contract

---

## 0) Non-Negotiables

- Facility is an operating context, not a “project” and not just a foreign key.
- Every facility write path must enforce mode → capability → facilityRole.
- No placeholder CRUD for compliance primitives.
- AuditLog is append-only. Some records are immutable after approval.
- Soft delete only where explicitly allowed.

---

## 1) Keystone Auth Contract (Required)

All enforcement derives from:

GET /api/auth/me

Returns (minimum):

```json
{
  "id": "...",
  "email": "...",
  "role": "personal|commercial|facility",
  "plan": "free|pro",
  "mode": "personal|commercial|facility",
  "capabilities": {
    "facility": true,
    "tasks": true,
    "compliance": true,
    "sops": true,
    "audit": true,
    "inventory": false,
    "reports": false
  },
  "facilitiesAccess": [{ "facilityId": "...", "role": "OWNER|MANAGER|STAFF" }]
}
```

Frontend must not infer facility permissions. Backend is authoritative.

---

## 2) Enforcement Helpers (Backend Required)

Middleware (must exist):

- requireMode("facility")
- requireCapability("tasks"|"compliance"|"sops"|"audit"|"inventory"|"reports")
- requireFacilityRole("OWNER"|"MANAGER"|"STAFF")
- requireFacilityAccess(facilityId) → resolves membership + role

Pattern: All facility-scoped endpoints must:

- authenticate
- require mode facility
- validate access to facilityId
- validate capability
- validate facilityRole
- write audit log for mutations

---

## 3) Capability Keys (Canonical)

Use these exact keys across backend + frontend registry:

- facility
- tasks
- compliance
- sops
- audit
- inventory
- reports
- team
- export

---

## 4) Facility Roles (Canonical)

Facility membership role (contextual per facility):

- OWNER
- MANAGER
- STAFF
  Never implement global PUT /users/:id/role for facility roles.

---

## 5) Deletion + Immutability Rules (Hard)

| Collection   | Allowed Deletes | Immutability                      |
| ------------ | --------------- | --------------------------------- |
| Task         | Soft delete     | editable until completed          |
| AuditLog     | Never           | append-only forever               |
| SOPTemplate  | Never           | versioned; old versions immutable |
| Verification | Never           | append-only; creates history      |
| Deviation    | Never           | status machine; no delete         |
| GreenWaste   | Never           | immutable after approval          |
| Vendor       | Soft delete     | editable; rating derived          |

---

## 6) Status Machines (Prevent CRUD Drift)

### 6.1 Task

status: open → in_progress → completed (optional: blocked, cancelled)

- STAFF can update status to completed only if assignedTo = self (or MANAGER override)
- Only OWNER/MANAGER can assign/reassign

### 6.2 Verification

status: pending → approved OR rejected

- Only OWNER/MANAGER can approve/reject
- Approved/rejected records are immutable (new record for changes)
- Rejection requires rejectionReason

### 6.3 Deviation

status: open → investigating → resolved (or closed)

- Anyone can create
- Only OWNER/MANAGER can resolve/close
- Resolution requires rootCause + actionTaken + resolvedBy + resolvedDate

### 6.4 GreenWaste

States (via fields): draft (no approvedBy), approved (has approvedBy, manifesto optional)

- Only OWNER/MANAGER can approve
- Once approved: immutable (no edits), corrections require a new record + audit note

---

## 7) Schemas (Primitives)

### 7.1 Task

```js
{
  _id: ObjectId,
  facilityId: ObjectId,
  title: String,
  description: String,
  dueDate: Date,
  priority: "low"|"medium"|"high"|"critical",
  status: "open"|"in_progress"|"blocked"|"completed"|"cancelled",
  assignedTo: ObjectId,      // User
  assignedBy: ObjectId,      // User
  recurrence: String,        // optional RFC5545-lite or internal format
  completedAt: Date,
  notes: String,
  deletedAt: Date,           // soft delete
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- { facilityId: 1, dueDate: 1 }
- { facilityId: 1, status: 1 }
- { facilityId: 1, assignedTo: 1, status: 1 }

### 7.2 AuditLog (Append-Only)

```js
{
  _id: ObjectId,
  facilityId: ObjectId,
  user: { _id: ObjectId, email: String, displayName: String },
  action: "created"|"updated"|"deleted"|"status_changed"|"role_changed"|"verified"|"exported",
  resourceType: String,
  resourceId: ObjectId,
  resourceName: String,
  changes: Object,
  timestamp: Date,
  ipAddress: String
}
```

Rules: No updates/deletes. Only server can create.
Indexes:

- { facilityId: 1, timestamp: -1 }
- { facilityId: 1, resourceType: 1, timestamp: -1 }

### 7.3 SOPTemplate (Versioned)

```js
{
  _id: ObjectId,
  facilityId: ObjectId,
  title: String,
  description: String,
  content: String,
  version: Number,
  createdBy: ObjectId,
  lastModifiedBy: ObjectId,
  steps: [{ stepNumber: Number, title: String, instructions: String, duration: String }],
  createdAt: Date,
  updatedAt: Date
}
```

Rules: “Edit” = create new version. Only OWNER/MANAGER can publish.
Indexes:

- { facilityId: 1, title: 1, version: -1 }

### 7.4 Verification (Approval Ledger)

```js
{
  _id: ObjectId,
  facilityId: ObjectId,
  batchId: String,
  recordType: String,
  recordId: ObjectId,
  recordTitle: String,
  status: "pending"|"approved"|"rejected",
  verifiedBy: ObjectId,
  verificationDate: Date,
  rejectionReason: String,
  notes: String,
  createdAt: Date
}
```

Rules: append-only history, no updates after approved/rejected (new record required)
Indexes:

- { facilityId: 1, recordType: 1, recordId: 1, createdAt: -1 }
- { facilityId: 1, status: 1, createdAt: -1 }

### 7.5 Deviation (Incident System)

```js
{
  _id: ObjectId,
  facilityId: ObjectId,
  title: String,
  description: String,
  severity: "low"|"medium"|"high"|"critical",
  status: "open"|"investigating"|"resolved"|"closed",
  reportedBy: ObjectId,
  reportedDate: Date,
  rootCause: String,
  actionTaken: String,
  resolvedDate: Date,
  resolvedBy: ObjectId,
  preventiveMeasures: String,
  attachments: [String],
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- { facilityId: 1, status: 1, reportedDate: -1 }
- { facilityId: 1, severity: 1, reportedDate: -1 }

### 7.6 GreenWaste (Regulatory Record)

```js
{
  _id: ObjectId,
  facilityId: ObjectId,
  date: Date,
  materialType: String,
  weight: Number,
  unit: String,
  description: String,
  disposalMethod: String,
  approvedBy: ObjectId,
  manifesto: String,
  createdAt: Date
}
```

Rules: immutable after approvedBy is set
Indexes:

- { facilityId: 1, date: -1 }

### 7.7 Vendor (Commercial + Facility Only)

```js
{
  _id: ObjectId,
  name: String,
  type: String,
  contactEmail: String,
  contactPhone: String,
  website: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  rating: Number,       // derived or admin-controlled only
  reviews: Number,      // derived
  recentOrders: Number, // derived
  notes: String,
  deletedAt: Date,      // soft delete
  createdAt: Date,
  updatedAt: Date
}
```

---

## 8) Endpoint Patterns (So Devs Don’t “CRUD Everything”)

Facility-scoped routes must look like:

- /api/facilities/:facilityId/tasks
- /api/facilities/:facilityId/sops
- /api/facilities/:facilityId/deviations
- /api/facilities/:facilityId/green-waste
- /api/facilities/:facilityId/audit-logs

Forbidden patterns:

- PUT /api/users/:userId/role (facility roles must be facility-scoped)
- Generic “delete everything” endpoints for compliance primitives

---

## 9) Audit Requirements (Mutation Coverage)

Create an audit log entry for:

- create/update/status-change/soft-delete
- role changes
- approvals/rejections
- exports

Audit changes should include:

- old → new minimal diff
- never store secrets

---

## 10) Response Format (Pick One Standard)

Use one consistent envelope:

- Success: { "success": true, "data": { } }
- Error: { "success": false, "message": "Access denied", "code": "NOT_AUTHORIZED" }
  (If legacy tests require {error:true,status:400}, normalize in one middleware.)

---

## 11) Why This Exists

If you implement these as CRUD tables, you will ship:

- fake compliance
- fake audit trails
- broken multi-facility roles
  If you implement these as operating primitives, you get:
- stable facility shell
- real authority flows
- irreversible history
- actual ops system

---

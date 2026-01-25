# Backend Handoff: CoursesScreen.js

## Overview

This document summarizes all backend API requirements, integration points, and expected data structures for CoursesScreen.js. The frontend is fully stubbed and ready for backend integration.

# Backend Handoff: Courses System (GrowPath AI Aligned)

> Status: CANONICAL
> Owner: Backend/Product
> Last reviewed: 2026-01-24
> Source of truth for: Backend contracts, per-screen handoff, and operating logic

## Context (Read First)

Courses are a cross-shell workflow.

They behave differently depending on user shell:

| Shell        | Role in courses                       |
| ------------ | ------------------------------------- |
| personal\_\* | student (buy, enroll, watch)          |
| commercial   | creator (publish, sell, earnings)     |
| facility     | trainer (assign, monitor, compliance) |

Backend determines:

- visibility
- permissions
- access
  based on /api/auth/me.

Frontend must never guess.

## Keystone Requirement

Every request must rely on:

GET /api/auth/me
→ role
→ plan
→ mode
→ capabilities
→ facilitiesAccess

Courses logic is capability-driven, not price-driven.

---

### 1. Fetch Courses

**Endpoint**

GET /api/courses

**Backend Responsibility**

Backend must filter based on:

- user.mode
- user.capabilities
- facility context (if applicable)

Not on:

- price
- frontend plan toggles

**Example Logic**

```js
if (user.mode === "personal_free") {
  return only public free courses
}
if (user.mode === "commercial") {
  return:
    - own courses
    - published public courses
}
if (user.mode === "facility") {
  return:
    - courses assigned to facility
}
```

This logic does not live in the screen.

---

### 2. Facility User Management (Scoped Correctly)

These must be facility-scoped:

**Invite User**
POST /api/facilities/:facilityId/invite

**Change Role**
PUT /api/facilities/:facilityId/users/:userId/role

**Remove User**
DELETE /api/facilities/:facilityId/users/:userId

Backend must enforce:

- requester is OWNER or MANAGER
- target user is a member of that facility
- audit log is created

Global user mutation is forbidden.

---

### 3. Compliance Export (Facility)

**Correct endpoint:**
GET /api/facilities/:facilityId/compliance/export?format=csv|pdf

Backend must verify:

- user has facility access
- user role permits export

---

### 4. Publish / Unpublish Course (Creator)

**Endpoints**
POST /api/courses/:courseId/publish
POST /api/courses/:courseId/unpublish

Backend must verify:

- user is course creator
- user has commercial capability

---

### 5. Data Model Expectations (Authoritative)

Courses must include:

```
{
  "_id": "...",
  "title": "...",
  "creatorId": "...",
  "priceCents": 1000,
  "isPublished": true,
  "visibility": "public|facility|private",
  "analytics": {
    "views": 0,
    "enrollments": 0
  }
}
```

Access to a course is determined by:

- Purchase (personal/commercial)
- Assignment (facility)
- Visibility flag

Not by frontend conditionals.

---

## Critical Rule (Paste This at Top of File)

Courses are not UI features.
They are capability-driven workflows.
Backend determines access.
Frontend only renders what backend authorizes.

---

## Why This Correction Matters

Your original handoff would have produced:

- global role mutation
- price-based security
- fake facility permissions
- frontend-defined access rules

Which is exactly the pattern that:

- killed Facility
- broke Commercial
- made money fake
- made Copilot hallucinate

## The Real Difference

Old handoff model:

“Here are endpoints the screen needs.”

Correct handoff model:

“Here is the operating logic that defines what this screen means.”

One produces:

- an app that passes tests

The other produces:

- a platform that scales without collapsing.

## Final Verdict

This handoff doc was technically fine
but architecturally dangerous.

After correction:

- it aligns with your shell model
- it enforces reality
- it prevents another year of drift

This is the exact category of document that used to:

- silently recreate the same bug
- in every new feature.

Now it won’t.

**Frontend is ready for backend integration.**

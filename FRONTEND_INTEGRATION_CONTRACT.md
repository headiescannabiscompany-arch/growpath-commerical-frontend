# GrowPath Frontend Integration Contract (Runtime Truth)

> Status: CANONICAL
> Owner: Product/Engineering
> Last reviewed: 2026-01-24
> Source of truth for: Frontend-backend contract, navigation, gating, and authority

---

## 0) Single Source of Truth (Required First Call)

Every frontend session MUST begin with:

    GET /api/auth/me

This response defines reality:

```
{
  userId,
  mode: "personal" | "commercial" | "facility",
  plan: "free" | "pro" | "creator_plus" | "commercial" | "facility",
  capabilities: {
    [key: string]: boolean
  },
  limits: {
    maxPaidCourses,
    maxLessonsPerCourse,
    requiresApprovalForFirstCourse,
    ...
  },
  facilitiesAccess: [
    {
      facilityId,
      role: "OWNER" | "MANAGER" | "STAFF"
    }
  ]
}
```

Nothing in the UI should be inferred.
No plan checks. No role hacks. No “if (commercial)”.
If it’s not in /auth/me, it doesn’t exist.

---

## 1) Shell Selection (Mode Drives Navigation Root)

- mode: personal → Load: PersonalStack
- mode: commercial → Load: CommercialStack
- mode: facility → Load: FacilityStack

Shells are not features. They are different operating contexts.
You never “unlock Facility features”. You enter Facility mode.

---

## 2) Capability Gating (Screens & Tools)

Every screen requires a capability:

    if (!capabilities["tasks"]) hide(TaskScreen)
    if (!capabilities["courses_create"]) hide(CreateCourseScreen)
    if (!capabilities["ops_analytics"]) hide(OperationalAnalyticsScreen)

Plans do not gate features directly. Plans only determine which capabilities are granted.

---

## 3) Limits (Numeric, Not Boolean)

Limits come from /auth/me:

- limits.maxPaidCourses
- limits.maxLessonsPerCourse
- limits.maxFacilities
- limits.maxBatchCycles

UI never hardcodes numbers. No “Pro = 5 courses” logic in frontend.

---

## 4) Authority (Facility Role)

Inside Facility mode:

    role = facilitiesAccess.find(f => f.facilityId === activeFacility).role

Role gates actions, not screens:

| Action              | Requires |
| ------------------- | -------- |
| Assign task         | MANAGER+ |
| Verify task         | MANAGER+ |
| Publish SOP         | OWNER    |
| Resolve deviation   | MANAGER+ |
| Change trackingMode | OWNER    |

Capability grants tool access. Role grants authority.

---

## 5) Deletion & Mutation Rules (Hard Contracts)

Frontend must respect:

| Resource     | Can Delete |
| ------------ | ---------- |
| Task         | Soft only  |
| SOP          | Never      |
| AuditLog     | Never      |
| Verification | Never      |
| Deviation    | Never      |
| GreenWaste   | Never      |
| Vendor       | Soft only  |

If backend allows hard delete here, that’s a bug.

---

## 6) Error Handling (Platform-Grade)

All errors return:

```
{
  "error": true,
  "message": "Human readable",
  "status": 403
}
```

Frontend rules:

- Never swallow compliance errors
- Never replace with generic “Something went wrong”
- Show real backend message for:
  - permission denied
  - facility access
  - compliance state violations

---

## 7) CORS / Environment

Base URL is just a transport detail.
What actually matters:

- All requests must include JWT
- All writes must produce audit logs
- All facility routes must validate:
  - mode === facility
  - facility membership
  - role authority

---

## 8) Testing Reality Check

Your E2E tests should validate:

- /auth/me drives navigation
- Capabilities hide screens
- Limits enforce UI constraints
- Role blocks restricted actions
- Facility context cannot be bypassed
- Audit logs appear for all writes

Not just “does the screen render”.

---

## Why This Matters

Your original handoff lets a frontend dev build:

- direct API calls
- hardcoded plan logic
- fake feature gating
- silent permission failures

And everything looks like it works.

This corrected contract forces:

- shell separation
- capability truth
- authority enforcement
- irreversible history
- real operational semantics

Which is the difference between:

- a SaaS demo
- and an actual platform people can run real operations on.

---

## Final Rule (This One Line Prevents Drift)

Frontend never decides reality.
It renders the reality returned by /auth/me.

Everything else is just plumbing.

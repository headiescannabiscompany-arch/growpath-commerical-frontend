# GrowPath AI – Reality-Based Status & Deployment Notes

> Status: CANONICAL
> Owner: Product/Platform
> Generated: December 12, 2025
> Last reviewed: 2026-01-24
> Source of truth for: Operational status, deployment, and OS-aligned feature matrix

---

## OS Keystone Contract (Must Exist)

All environment, gating, and shells are driven by:

GET /api/auth/me

It must return:

```json
{
  "id": "...",
  "email": "...",
  "mode": "personal|commercial|facility",
  "plan": "free|pro|commercial|facility",
  "capabilities": { "key": true },
  "facilitiesAccess": [{ "facilityId": "...", "role": "OWNER|MANAGER|STAFF" }]
}
```

If /api/auth/me is incomplete, the product cannot stabilize.

---

## Cross-Platform

UI runs on iOS / Android / Web.
This indicates client coverage, not backend completeness.

---

## Auth Status (Define One Truth)

- JWT Bearer token auth (Authorization header)
- Passwords hashed with bcrypt
- Token expiration must be defined once (24h or 7d) and matched in:
  - backend JWT config
  - frontend refresh behavior
  - docs

---

## Payments Status

### Subscription Billing (Pro plan)

- Stripe checkout session exists
- Webhook updates plan
- Not considered “enabled” until:
  - real Stripe keys are set
  - webhook secret configured
  - webhook URL is correct for the deployed backend
  - webhook events are idempotent (stripeEventId stored)

### Course Monetization (Creator earnings)

- Course monetization is a separate system and is not complete until:
  - purchase ledger exists (immutable)
  - enrollments created by webhook authority
  - refunds/disputes reverse earnings
  - earnings are append-only records
- Do not describe creator payouts as automated unless Stripe Connect is implemented.

---

## Facility / Compliance Data (Immutability Rules)

Facility-mode records are operational history.
The following are never hard-deleted:

- AuditLog
- Verification
- Deviation
- GreenWaste
- SOP version history

Deletion (if allowed) is soft-archive only where explicitly defined.

---

## CORS & Production Deployment Checklist

- Add production frontend origin(s) to backend CORS allowlist.
- If using cookie/session auth, enable credentials in CORS and client.
- If using Bearer JWT, ensure CORS allows headers:
  - Authorization, Content-Type
- If you see CORS errors, confirm the frontend origin is allowlisted and the request headers are permitted.

---

## Feature Matrix (Capability-Based, Not Screen-Based)

- All “features” are controlled by capabilities, not by hardcoded plan/role checks in UI.
- Plans decide which capabilities are granted; UI only reads capabilities.
- Revenue split constants must be defined once (e.g., 70/30) and used everywhere:
  - UI display
  - backend earnings calculations
  - payout logic
  - docs

---

## Remove / Avoid These Claims

Do not use:

- “App is 95% done”
- “Frontend is 100% complete”
- “Verified 72 screens”
- “Stripe handles refunds automatically” (only true if implemented)
- “Admin role global checks” (use capability-based moderation)

These statements cause architectural drift.

---

## Code Snippet Correction (facilityOut)

// facilityRef can be either an ObjectId/string OR a populated facility document
const facilityOut = isPopulatedFacility(facilityRef)
? {
\_id: facilityRef.\_id,
name: facilityRef.name ?? "",
businessType: facilityRef.businessType ?? ""
}
: { \_id: String(facilityRef) };

---

## End of document

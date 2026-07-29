# Limits and Locks (v1)

## Product groups (locked)
### Group A: Single User
- Free Single
- Pro Single
Same feature surface. Differences are mainly limits/quotas/retention + a small hard-lock list.

### Group B: Ops
- Commercial (paid, single-account business overlays)
- Facility (paid, role-based multi-device ops app)

---

## Hard locks (Free plan)
Free users cannot access:

1) Facility & Team Ops
- Any Facility mode shells/routes
- Team invites / team management
- Facility compliance/audit/SOP ops surfaces

2) Commercial Ops
- Commercial inventory management
- Commercial operational dashboards (campaigns/orders/products/links/storefront)

3) Creator/Monetization Admin
- Earnings/payout requests/creator revenue dashboards
- Admin reports/creator payout workflows

4) Compliance/Export
- Compliance exports (EXPORT_COMPLIANCE)
- Bulk/batch export tooling (if present)

5) Advanced Diagnose (locked)
- Diagnosis export / AI vision export (basic diagnosis remains available with limits)

Everything else remains available on Free WITH LIMITS:
- Grows / plants / logs
- Tools (VPD, etc.)
- Forum reading; posting and commenting are disabled at launch
- Courses browsing (paid courses may be hidden or shown but locked at purchase)
- AI assistant (limited by quotas)

---

## Limits (Free vs Pro)
The runtime source of truth is `src/config/freePolicy.ts` plus
`src/config/planLimits.ts`. Do not publish older daily-call or retention claims that
are not enforced by those contracts.

### Free limits
- tracked grows: 1
- tracked plants: 1
- AI credits: 5 per week
- provider-backed text help: 1 credit per completed request
- provider-backed photo diagnosis: 3 credits per completed request
- published paid courses: 1
- lessons per course: 7
- upload storage: 500 MB
- Forum posts/comments: read-only at launch (`0` writes per day)

Rule-based calculators and fallbacks do not consume AI credits.

### Pro limits
- tracked grows: 10
- tracked plants: 50
- published paid courses: 5
- lessons per course: 20

Rule: Free and Pro share the core Personal surface. Pro raises limits and unlocks
the explicitly gated paid capabilities.

---

## Commercial and Facility
- Commercial and Facility are paid account types.
- Commercial adds business overlays; Facility adds multi-user role-based operations.
- No free then upgrade to facility flow (facility accounts are separate).

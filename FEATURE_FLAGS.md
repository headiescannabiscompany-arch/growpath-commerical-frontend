# GrowPath Feature Access Contract

> Status: CANONICAL
> Owner: Product/Engineering
> Last reviewed: 2026-06-21
> Source of truth for: feature visibility, limits, and permission checks

GrowPath no longer uses frontend plan-name feature flags as the authority for
access. The frontend reads feature access from the canonical session context:

```http
GET /api/auth/me
Authorization: Bearer <token>
```

The response supplies:

- `ctx.mode` for Personal, Commercial, or Facility shell selection.
- `ctx.capabilities` for screen visibility, direct-route access, and actions.
- `ctx.limits` for numeric limits such as course, grow, plant, lesson, export,
  and subscription limits.
- `ctx.facilityId` and `ctx.facilityRole` for active facility context.

The backend must independently authorize every protected request. Frontend
capability checks improve navigation and messaging, but they are never the
security boundary.

## Canonical Sources

- Runtime session contract: `FRONTEND_INTEGRATION_CONTRACT.md`
- Navigation ownership: `FRONTEND_SCREEN_MAP.md`
- Frontend capability keys: `src/entitlements/capabilityKeys.ts`
- Backend capability/role enforcement: `backend/entitlements.js`
- Backend `/api/auth/me` capability resolution:
  `backend/entitlements/capabilityPolicy.js`

## Required Rules

- Do not gate UI directly from `user.plan`.
- Do not infer limits from plan names.
- Do not grant access from Stripe redirects, native IAP callbacks, or local
  purchase success states.
- Do not rely on hidden navigation alone. Direct route access must check the
  same capability as visible navigation.
- Facility features require both a facility capability and an allowed
  `facilityRole` for protected actions.

## Course And Payment Access

Course creation, enrollment, certificate, sales, earnings, and payout features
must read access from capabilities and limits returned by `/api/auth/me` or the
course/payment status endpoints. Payment callbacks only trigger a status refresh;
they do not mutate local capabilities or unlock content.

## Facility Actions

Facility task, team, room, inventory, compliance, SOP, audit, plant, grow, and
log actions must be authorized by:

```text
mode -> capabilities -> limits -> facilityRole -> backend membership check
```

The backend rejects disabled capabilities and insufficient facility roles even
when a user reaches an endpoint directly.

## Legacy Notes

Older docs and snippets may refer to `FEATURE_FLAGS` dictionaries such as
`can_create_courses`, `feed_scheduler`, or `facility_dashboard`. Treat those as
historical labels only. New work must use canonical capability keys and server
limits instead.

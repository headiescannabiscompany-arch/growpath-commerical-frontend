# GrowPath Frontend Integration Contract

> Status: CANONICAL
> Owner: Product/Engineering
> Last reviewed: 2026-06-20
> Source of truth for: Session bootstrap, shell selection, capability gating, and
> frontend authority

## Session Bootstrap

Every authenticated frontend session begins with:

```http
GET /api/me
Authorization: Bearer <token>
```

Test mocks may continue to accept `GET /api/auth/me` as a legacy alias, but new
frontend work should target `/api/me`.

The canonical response is:

```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "displayName": "Example User",
    "role": "user",
    "plan": "pro",
    "subscriptionStatus": "active"
  },
  "ctx": {
    "mode": "personal",
    "capabilities": {
      "GROWS_PERSONAL_VIEW": true,
      "LOGS_PERSONAL_WRITE": true
    },
    "limits": {},
    "facilityId": null,
    "facilityRole": null,
    "facilityFeaturesEnabled": false
  }
}
```

The API client also accepts the same payload inside the standard success
envelope:

```json
{
  "success": true,
  "data": {
    "user": {},
    "ctx": {}
  }
}
```

No other response shape is valid. In particular, `{ user, session,
entitlements }` is not accepted. Invalid responses fail bootstrap with
`INVALID_ME_RESPONSE_SHAPE` instead of silently selecting a shell.

## Field Authority

- `user.plan` is display and billing context. It must not directly gate UI.
- `ctx.mode` selects the Personal, Commercial, or Facility shell.
- `ctx.capabilities` controls visible and reachable features.
- `ctx.limits` provides server-owned numeric limits. The frontend must not
  derive limits from a plan name.
- `ctx.facilityId` and `ctx.facilityRole` describe the active facility context.
  Facility requests must still be authorized by the backend.
- `ctx.facilityFeaturesEnabled` is optional transitional metadata. It does not
  replace capability checks.

The canonical capability names are defined in
`src/entitlements/capabilityKeys.ts` and documented in
`docs/contracts/CAPABILITY_KEYS.md`. Unknown keys are ignored and reported in
development.

## Shell Selection

| `ctx.mode` | Shell |
| --- | --- |
| `personal` | Personal |
| `commercial` | Commercial |
| `facility` | Facility |

An authenticated session must not route until `/api/me` succeeds. Network
or server errors keep bootstrap blocked and expose a retry action. A `401`
clears the rejected token and returns to authentication.

User preference may select another mode only when the server response proves
the user has access to it. Preference never creates access.

## Capability And Role Rules

Screens, routes, and actions use canonical capabilities. Hiding a navigation
item is insufficient; direct route entry must enforce the same capability.

Facility capabilities grant feature access. `ctx.facilityRole` grants authority
within the active facility. The backend remains authoritative for every
facility-scoped mutation and must reject cross-facility access.

## Errors

API failures must provide an HTTP status and a stable error code where clients
need to branch. The frontend preserves backend messages for authentication,
permission, facility-access, and compliance failures. Request IDs should be
included when available.

Expected session behavior:

| Condition | Frontend behavior |
| --- | --- |
| `401` | Clear token and route to authentication |
| `403` | Preserve session and show the permission error |
| Network, timeout, or `5xx` | Keep bootstrap blocked and allow retry |
| Invalid success payload | Fail with `INVALID_ME_RESPONSE_SHAPE` |

## Mutation Rules

The frontend must not offer destructive behavior where the backend contract
requires immutable history. Tasks and vendors are soft-deleted; SOPs, audit
logs, verifications, deviations, and compliance records are not hard-deleted.

All facility writes must include facility context in the route and must be
authorized for membership, role, and capability by the backend.

## Payment Authority

Stripe Checkout, native in-app purchase callbacks, and free-trial requests are
not entitlement sources. The frontend may start checkout, submit an IAP receipt,
or request a trial, then it must refresh backend subscription or enrollment
status before showing access as unlocked.

Subscription features unlock from backend-confirmed status only:

- `GET /api/subscribe/status`
- `GET /api/subscription/me`
- the canonical `/api/me` capability context after refresh

Course access unlocks from backend-confirmed enrollment and payment status
only. Frontend success callbacks must route users to a status or confirmation
screen rather than granting course, plan, or capability access locally.

## Verification Requirements

Automated coverage must prove:

- direct and enveloped canonical responses bootstrap successfully;
- invalid response shapes fail closed;
- `/api/me` drives shell selection;
- disabled capabilities hide UI and block direct route access;
- limits come from `ctx.limits`;
- facility roles restrict actions;
- one facility cannot access another facility's resources;
- authenticated `401` responses invalidate the session globally.

## Final Rule

The frontend does not decide access. It renders and enforces the context returned
by `/api/me`, while the backend independently authorizes every request.

# GrowPath v1 Paths (Contract)

## Product Groups
1. Single User
   - Free (personal/free)
   - Pro (personal/pro)
   - Same surface area. Differences are limits/quotas and a small explicit lock list.
2. Ops User
   - Commercial (commercial)
   - Facility (facility, role-scoped)

## Boot / Routing (Single Source of Truth)
1. App start
   - Read token.
   - If missing: route to `/login`.
   - If present: call `GET /api/me`.
2. Build entitlements from `/api/me` (mode/plan/role/capabilities).
3. Route by mode:
   - `personal` -> `/home/personal`
   - `commercial` -> `/home/commercial`
   - `facility` -> `/home/facility` (requires `facilityId` + `facilityRole`)
4. No screen renders before `ent.ready === true`.

## Facility Role Rules
- OWNER: all access
- MANAGER: invite/manage members + staff capabilities
- STAFF: ops data changes only
- VIEWER: read-only

## Determinism Rules (Non‑negotiable)
- `/api/me` is the only routing source.
- No header‑derived facility context.
- No silent fallback to personal when facility is missing; show “facility not provisioned.”


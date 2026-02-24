# Entity Contracts (v1)

All entities are immutable in shape unless explicitly versioned. Fields marked *required* must be present.

## Grow
Owner: personal/commercial/facility (scoped by mode)
Required fields:
- `id` (string)
- `name` (string)
- `mode` (personal|commercial|facility)
Optional:
- `facilityId` (string, facility only)
- `breeder` (string)
- `stage` (string)
- `startedAt` (ISO date)
- `createdAt` (ISO date)
- `updatedAt` (ISO date)
- `growTags` (string[])
- `environment` (object)
- `plants` (PlantIdentity[])

Mutations:
- Create: personal/commercial/facility (role‑gated in facility)
- Update: owner/manager/staff (facility); owner (personal/commercial)

## PlantIdentity
Owner: belongs to a Grow
Required fields:
- `id`
- `growId`
- `name` (or `strain`, at least one)
Optional:
- `strain`
- `breeder`
- `stage`
- `photos` (string[])
- `notes` (string)

Mutations:
- Create/update/delete: same as Grow.

## GrowLogEntry
Owner: belongs to a Grow, optionally a Plant
Required fields:
- `id`
- `growId`
- `note` (string) OR `photos` (string[])
- `createdAt`
Optional:
- `plants` (string[] of plant ids)
- `growTags` (string[])

Mutations:
- Create/update/delete: same as Grow.

## Task
Owner: facility only (ops)
Required fields:
- `id`
- `facilityId`
- `title`
- `status` (todo|in_progress|done|blocked)
- `createdAt`
Optional:
- `assigneeUserId`
- `dueDate`
- `completedAt`
- `priority`

Mutations:
- OWNER/MANAGER/STAFF can create/update
- VIEWER read‑only

## FacilityInvite
Owner: facility only
Required fields:
- `id`
- `facilityId`
- `email`
- `role` (MANAGER|STAFF|VIEWER)
- `invitedByUserId`
- `status` (pending|accepted|expired|revoked)
- `createdAt`
Optional:
- `expiresAt`
- `inviteCode`

Mutations:
- OWNER/MANAGER can create/revoke
- STAFF/VIEWER forbidden

## FacilityMember
Owner: facility only
Required fields:
- `id`
- `facilityId`
- `userId`
- `role` (OWNER|MANAGER|STAFF|VIEWER)
- `status` (active|disabled)
- `joinedAt`
Optional:
- `deletedAt`

Mutations:
- OWNER/MANAGER can update role/disable
- STAFF/VIEWER forbidden


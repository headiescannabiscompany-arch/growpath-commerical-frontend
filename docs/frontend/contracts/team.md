# Team Contract

## Endpoints

| Method | Path                               | Role Required | Request | Response         | Error Codes                                       |
| ------ | ---------------------------------- | ------------- | ------- | ---------------- | ------------------------------------------------- |
| GET    | /api/facility/:facilityId/team     | MANAGER+      | –       | { items: [...] } | FACILITY_CONTEXT_REQUIRED, FACILITY_ACCESS_DENIED |
| POST   | /api/facility/:facilityId/team     | OWNER         | { ... } | { id, ... }      | VALIDATION_ERROR, FACILITY_ACCESS_DENIED          |
| PATCH  | /api/facility/:facilityId/team/:id | OWNER         | { ... } | { ... }          | NOT_FOUND, FACILITY_ACCESS_DENIED                 |
| DELETE | /api/facility/:facilityId/team/:id | OWNER         | –       | { deletedAt }    | NOT_FOUND, FACILITY_ACCESS_DENIED                 |

## UI Mapping

- TeamListScreen: GET /api/facility/:facilityId/team
- TeamEditScreen: PATCH /api/facility/:facilityId/team/:id
- TeamCreateScreen: POST /api/facility/:facilityId/team

## Cache Rules

- Query key: ['team', facilityId]
- Invalidate on facility switch, create, update, delete

## Soft Delete Behavior

- deletedAt: if present, hide from lists
- archivedAt: (if used) show in Archived tab only

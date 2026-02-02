# Grows Contract

## Endpoints

| Method | Path                                | Role Required | Request | Response         | Error Codes                                       |
| ------ | ----------------------------------- | ------------- | ------- | ---------------- | ------------------------------------------------- |
| GET    | /api/facility/:facilityId/grows     | STAFF+        | –       | { items: [...] } | FACILITY_CONTEXT_REQUIRED, FACILITY_ACCESS_DENIED |
| POST   | /api/facility/:facilityId/grows     | MANAGER+      | { ... } | { id, ... }      | VALIDATION_ERROR, FACILITY_ACCESS_DENIED          |
| PATCH  | /api/facility/:facilityId/grows/:id | MANAGER+      | { ... } | { ... }          | NOT_FOUND, FACILITY_ACCESS_DENIED                 |
| DELETE | /api/facility/:facilityId/grows/:id | OWNER         | –       | { deletedAt }    | NOT_FOUND, FACILITY_ACCESS_DENIED                 |

## UI Mapping

- GrowsListScreen: GET /api/facility/:facilityId/grows
- GrowEditScreen: PATCH /api/facility/:facilityId/grows/:id
- GrowCreateScreen: POST /api/facility/:facilityId/grows

## Cache Rules

- Query key: ['grows', facilityId]
- Invalidate on facility switch, create, update, delete

## Soft Delete Behavior

- deletedAt: if present, hide from lists
- archivedAt: (if used) show in Archived tab only

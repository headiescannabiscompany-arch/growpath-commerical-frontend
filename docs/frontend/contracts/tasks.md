# Tasks Contract

## Endpoints

| Method | Path                                | Role Required | Request | Response         | Error Codes                                       |
| ------ | ----------------------------------- | ------------- | ------- | ---------------- | ------------------------------------------------- |
| GET    | /api/facility/:facilityId/tasks     | STAFF+        | –       | { items: [...] } | FACILITY_CONTEXT_REQUIRED, FACILITY_ACCESS_DENIED |
| POST   | /api/facility/:facilityId/tasks     | STAFF+        | { ... } | { id, ... }      | VALIDATION_ERROR, FACILITY_ACCESS_DENIED          |
| PATCH  | /api/facility/:facilityId/tasks/:id | STAFF+        | { ... } | { ... }          | NOT_FOUND, FACILITY_ACCESS_DENIED                 |
| DELETE | /api/facility/:facilityId/tasks/:id | MANAGER+      | –       | { deletedAt }    | NOT_FOUND, FACILITY_ACCESS_DENIED                 |

## UI Mapping

- TasksListScreen: GET /api/facility/:facilityId/tasks
- TaskEditScreen: PATCH /api/facility/:facilityId/tasks/:id
- TaskCreateScreen: POST /api/facility/:facilityId/tasks

## Cache Rules

- Query key: ['tasks', facilityId]
- Invalidate on facility switch, create, update, delete

## Soft Delete Behavior

- deletedAt: if present, hide from lists
- archivedAt: (if used) show in Archived tab only

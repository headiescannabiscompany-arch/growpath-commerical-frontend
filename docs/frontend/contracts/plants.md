# Plants Contract

## Endpoints

| Method | Path                                 | Role Required | Request | Response         | Error Codes                                       |
| ------ | ------------------------------------ | ------------- | ------- | ---------------- | ------------------------------------------------- |
| GET    | /api/facility/:facilityId/plants     | STAFF+        | –       | { items: [...] } | FACILITY_CONTEXT_REQUIRED, FACILITY_ACCESS_DENIED |
| POST   | /api/facility/:facilityId/plants     | MANAGER+      | { ... } | { id, ... }      | VALIDATION_ERROR, FACILITY_ACCESS_DENIED          |
| PATCH  | /api/facility/:facilityId/plants/:id | MANAGER+      | { ... } | { ... }          | NOT_FOUND, FACILITY_ACCESS_DENIED                 |
| DELETE | /api/facility/:facilityId/plants/:id | OWNER         | –       | { deletedAt }    | NOT_FOUND, FACILITY_ACCESS_DENIED                 |

## UI Mapping

- PlantsListScreen: GET /api/facility/:facilityId/plants
- PlantEditScreen: PATCH /api/facility/:facilityId/plants/:id
- PlantCreateScreen: POST /api/facility/:facilityId/plants

## Cache Rules

- Query key: ['plants', facilityId]
- Invalidate on facility switch, create, update, delete

## Soft Delete Behavior

- deletedAt: if present, hide from lists
- archivedAt: (if used) show in Archived tab only

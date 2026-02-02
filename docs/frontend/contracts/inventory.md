# Inventory Contract

## Endpoints

| Method | Path                                    | Role Required | Request | Response         | Error Codes                                       |
| ------ | --------------------------------------- | ------------- | ------- | ---------------- | ------------------------------------------------- |
| GET    | /api/facility/:facilityId/inventory     | STAFF+        | –       | { items: [...] } | FACILITY_CONTEXT_REQUIRED, FACILITY_ACCESS_DENIED |
| POST   | /api/facility/:facilityId/inventory     | MANAGER+      | { ... } | { id, ... }      | VALIDATION_ERROR, FACILITY_ACCESS_DENIED          |
| PATCH  | /api/facility/:facilityId/inventory/:id | MANAGER+      | { ... } | { ... }          | NOT_FOUND, FACILITY_ACCESS_DENIED                 |
| DELETE | /api/facility/:facilityId/inventory/:id | OWNER         | –       | { deletedAt }    | NOT_FOUND, FACILITY_ACCESS_DENIED                 |

## UI Mapping

- InventoryListScreen: GET /api/facility/:facilityId/inventory
- InventoryEditScreen: PATCH /api/facility/:facilityId/inventory/:id
- InventoryCreateScreen: POST /api/facility/:facilityId/inventory

## Cache Rules

- Query key: ['inventory', facilityId]
- Invalidate on facility switch, create, update, delete

## Soft Delete Behavior

- deletedAt: if present, hide from lists
- archivedAt: (if used) show in Archived tab only

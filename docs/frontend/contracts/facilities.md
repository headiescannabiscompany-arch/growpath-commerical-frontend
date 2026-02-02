# Facilities Contract

## Endpoints

| Method | Path            | Role Required     | Request | Response             | Error Codes   |
| ------ | --------------- | ----------------- | ------- | -------------------- | ------------- |
| GET    | /api/facilities | Any authenticated | –       | [{ id, name, role }] | AUTH_REQUIRED |

## UI Mapping

- FacilitiesPickerScreen: GET /api/facilities

## Cache Rules

- Query key: ['facilities']
- Invalidate on login/logout

## Soft Delete Behavior

- Facilities are not soft-deleted (if deleted, not returned)

# Frontend Integration Test Setup

## Prerequisites

### 1. Backend Running

```bash
cd C:\growpath-commercial\backend
node server.js
```

Verify: Backend should be on `http://127.0.0.1:5001`

### 2. Test User Setup

Create a test user in the backend:

```bash
# Via MongoDB shell or backend admin endpoint
POST http://127.0.0.1:5001/api/auth/signup
{
  "email": "equiptest@example.com",
  "password": "Password123",
  "displayName": "Equipment Tester",
  "businessType": "cultivator"
}
```

### 3. Test Facility Setup

Ensure the test user has access to a facility:

```bash
# Via backend admin or direct DB insert
POST http://127.0.0.1:5001/api/facilities
{
  "name": "Test Facility 1",
  "_id": "facility-1",
  "ownerId": "<test-user-id>"
}
```

Or update the user's `facilitiesAccess`:

```javascript
{
  facilitiesAccess: [{ facilityId: "facility-1", role: "ADMIN" }];
}
```

## Running Integration Tests

### Option 1: Live Backend Tests (Recommended)

```bash
cd C:\growpath-commercial\frontend

# Run live integration test
npx playwright test tests/playwright/equipment-live.spec.js --headed

# With timeout for slower connections
npx playwright test tests/playwright/equipment-live.spec.js --timeout=120000
```

### Option 2: Mocked Tests (Development)

```bash
# Original test with mocked API responses
npx playwright test tests/playwright/equipment.spec.js
```

## Expected Results

### Live Backend Test (`equipment-live.spec.js`)

- ✓ Authenticates with backend
- ✓ Loads equipment list (empty or with items)
- ✓ Creates new equipment item
- ✓ Full CRUD workflow (Create, Read, Update, Delete)

### Test Output

```
✓ Authenticated with backend
✓ Equipment list loaded (empty state)
✓ Created equipment: Test Equipment 1736534567890
✓ CREATE: Equipment added
✓ UPDATE: Equipment updated
✓ DELETE: Equipment deleted
```

## Troubleshooting

### Backend Connection Failed

- Verify backend is running: `curl http://127.0.0.1:5001/api/health`
- Check CORS enabled for `localhost:19009`
- Review backend logs for errors

### Authentication Failed

- Verify test user exists: `POST /api/auth/login` with test credentials
- Check password hash matches
- Ensure `facilitiesAccess` array is set for user

### Equipment Not Loading

- Check facilityId matches in localStorage and backend
- Verify endpoint: `GET http://127.0.0.1:5001/api/facilities/facility-1/equipment`
- Review network tab in Playwright trace:
  ```bash
  npx playwright show-trace test-results/<test-name>/trace.zip
  ```

### Navigation Issues

- Ensure `__NAV__` is exposed globally
- Check route names: `FacilityStack` → `EquipmentTools`
- Review App.js navigation setup

## Next Steps

1. **Equipment Integration**: Run `equipment-live.spec.js` ✓
2. **Plants Integration**: Run `plants-live.spec.js` (create similar to equipment)
3. **Grow Logs**: Run existing `grows.spec.js` (update for live backend)
4. **Full Suite**: `npx playwright test tests/playwright/*-live.spec.js`

## API Endpoints Reference

### Equipment

- `GET /api/facilities/:facilityId/equipment` - List all
- `POST /api/facilities/:facilityId/equipment` - Create
- `PUT /api/facilities/:facilityId/equipment/:id` - Update
- `DELETE /api/facilities/:facilityId/equipment/:id` - Delete

### Plants

- `GET /api/plants` - List all
- `POST /api/plants` - Create
- `PUT /api/plants/:id` - Update
- `DELETE /api/plants/:id` - Delete
- `GET /api/plants/:id/logs` - Get plant logs

### Grow Logs

- `GET /api/growlog` - List all
- `POST /api/growlog` - Create
- `PUT /api/growlog/:id` - Update
- `DELETE /api/growlog/:id` - Delete

### Auth

- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Register
- `GET /api/auth/me` - Current user (includes facilitiesAccess)

## Documentation

- API Reference: `growlog-api.md`
- OpenAPI Spec: `swagger.yaml`
- Production Checklist: `PRODUCTION_CHECKLIST.md`

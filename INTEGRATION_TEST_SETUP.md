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

# Auth API – Frontend Contract

**Base path:** `/api/auth`

---

## Register

**POST** `/api/auth/register`

- **Body:** `{ name?, displayName?, email, password }`
- **Response:** `{ token }`

## Signup (Preferred)

**POST** `/api/auth/signup`

- **Body:** `{ name?, displayName?, email, password }`
- **Response:** `{ token, user }`

## Login

**POST** `/api/auth/login`

- **Body:** `{ email, password }`
- **Response:** `{ token, user }`

## Become Creator

**POST** `/api/auth/become-creator`

- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ ok: true, role: "creator" }`

## Save Push Token

**POST** `/api/auth/save-push-token`

- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ pushToken | token | expoPushToken }`
- **Response:** `{ ok: true }`

## User Object Shape (from /signup and /login)

```json
{
  "id": "string",
  "email": "string",
  "displayName": "string",
  "role": "user | creator | admin",
  "plan": "string | null",
  "subscriptionStatus": "string | null"
}
```

## Token Handling

- JWT returned from `/register`, `/signup`, `/login`
- All protected endpoints require: `Authorization: Bearer <token>`

## Error Shape

- All errors: `{ "message": "string" }`
- Status codes: 400, 401, 404, 500

---

## OpenAPI 3.0 Snippet

```yaml
openapi: 3.0.3
info:
  title: GrowPath Auth API
  version: 1.0.0
servers:
  - url: /api
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    Error:
      type: object
      properties:
        message:
          type: string
      required: [message]
    AuthRegisterRequest:
      type: object
      properties:
        name: { type: string, nullable: true }
        displayName: { type: string, nullable: true }
        email: { type: string }
        password: { type: string }
      required: [email, password]
    AuthLoginRequest:
      type: object
      properties:
        email: { type: string }
        password: { type: string }
      required: [email, password]
    User:
      type: object
      properties:
        id: { type: string }
        email: { type: string }
        displayName: { type: string }
        role:
          type: string
          enum: [user, creator, admin]
        plan:
          type: string
          nullable: true
        subscriptionStatus:
          type: string
          nullable: true
      required: [id, email, displayName, role, plan, subscriptionStatus]
    TokenOnlyResponse:
      type: object
      properties:
        token: { type: string }
      required: [token]
    AuthResponse:
      type: object
      properties:
        token: { type: string }
        user: { $ref: "#/components/schemas/User" }
      required: [token, user]
    OkResponse:
      type: object
      properties:
        ok: { type: boolean }
      required: [ok]
    BecomeCreatorResponse:
      type: object
      properties:
        ok: { type: boolean }
        role: { type: string, enum: [creator] }
      required: [ok, role]
    SavePushTokenRequest:
      type: object
      properties:
        pushToken: { type: string }
        token: { type: string }
        expoPushToken: { type: string }
      additionalProperties: false
paths:
  /auth/register:
    post:
      summary: Register (token only)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/AuthRegisterRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/TokenOnlyResponse" }
        "400":
          description: Bad Request
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Error" }
        "500":
          description: Server Error
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Error" }
  /auth/signup:
    post:
      summary: Signup (token + user)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/AuthRegisterRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/AuthResponse" }
        "400":
          description: Bad Request
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Error" }
        "500":
          description: Server Error
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Error" }
  /auth/login:
    post:
      summary: Login (token + user)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/AuthLoginRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/AuthResponse" }
        "400":
          description: Bad credentials / invalid input
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Error" }
        "500":
          description: Server Error
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Error" }
  /auth/become-creator:
    post:
      summary: Upgrade user to creator
      security:
        - bearerAuth: []
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/BecomeCreatorResponse" }
        "401":
          description: Unauthorized
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Error" }
  /auth/save-push-token:
    post:
      summary: Save a device push token
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/SavePushTokenRequest" }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema: { $ref: "#/components/schemas/OkResponse" }
        "400":
          description: Bad Request
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Error" }
        "401":
          description: Unauthorized
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Error" }
```

---

If you need a ready-to-use API client for your stack (React, Next.js, Expo, etc.), let me know!

# Frontend Integration Guide for Updated Backend

## API Base URL

- Use the production backend URL (confirm with backend team if unsure).

## Authentication

- Sign up/login returns a JWT token.
- Send this token as `Authorization: Bearer <token>` in all API requests.
- Use `/api/auth/me` to fetch the current user and their facility roles.

## User Roles

- Users have a global `role` (usually `user` or `admin`).
- Facility-specific roles: `OWNER`, `SUPER_ADMIN`, `FACILITY_ADMIN`, `CULTIVATION_LEAD`, `POST_HARVEST_LEAD`, `QA_COMPLIANCE`, `TECHNICIAN`, `VIEWER`.
- Facility roles are in the `facilitiesAccess` array on the user object.

## Endpoints

- Main API: `/api`
- Privacy (GDPR/CCPA): `/api/privacy`
- Payments (Stripe): `/api/payments`

## Payments

- Stripe endpoints are live.
- Platform fee (15%) is enforced.
- Use backend endpoints for course purchases and upgrades.

## CORS

- Only production frontend origins are allowed.
- Use the correct domain for all requests.

## Error Handling

- Errors are returned as JSON: `{ message: "Error message" }`
- Backend errors are monitored with Sentry (no frontend action needed).

## Testing

- Test users and facilities are seeded.
- Use provided test credentials for integration testing.

## Docs & Support

- See `README.md` and `growlog-api.md` in the repo for API docs.
- Contact backend team for new endpoints or questions.

---

_For any new endpoints or changes, always check the API docs or ask the backend team._

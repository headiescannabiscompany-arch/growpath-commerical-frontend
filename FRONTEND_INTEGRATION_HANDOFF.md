# Frontend Integration Handoff

The backend is stable and ready for integration. Please follow these steps:

## API Base URL

- Use `http://localhost:5001` for all API requests during local development.

## Authentication

- Register and login endpoints are available; use JWT for all authenticated requests.
- Send the JWT in the `Authorization` header:
  ```
  Authorization: Bearer YOUR_TOKEN
  ```

## CORS

- CORS is enabled for `http://localhost:19006` (React Native/Expo default).
- All requests from this origin are allowed.

## API Documentation

- See `README.md` for endpoint details.
- Swagger UI is available at:
  - http://localhost:5001/docs/cultivation
  - http://localhost:5001/docs/facilities

## Key Features to Integrate

- User registration, login, and JWT handling
- Dashboard: plants, grow logs, stats, PDF export
- Social feed: posts, likes, comments, notifications
- AI tools: plant diagnosis, feeding schedule, environment analysis (PRO only)
- Task management, templates, facility management, equipment, vendor, compliance
- Payments and subscription flows (Stripe, IAP)
- Error handling: display backend errors to users

## Testing

- Run E2E tests (Playwright) for all user types and flows.
- Report any missing or broken backend features.

## Support

- For questions, see backend `README` or contact the backend team.

---

Let the backend team know if you need a more detailed breakdown for any specific feature!

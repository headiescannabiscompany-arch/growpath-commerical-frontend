# Frontend Guardrails

## Lint/CI Rules

- No fetch() or axios outside api/client.ts
- No '/api/' strings outside api/
- No hard-coded base URLs (http://, https://, localhost, render.com)

## Policy

- All API calls go through the API client
- All endpoints are built in api/endpoints.ts
- Screens/components never call the network directly
- Facility context is managed by a single provider

## Adding a New Endpoint

1. Add to api/endpoints.ts
2. Add types to api/types.ts
3. Add hooks in features/<vertical>/hooks.ts
4. Document in contracts/<vertical>.md

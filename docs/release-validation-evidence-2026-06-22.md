# Release Validation Evidence - 2026-06-22

Status: partial. Local code checks, static-web live workflow validation, and
schema drift validation pass. Release remains blocked by external store/build
evidence.

## Passing Checks

```text
npx.cmd tsc --noEmit --pretty false
```

Result: passed.

```text
npx.cmd jest tests\navigation\routeAccess.test.ts tests\api\endpoints.test.js tests\LiveSessionScreen.qa.test.js --runInBand
```

Result: passed. 3 suites, 19 tests.

```text
npm.cmd run verify:delivery
```

Result: passed.

```text
npm.cmd run test:backend:all
```

Result: passed. 5 suites, 35 tests.

```text
npx.cmd jest tests\ai\ai.schema.drift.test.js --runInBand
```

Result: passed. 20 active schema drift tests passed.

```text
npm.cmd test -- --runInBand
```

Result after local schema-pack restoration: passed. 46 suites passed, 208 tests
passed, 1 snapshot passed. Schema drift tests are active.

```text
npm.cmd run guard
```

Result: passed.

```text
EXPO_PUBLIC_API_URL=http://127.0.0.1:5002 npx.cmd expo export --platform web --output-dir tmp\expo-web-export
```

Result: passed.

```text
PLAYWRIGHT_USE_SYSTEM_CHROME=1
PLAYWRIGHT_DISABLE_VIDEO=1
PLAYWRIGHT_SKIP_WEBSERVER=1
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8084
EXPO_PUBLIC_API_URL=http://127.0.0.1:5002
npx.cmd playwright test --reporter=list
```

Result: passed. 10 Playwright tests passed against the static web export served
from `tmp\expo-web-export` on `127.0.0.1:8084` and the live backend on
`127.0.0.1:5002`.

Covered:

- `/api/me` shell selection and capability gating.
- Free/Pro grow-limit behavior.
- Personal grows list/create/open workflow.
- Personal, Commercial, and Facility seeded live shell routing.
- Facility auto-select, room creation, and task creation workflow.

## Schema Validation

```text
npm.cmd run schema:preflight
```

Result: passed. The local V1 schema pack includes `common.json`,
`requests/AiCallRequest.json`, response envelopes, the master
`GrowPathAIResponse.json`, feature-specific AI output schemas, and at least 20
stored object schemas.

## Next Required Actions

1. Capture app-store metadata, screenshots, production builds, and real-device
   smoke evidence.

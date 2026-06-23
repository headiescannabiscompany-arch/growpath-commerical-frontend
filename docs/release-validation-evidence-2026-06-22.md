# Release Validation Evidence - 2026-06-22

Status: partial. Local code checks and static-web live workflow validation pass,
but release remains blocked by the missing schema pack and external store/build
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

Result: passed only the preflight sentinel. Full schema drift tests skipped
because the authoritative schema pack is absent.

```text
npm.cmd test -- --runInBand
```

Result: passed. 46 suites passed, 189 tests passed, 19 schema-pack tests skipped,
1 snapshot passed. The skipped tests are the full schema drift checks that only
activate after the authoritative schema pack is installed.

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

## Known Failing Gate

```text
npm.cmd run schema:preflight
```

Result: failed as expected because the full AI schema pack is not present.
Missing:

- `schemas/schemas/common.json`
- `schemas/schemas/requests/AiCallRequest.json`
- `schemas/schemas/responses/ApiSuccessEnvelope.json`
- `schemas/schemas/responses/ApiErrorEnvelope.json`
- `schemas/schemas/requests/`
- `schemas/schemas/responses/`
- at least 20 stored object schemas

## Next Required Actions

1. Install the authoritative schema pack:

```text
npm run schema:install -- <schema-pack.zip|extracted-directory>
```

2. Re-run:

```text
npm run schema:preflight
npm test -- tests/ai/ai.schema.drift.test.js
```

3. Capture app-store metadata, screenshots, production builds, and real-device
   smoke evidence.

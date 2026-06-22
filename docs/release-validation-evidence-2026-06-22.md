# Release Validation Evidence - 2026-06-22

Status: partial. Local code checks pass, but release remains blocked by missing
schema pack and live workflow validation.

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

3. Run live Personal, Commercial, and Facility workflow validation against a
   live backend.

4. Capture app-store metadata, screenshots, production builds, and real-device
   smoke evidence.

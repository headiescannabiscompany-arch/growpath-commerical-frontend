# AI Schema Drift Setup Status

> Status: PARTIAL
> Last reviewed: 2026-06-21

The schema drift test harness exists, but schema drift coverage is not complete
in this workspace because the full schema pack is missing. The test includes a
preflight that passes and skips full schema validation until the required pack is
restored.

## Present

- `tests/ai/ai.schema.drift.test.js`
- `schemas/README.md`
- `schemas/schemas/objects/placeholder.json`

## Missing

- `schemas/schemas/common.json`
- `schemas/schemas/requests/AiCallRequest.json`
- `schemas/schemas/responses/ApiSuccessEnvelope.json`
- `schemas/schemas/responses/ApiErrorEnvelope.json`
- The full stored object schema set, including `TrichomeAnalysis.json`,
  `HarvestDecision.json`, `Task.json`, `Alert.json`, and `EventLog.json`.

## Required Verification

After restoring the full schema pack, run:

```bash
npm test -- tests/ai/ai.schema.drift.test.js
```

Do not mark schema drift coverage complete until that command passes in CI or a
networked local environment with dependencies installed.

## Release Note

Any documentation that says all schema tests are passing or that all 25 stored
object schemas are checked in is stale until the missing files are restored.

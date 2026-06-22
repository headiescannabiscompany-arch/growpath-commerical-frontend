# Ready To Extract Schemas And Run Tests

## Status

The Jest schema drift stopper is CommonJS-compatible and expects the
authoritative schema pack at:

```text
<repoRoot>/schemas/schemas/
  common.json
  objects/
    TrichomeAnalysis.json
    HarvestDecision.json
    Task.json
    Alert.json
    EventLog.json
    ...
  requests/
    AiCallRequest.json
  responses/
    ApiSuccessEnvelope.json
    ApiErrorEnvelope.json
```

The nested `schemas/schemas/` path is intentional. It matches the original pack
layout and the release preflight.

## Install The Pack

Use the installer with either the authoritative zip or an extracted directory:

```bash
npm run schema:install -- path/to/growpath_json_schema_pack_v1_0_1.zip
```

or:

```bash
npm run schema:install -- path/to/extracted/schema-pack
```

The installer detects the folder containing `common.json`, `objects/`,
`requests/`, and `responses/`, copies it into `schemas/schemas/`, and runs:

```bash
npm run schema:preflight
```

## Validate

After installation:

```bash
npm test -- tests/ai/ai.schema.drift.test.js
```

Expected result with the full authoritative pack present:

```text
PASS tests/ai/ai.schema.drift.test.js
```

## What This Protects

- Backend response shape drift.
- Frontend request drift.
- Invalid enum values.
- Out-of-range confidence and measurement values.
- Stored AI object shape regressions.

# GrowPath JSON Schemas

> Status: PARTIAL
> Owner: Product/Engineering
> Last reviewed: 2026-06-21

This directory is reserved for backend/API schema contracts used by the AI call
router and schema drift tests.

## Current Repository State

The full V1 schema pack is not present in this workspace. The only checked-in
schema file currently under `schemas/schemas/` is:

```text
schemas/schemas/objects/placeholder.json
```

That placeholder is not enough to validate the AI request, response envelopes,
or stored object schemas. Do not claim schema drift coverage is complete until
the full pack is restored and the schema tests pass.

## Expected Full Pack Layout

When available, the schema pack should be extracted to:

```text
schemas/
  schemas/
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

The AI call router looks for request schemas at:

```text
schemas/schemas/requests/<name>.json
```

If schemas are missing, route-level schema loading must fail closed only where
that behavior is explicitly implemented. Current setup docs still treat full
schema extraction as required release work.

## Validation

Run the schema-pack preflight before release validation:

```bash
npm run schema:preflight
```

This command fails until the authoritative schema pack is restored. It requires:

- `schemas/schemas/common.json`
- `schemas/schemas/requests/AiCallRequest.json`
- `schemas/schemas/responses/ApiSuccessEnvelope.json`
- `schemas/schemas/responses/ApiErrorEnvelope.json`
- at least 20 non-placeholder stored object schemas under `schemas/schemas/objects/`

The schema drift test now includes a lightweight preflight that passes when the
full pack is absent and skips full drift validation. After restoring the full
schema pack and dependencies, run:

```bash
npm test -- tests/ai/ai.schema.drift.test.js
```

The schema drift test expects:

- `schemas/schemas/common.json`
- `schemas/schemas/objects/*.json`
- `schemas/schemas/requests/AiCallRequest.json`
- `schemas/schemas/responses/ApiSuccessEnvelope.json`
- `schemas/schemas/responses/ApiErrorEnvelope.json`
- at least 20 stored object schemas

## Notes

Cross-field constraints such as trichome distribution totals are enforced in
code/tests, not plain JSON Schema unless a custom keyword is added.

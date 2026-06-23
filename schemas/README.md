# GrowPath JSON Schemas

> Status: LOCAL V1 PACK PRESENT
> Owner: Product/Engineering
> Last reviewed: 2026-06-23

This directory is reserved for backend/API schema contracts used by the AI call
router and schema drift tests.

## Current Repository State

This workspace now contains a local V1 schema pack under `schemas/schemas/`.
It includes the AI request contract, response envelopes, a master AI response
object, feature-specific AI output objects, and stored object schemas used by
the schema drift tests.

The master AI contract is:

```text
schemas/schemas/objects/GrowPathAIResponse.json
```

Feature-specific AI output schemas include:

- `AIDiagnosisOutput.json`
- `GrowAwareAIOutput.json`
- `AutoTagOutput.json`
- `PlantDiagnosisOutput.json`
- `AIPhenoSummaryOutput.json`
- `AIStressSummaryOutput.json`

## Expected Full Pack Layout

The schema pack layout is:

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
      GrowPathAIResponse.json
      AIDiagnosisOutput.json
      GrowAwareAIOutput.json
      AutoTagOutput.json
      PlantDiagnosisOutput.json
      AIPhenoSummaryOutput.json
      AIStressSummaryOutput.json
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

This command requires:

- `schemas/schemas/common.json`
- `schemas/schemas/requests/AiCallRequest.json`
- `schemas/schemas/responses/ApiSuccessEnvelope.json`
- `schemas/schemas/responses/ApiErrorEnvelope.json`
- at least 20 non-placeholder stored object schemas under `schemas/schemas/objects/`

Run the active schema drift test with:

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

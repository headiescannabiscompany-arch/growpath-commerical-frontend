# GrowPath AI Schema Pack V1.0.1

Status: contract-locked, pending restoration into `schemas/schemas/`.

These schemas prevent API drift for AI calls, response envelopes, and persisted
AI objects.

## Directory Structure

The active release location is:

```text
schemas/schemas/
  common.json
  requests/
    AiCallRequest.json
  responses/
    ApiSuccessEnvelope.json
    ApiErrorEnvelope.json
  objects/
    TrichomeAnalysis.json
    HarvestDecision.json
    HarvestPlan.json
    SteeringReport.json
    IrrigationPlan.json
    LightingPlan.json
    ClimateCheck.json
    RiskAssessment.json
    NutrientCalc.json
    FertRecipe.json
    RecipeRun.json
    ECCheck.json
    SoilRecipe.json
    TopdressPlan.json
    DiagnosisReport.json
    PhenoScore.json
    PhenoDecision.json
    RunComparison.json
    CalendarEvent.json
    SchedulePlan.json
    Task.json
    TaskList.json
    Alert.json
    GrowNote.json
    InventoryUsage.json
    EventLog.json
```

## Install

Use the repo installer with the authoritative zip or extracted schema directory:

```bash
npm run schema:install -- path/to/growpath_json_schema_pack_v1_0_1.zip
```

The installer copies the detected schema tree into `schemas/schemas/` and runs:

```bash
npm run schema:preflight
```

## Backend Validation Pattern

```javascript
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import path from "path";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const schemaRoot = path.resolve(process.cwd(), "schemas/schemas");
const successEnvelope = JSON.parse(
  fs.readFileSync(path.join(schemaRoot, "responses/ApiSuccessEnvelope.json"), "utf8")
);
const errorEnvelope = JSON.parse(
  fs.readFileSync(path.join(schemaRoot, "responses/ApiErrorEnvelope.json"), "utf8")
);

const validateSuccess = ajv.compile(successEnvelope);
const validateError = ajv.compile(errorEnvelope);

export function validateAiResponse(response) {
  const validator = response.success ? validateSuccess : validateError;
  if (!validator(response)) {
    throw new Error(`AI response failed schema validation: ${ajv.errorsText()}`);
  }
  return response;
}
```

## Frontend Validation Pattern

```javascript
import Ajv from "ajv";
import addFormats from "ajv-formats";
import aiCallRequestSchema from "../../../schemas/schemas/requests/AiCallRequest.json";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateRequest = ajv.compile(aiCallRequestSchema);

export function assertAiCallRequest(request) {
  if (!validateRequest(request)) {
    throw new Error("AI request failed schema validation");
  }
}
```

## Automated Testing

Run:

```bash
npm test -- tests/ai/ai.schema.drift.test.js
```

With the full pack present, this validates:

- Request payload structure.
- Success and error envelopes.
- Stored object schemas.
- Enum enforcement.
- Numeric range enforcement.

Cross-field constraints, such as trichome distribution totals, remain code-level
validation unless a JSON Schema custom keyword is added.

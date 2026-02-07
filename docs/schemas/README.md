# GrowPath AI Schema Pack (V1.0.1)

**Status:** Contract-locked, engineering-ready
**Purpose:** Prevent schema drift, enforce API contracts, enable automated validation

---

## Directory Structure

```
docs/schemas/
├── common.json                    # Shared enums, ranges, and definitions
├── requests/
│   └── AiCallRequest.json         # POST /api/facility/:facilityId/ai/call
├── responses/
│   ├── ApiSuccessEnvelope.json    # Backend-aligned success envelope
│   └── ApiErrorEnvelope.json      # Backend-aligned error envelope
└── objects/
    ├── TrichomeAnalysis.json
    ├── HarvestDecision.json
    ├── HarvestPlan.json
    ├── SteeringReport.json
    ├── IrrigationPlan.json
    ├── LightingPlan.json
    ├── ClimateCheck.json
    ├── RiskAssessment.json
    ├── NutrientCalc.json
    ├── FertRecipe.json
    ├── RecipeRun.json
    ├── ECCheck.json
    ├── SoilRecipe.json
    ├── TopdressPlan.json
    ├── DiagnosisReport.json
    ├── PhenoScore.json
    ├── PhenoDecision.json
    ├── RunComparison.json
    ├── CalendarEvent.json
    ├── SchedulePlan.json
    ├── Task.json
    ├── TaskList.json
    ├── Alert.json
    ├── GrowNote.json
    ├── InventoryUsage.json
    └── EventLog.json
```

---

## Quick Start (Backend Validation)

### Install Ajv

```bash
npm install ajv ajv-formats
```

### Validate AI Response

```javascript
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import path from "path";

// Initialize Ajv
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

// Load schemas
const schemaRoot = path.resolve(__dirname, "../docs/schemas");
const successEnvelope = JSON.parse(
  fs.readFileSync(path.join(schemaRoot, "responses/ApiSuccessEnvelope.json"), "utf8")
);
const errorEnvelope = JSON.parse(
  fs.readFileSync(path.join(schemaRoot, "responses/ApiErrorEnvelope.json"), "utf8")
);

// Compile validators
const validateSuccess = ajv.compile(successEnvelope);
const validateError = ajv.compile(errorEnvelope);

// Validate response
function validateAiResponse(response) {
  const validator = response.success ? validateSuccess : validateError;
  const valid = validator(response);

  if (!valid) {
    console.error("❌ Schema violation:", validator.errors);
    throw new Error("AI response failed schema validation");
  }

  return response;
}

// Use in route handler
app.post("/api/facility/:facilityId/ai/call", async (req, res) => {
  try {
    const result = await aiEngine.call(req.body);
    const validatedResult = validateAiResponse(result);
    res.json(validatedResult);
  } catch (err) {
    const errorResponse = {
      success: false,
      data: null,
      error: { code: "INTERNAL_ERROR", message: err.message }
    };
    const validatedError = validateAiResponse(errorResponse);
    res.status(500).json(validatedError);
  }
});
```

---

## Quick Start (Frontend Validation)

```javascript
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Load request schema
import aiCallRequestSchema from "../docs/schemas/requests/AiCallRequest.json";
const validateRequest = ajv.compile(aiCallRequestSchema);

// Validate before sending
function callAi(tool, fn, args, context) {
  const request = { tool, fn, args, context };

  if (!validateRequest(request)) {
    console.error("❌ Invalid AI request:", validateRequest.errors);
    throw new Error("Request failed schema validation");
  }

  return fetch(`/api/facility/${context.facilityId}/ai/call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(request)
  });
}
```

---

## Automated Testing

The schema drift stopper test runs automatically on every CI build:

```bash
npm test -- tests/ai/ai.schema.drift.test.js
```

**Coverage:**

- ✅ Request validation (all 20 AI functions)
- ✅ Success envelope structure
- ✅ Error envelope structure (quality gate + impact gate)
- ✅ Stored object schemas (all 25 objects)
- ✅ Enum validation (zones, stages, priorities, statuses)
- ✅ Numeric range enforcement (confidence, VPD, EC, etc.)

**Prevents:**

- Backend response shape changes without version bump
- Frontend sending invalid requests
- Stored objects missing required fields
- Enum values outside canonical list
- Out-of-bounds numeric values

---

## Schema Versioning

All schemas follow semantic versioning aligned with the spec:

- **V1.0.1** (current) — Hardened contract-locked spec
- **V1.1** (planned) — JSON Schema pack enhancements, additional guardrails
- **V2.0** (future) — Breaking changes require full version bump

**Change Policy:**

- Any schema modification → version bump + review
- Breaking changes → major version bump (V2.0)
- Additive changes → minor version bump (V1.1)
- Clarifications only → patch version bump (V1.0.2)

---

## Validation Modes

### Strict Mode (Production)

```javascript
const ajv = new Ajv({
  allErrors: true, // Report all validation errors
  strict: true, // Enforce strict JSON Schema compliance
  removeAdditional: false // Don't strip extra fields
});
```

### Coerce Mode (Development)

```javascript
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  coerceTypes: true // Convert "1.5" → 1.5 automatically
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Schema Drift Tests
  run: npm test -- tests/ai/ai.schema.drift.test.js --coverage

- name: Fail on Schema Violations
  run: |
    if grep -q "Schema violation" test-output.log; then
      echo "❌ AI schema drift detected"
      exit 1
    fi
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

npm test -- tests/ai/ai.schema.drift.test.js --silent

if [ $? -ne 0 ]; then
  echo "❌ AI schema validation failed. Commit blocked."
  exit 1
fi
```

---

## Common Issues

### Issue: Schema file not found

**Solution:** Ensure schemas are copied to `docs/schemas/` directory

### Issue: Validation fails but data looks correct

**Solution:** Check for:

- ISO 8601 timestamp format (must include `.000Z`)
- UUID format (lowercase, hyphens)
- Enum values (case-sensitive, exact match)
- Numeric precision (floats vs integers)

### Issue: "Unknown format" error

**Solution:** Install `ajv-formats`:

```bash
npm install ajv-formats
```

Then add to validator:

```javascript
import addFormats from "ajv-formats";
addFormats(ajv);
```

---

## Schema Authoring Guidelines

When adding new schemas (V1.1+):

1. **Use `$schema`**: `"$schema": "http://json-schema.org/draft-07/schema#"`
2. **Define `$id`**: Unique identifier for the schema
3. **Add `title`** and `description`: Document purpose
4. **Lock enums**: Use `"enum": [...]` for fixed value sets
5. **Set numeric ranges**: Use `minimum`, `maximum`, `exclusiveMinimum`, etc.
6. **Require core fields**: List all non-optional fields in `required: [...]`
7. **Add examples**: Include valid sample objects in `examples: [...]`

---

## Support

**Schema Issues:** Open issue in repo with "schema-drift" label
**Spec Questions:** Review [GROWPATH_TOOL_FUNCTION_SPEC_V1.0.1_HARDENED.md](../GROWPATH_TOOL_FUNCTION_SPEC_V1.0.1_HARDENED.md)
**Test Failures:** Check [ai.schema.drift.test.js](../../tests/ai/ai.schema.drift.test.js)

---

**Status:** ✅ ENGINEERING READY
**Lock Level:** Changes require version bump + review

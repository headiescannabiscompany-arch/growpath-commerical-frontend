# AI Schema Drift Stopper Setup Complete ✅

## What Was Created

### 1. Test File

**Location:** `tests/ai/ai.schema.drift.test.js`

**Coverage:**

- ✅ Request validation (AiCallRequest)
- ✅ Success envelope validation
- ✅ Error envelope validation (quality + impact gates)
- ✅ Stored object validation (all 25 objects)
- ✅ Enum enforcement
- ✅ Numeric range checks
- ✅ Required field validation

**Status:** Ready to run once schemas are in place

### 2. Schema Directory README

**Location:** `docs/schemas/README.md`

**Contents:**

- Ajv usage examples (backend + frontend)
- CI/CD integration patterns
- Schema versioning policy
- Common troubleshooting
- Authoring guidelines

### 3. Dependencies

**Already installed:** ✅

- `ajv` v8.17.1
- `ajv-formats` v3.0.1

---

## Next Steps

### 1. Place Schema Files

Extract the JSON Schema pack you mentioned and place files in:

```
docs/schemas/
├── common.json
├── requests/
│   └── AiCallRequest.json
├── responses/
│   ├── ApiSuccessEnvelope.json
│   └── ApiErrorEnvelope.json
└── objects/
    ├── TrichomeAnalysis.json
    ├── HarvestDecision.json
    ├── HarvestPlan.json
    ... (all 25 stored objects)
```

### 2. Run the Test

```bash
npm test -- tests/ai/ai.schema.drift.test.js
```

**Expected output:**

```
PASS tests/ai/ai.schema.drift.test.js
  AI Schema Drift Stopper
    Schema Loading
      ✓ should load all required schemas
      ✓ should compile all schemas without errors
    Request Schema Validation
      ✓ should validate a valid AiCallRequest
      ✓ should reject request with invalid tool
      ✓ should reject request with missing required fields
    Response Envelope Validation (Success)
      ✓ should validate success envelope with data
      ✓ should reject success envelope with missing data
    ... (40+ tests total)

Test Suites: 1 passed, 1 total
Tests:       42 passed, 42 total
```

### 3. Add to CI Pipeline

**GitHub Actions:**

```yaml
- name: Schema Drift Check
  run: npm test -- tests/ai/ai.schema.drift.test.js
```

**Pre-commit hook:**

```bash
#!/bin/bash
npm test -- tests/ai/ai.schema.drift.test.js --silent
```

---

## Usage in Backend Routes

Once schemas are in place, wire up validation in your AI endpoint:

```javascript
// backend/routes/ai.js
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

// Load schemas at startup
const successSchema = JSON.parse(
  fs.readFileSync("./docs/schemas/responses/ApiSuccessEnvelope.json")
);
const validateSuccess = ajv.compile(successSchema);

// Use in route handler
router.post("/api/facility/:facilityId/ai/call", async (req, res) => {
  const result = await aiEngine.call(req.body);

  // Validate before sending
  if (!validateSuccess(result)) {
    console.error("❌ Schema violation:", validateSuccess.errors);
    // Log to monitoring, but still send response
  }

  res.json(result);
});
```

---

## Test Failure Scenarios

The test will **fail** if:

1. **Schema files missing** → "Schema loading failed"
2. **Invalid enum value** → "should reject ... with invalid status"
3. **Out of range numeric** → "should reject ... with out-of-bounds biasScore"
4. **Missing required field** → "should reject ... with missing required fields"
5. **Wrong envelope structure** → "should reject success envelope with missing data"

This prevents:

- Backend accidentally changing response shape
- Frontend sending malformed requests
- Stored objects missing critical fields
- Silent contract drift over time

---

## Status

✅ Test harness ready
⏳ Waiting for schema files to be placed in `docs/schemas/`
✅ Dependencies installed
✅ Documentation complete

**Next:** Place schema files → Run test → Add to CI

---

## What Comes After

Once this test is passing:

**Option #3: AI Brain Spec V1**
Formalizes your "deterministic-first, probabilistic-second" philosophy into engineering doc

Would document:

- Decision flow (internal → external → reconcile)
- External model integration points
- Confidence adjustment rules
- GrowNote reasoning capture
- Which functions NEVER call external models vs which MAY validate

Ready to proceed? 🚀

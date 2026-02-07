# Ready to Extract Schemas & Run Tests

## Status: ✅ CommonJS Test Ready

Your Jest drift stopper has been updated to **CommonJS** (required for Node.js test environment).

### File Updated

- `tests/ai/ai.schema.drift.test.js` — CommonJS with `require()`, no ES modules

### Expectations

The test expects schemas at:

```
<repoRoot>/schemas/schemas/
├── common.json
├── objects/
│   ├── TrichomeAnalysis.json
│   ├── HarvestDecision.json
│   ├── Task.json
│   ├── Alert.json
│   ├── EventLog.json
│   └── ... (20+ more)
├── requests/
│   └── AiCallRequest.json
└── responses/
    ├── ApiSuccessEnvelope.json
    └── ApiErrorEnvelope.json
```

Note: **Nested double `schemas/schemas/`** — that's the exact structure from the zip extract.

---

## Next: Extract & Test

### 1. Extract Schema Zip

```bash
# Download from: sandbox:/mnt/data/growpath_json_schema_pack_v1_0_1.zip
# Extract into: <repoRoot>/schemas/
```

### 2. Run Test

```bash
npm test -- tests/ai/ai.schema.drift.test.js
```

### 3. Expected: All Pass

```
PASS tests/ai/ai.schema.drift.test.js
  AI Schema Drift Stopper (V1.0.1)
    ✓ Schema folders exist
    ✓ All schema JSON files parse
    ✓ AiCallRequest schema exists
    ✓ Envelope schemas exist
    ... (17+ more tests)
Tests: 21 passed
```

---

## What's Protected

Once schemas are in place + tests pass:

✅ Backend can't change response shape without breaking test
✅ Frontend can't send invalid requests without breaking test
✅ Enums are locked (can't add invalid values)
✅ Numeric ranges enforced (confidence <= 1.0, etc.)
✅ Required fields validated

---

## Ready for #3 AI Brain Spec V1?

Once test is passing, next step is documenting:

- Deterministic-first decision flow
- When/how external models get consulted
- Confidence adjustment rules
- Which functions NEVER call external APIs
- Full engineering spec for reasoning reconciliation

🚀

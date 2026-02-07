# AI Call Router Setup Guide

## Overview

The AI Call endpoint is the main orchestrator for all AI-driven functions in GrowPath. It implements the Brain Spec V1 philosophy: deterministic-first, external-validation-optional, always auditable.

**Endpoint:** `POST /api/facility/:facilityId/ai/call`

## Files Created

1. **backend/utils/errors.js** — Canonical error helper + Express error handler middleware
2. **backend/routes/ai.call.js** — Main AI orchestrator router
3. **backend/routes/ai.call.test.js** — End-to-end Jest tests (7 test cases)

## Installation Steps

### 1. Mount in Your App

Add this to your main Express app file (e.g., `app.js` or `server.js`):

```javascript
// After all other routers
const aiRouter = require("./routes/ai.call");
app.use("/api/facility/:facilityId/ai", aiRouter);

// Error handler (must be LAST)
const { errorHandler } = require("./utils/errors");
app.use(errorHandler);
```

**Important:** The error handler middleware must be the last `app.use()` call.

### 2. Verify Dependencies

Ensure these are in your `package.json` devDependencies:

```bash
npm i -D ajv ajv-formats
```

They should already be present from the schema pack setup.

### 3. Ensure Schema Pack Extracted

If you haven't already, extract the schema zip:

```bash
# Download from sandbox and extract
unzip growpath_json_schema_pack_v1_0_1.zip -d ./schemas
# Creates: <repoRoot>/schemas/schemas/requests/AiCallRequest.json
```

If schemas are not present, the router will warn and skip Ajv validation until they're available.

### 4. Run Tests

```bash
npm test -- backend/routes/ai.call.test.js
```

Expected output:

```
PASS backend/routes/ai.call.test.js
  AI Call Router (ai.call.js)
    POST /api/facility/:facilityId/ai/call
      ✓ Rejects request without tool (XX ms)
      ✓ Rejects unregistered function (XX ms)
      ✓ harvest.analyzeTrichomes with valid images returns result + TrichomeAnalysis write (XX ms)
      ✓ climate.computeVPD (deterministic) returns confidence 1.0 (XX ms)
      ✓ ec.recommendCorrection with small drift → success (XX ms)
      ✓ ec.recommendCorrection with large drift → 409 USER_CONFIRMATION_REQUIRED (XX ms)
      ✓ Missing images in harvest.analyzeTrichomes → 400 MISSING_REQUIRED_INPUTS (XX ms)
      ✓ Context facilityId mismatch → 400 VALIDATION_ERROR (XX ms)

Tests: 8 passed
```

## Implementation Checklist

- [ ] Copy `backend/utils/errors.js` (canonical error helper)
- [ ] Copy `backend/routes/ai.call.js` (main router)
- [ ] Add `app.use(errorHandler)` to your main app file
- [ ] Mount `aiRouter` at `/api/facility/:facilityId/ai`
- [ ] Extract schema pack into `<repoRoot>/schemas/schemas/`
- [ ] Run `npm test -- backend/routes/ai.call.test.js` (expect 8 pass)
- [ ] Wire real handlers:
  - [ ] `harvest.analyzeTrichomes` — Call image analysis (local/external CV model)
  - [ ] `climate.computeVPD` — Already implemented (deterministic)
  - [ ] `ec.recommendCorrection` — Already implemented (with impact gate)
  - [ ] `tasks.generateDailyTasks` — Stub, needs real task generation logic
- [ ] Wire models to persist:
  - [ ] `GrowNote` (audit snapshot)
  - [ ] `EventLog` (trigger record)
  - [ ] `Task` (generated tasks)
  - [ ] `TrichomeAnalysis` (harvest analysis result)
  - [ ] `Alert` (risk/diagnostic alerts)
- [ ] Integrate external validator (stub, ready for GPT/Claude/local)

## Request Contract

```json
{
  "tool": "harvest",
  "fn": "harvest.analyzeTrichomes",
  "args": {
    "images": ["https://example.com/img1.jpg"],
    "zones": ["top"],
    "notes": "macro lens, 100x"
  },
  "context": {
    "facilityId": "fac_123",
    "growId": "grow_123",
    "stage": "flower",
    "goal": "balanced",
    "date": "2026-02-07T10:00:00Z"
  }
}
```

## Response Contract (Success)

```json
{
  "success": true,
  "data": {
    "result": {
      "id": "ta_1707304800000",
      "recommendation": "Ready in 5-7 days",
      "clarity": 0.3,
      "cloudy": 0.6,
      "amber": 0.1
    },
    "writes": [
      { "type": "TrichomeAnalysis", "id": "ta_1707304800000" },
      { "type": "GrowNote", "id": "note_123" }
    ],
    "confidence": 0.75,
    "external": {
      "outcome": "INSUFFICIENT",
      "critique": [],
      "suggestions": [],
      "confidenceDelta": 0
    }
  },
  "error": null
}
```

## Response Contract (Error)

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "USER_CONFIRMATION_REQUIRED",
    "message": "EC change 0.25 exceeds safe delta 0.2"
  }
}
```

## Guardrails Enforced

1. **Quality Gate** (Step 3 in Brain Spec)
   - Confidence < 0.6 → `CONFIDENCE_TOO_LOW` (400)
   - Missing required inputs → `MISSING_REQUIRED_INPUTS` (400)
   - Invalid args schema → `VALIDATION_ERROR` (400)

2. **Impact Gate** (Step 5 in Brain Spec)
   - EC delta > 0.2 → `USER_CONFIRMATION_REQUIRED` (409)
   - RH shift > 5% → `USER_CONFIRMATION_REQUIRED` (409)
   - PPFD step > 10% → `USER_CONFIRMATION_REQUIRED` (409)

3. **Registry Enforcement** (Step 1 in Brain Spec)
   - Function not in registry → `UNSUPPORTED_FUNCTION` (400)
   - Handler not yet implemented → `UNSUPPORTED_FUNCTION` (501)

## Handler Implementation Pattern

When adding new handlers to `HANDLERS` object in `ai.call.js`:

```javascript
async "tool.functionName"(ctx, args, writes) {
  // 1. Validate required inputs
  if (!args.requiredField) {
    return { error: { code: "MISSING_REQUIRED_INPUTS", message: "..." }, status: 400 };
  }

  // 2. Run deterministic logic (no external calls for deterministic-only functions)
  const result = myDeterministicCalc(args);

  // 3. Check impact gate (if applies)
  if (result.impactExceedsMax) {
    return {
      result: null,
      error: { code: "USER_CONFIRMATION_REQUIRED", message: "..." },
      status: 409
    };
  }

  // 4. Create persistent objects and track writes
  const objId = `obj_${Date.now()}`;
  writes.add("ObjectType", objId);

  // 5. Return success object
  return {
    result: { ...result, id: objId },
    confidence: 0.85,
    audit: {
      body: `tool.functionName → result summary`,
      tags: ["ai", "tool"]
    }
  };
}
```

## Extending with External Validation

The router has a stub `externalValidate()` function ready for LLM integration:

```javascript
async function externalValidate({ fn, packet }) {
  // packet = { ctx, computedMetrics, proposal, assumptions, requestedCritique }
  // TODO: Call GPT / Claude / local model
  // Return: { outcome, critique, suggestions, confidenceDelta }
  // confidenceDelta must be bounded: max ±0.10
}
```

Current behavior:

- Only eligible functions call external validator (Brain Spec V1, Section 6.1)
- Confidence must be in gray zone (0.60–0.85) to trigger external call
- External response NEVER overrides decision (only adjusts confidence)

## Audit & Observability

Every significant AI call writes a `GrowNote` containing:

- Tool + function name
- Input summary
- Confidence level
- Recommendation
- External validator outcome (if consulted)

Enable debugging via environment:

```bash
NODE_DEBUG=ai.* npm run dev
```

Logs are prefixed `[AI.CALL]` for easy filtering.

## Next Steps

1. **Implement 3 core handlers** (fastest path):
   - `harvest.analyzeTrichomes` (image analysis)
   - `climate.computeVPD` (already done ✓)
   - `tasks.generateDailyTasks` (checklist generation)

2. **Wire model persistence** (GrowNote, Task, etc.)

3. **Add facility role gates** (e.g., require STAFF for high-impact functions)

4. **Integrate external validator** (GPT/Claude endpoint)

5. **Add /api/facility/:facilityId/ai/history** (fetch recent AI calls + decisions)

---

**Brain Spec Reference:** [docs/GROWPATH_AI_BRAIN_SPEC_V1.md](../docs/GROWPATH_AI_BRAIN_SPEC_V1.md)

**Schema Pack Reference:** [schemas/README.md](../schemas/README.md)

**Testing Guide:** `npm test -- backend/routes/ai.call.test.js`

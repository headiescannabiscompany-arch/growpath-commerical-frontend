# GrowPath AI Call Contract v1.0

**Status**: 🔒 LOCKED (tested, shipped, non-breaking)

## Endpoint

```
POST /api/facility/:facilityId/ai/call
```

**Auth**: Required (STAFF+ role)
**Scope**: Facility scoped (:facilityId in path)

---

## Request Payload

Send this payload verbatim — do not reshape or wrap:

```json
{
  "tool": "harvest",
  "fn": "estimateHarvestWindow",
  "args": {
    "daysSinceFlip": 30,
    "goal": "balanced",
    "distribution": {
      "clear": 0.25,
      "cloudy": 0.65,
      "amber": 0.1
    }
  },
  "context": {
    "growId": "GROW_TEST_001"
  }
}
```

**Validation Rules**:

- `tool` — required, string
- `fn` — required, string
- `args` — required, object (shape varies by tool)
- `context.growId` — required, string (grows require it)

**Backend Rejects**:

- Unknown `tool + fn` pairs → 404 UNKNOWN_TOOL
- Missing `growId` when tool requires it → 400 MISSING_GROW_CONTEXT
- Invalid `args` → 400 INVALID_ARGS

---

## Response: Success

HTTP 200

```json
{
  "success": true,
  "tool": "harvest",
  "fn": "estimateHarvestWindow",
  "growId": "GROW_TEST_001",
  "result": {
    "window": {
      "earliest": "2026-03-05",
      "latest": "2026-03-12"
    },
    "confidence": 0.74,
    "recommendation": "Begin monitoring trichomes daily. Expect peak harvest mid-window.",
    "calendarWrites": [
      {
        "type": "MONITOR",
        "date": "2026-03-05",
        "note": "Start daily trichome checks"
      },
      {
        "type": "TARGET",
        "date": "2026-03-09",
        "note": "Projected optimal harvest day"
      },
      {
        "type": "HARD_STOP",
        "date": "2026-03-12",
        "note": "Harvest before degradation risk increases"
      }
    ]
  }
}
```

**Field Meanings**:

- `window.earliest` — earliest safe harvest date (string, ISO or YYYY-MM-DD)
- `window.latest` — latest safe harvest date
- `confidence` — 0.0–1.0 (multiply by 100 for %)
- `recommendation` — human-readable guidance
- `calendarWrites` — array of calendar events to persist (always 3 for harvest)

---

## Response: Error

HTTP 400/404/403/etc.

```json
{
  "error": {
    "code": "UNKNOWN_TOOL",
    "message": "Tool 'harvestt' with function 'estimateHarvestWindow' is not registered"
  }
}
```

**Allowed Codes** (v1):

- `UNAUTHENTICATED` (401)
- `FORBIDDEN` (403)
- `ROLE_REQUIRED` (403)
- `MISSING_GROW_CONTEXT` (400)
- `INVALID_ARGS` (400)
- `UNKNOWN_TOOL` (404)

---

## Frontend Implementation Checklist

### ✅ Request Sending

- [x] HarvestWindowScreen sends payload verbatim (no reshaping)
- [x] Tool/function names use TS enums (AITool, HarvestFn) to prevent typos
- [x] Args match contract: daysSinceFlip, goal, distribution
- [x] Context includes growId

### ✅ Response Parsing

- [x] Success path: reads `result.window.earliest` and `.latest`
- [x] Success path: reads `result.confidence` (0-1 scale)
- [x] Success path: reads `result.recommendation`
- [x] Success path: reads `result.calendarWrites` (length = 3)
- [x] Error path: reads `error.code` and `.message`

### ✅ UX Flow

- [x] Form validation: daysSinceFlip must be numeric
- [x] Form validation: distribution values sum ≈ 1.0 (or warn)
- [x] Loading state while request is in flight
- [x] Error display if response.error exists
- [x] Result display if response.success = true
- [x] Calendar refresh after successful result

### 🟡 Optional (v1.1+)

- [ ] Confidence threshold gating (require ack if < 0.6)
- [ ] Calendar event inspection before persist
- [ ] Undo/revert capability
- [ ] Share result via link

---

## Backend Implementation Status

✅ **Complete & Tested**

- [x] POST /api/facility/:facilityId/ai/call implemented
- [x] Canonical AI_TOOLS registry (harvest.estimateHarvestWindow)
- [x] Request validation + error envelopes
- [x] Response shape locked
- [x] Contract test (ai.call.test.js) passing
- [x] Test mode bypass (x-test-user-id) safe & gated

---

## Contract Test (Always Run Before Deploy)

```bash
npm run test:contracts
```

Expected: All ai.call tests pass.

---

## Backward Compatibility

**N/A** (v1.0 is the first release)

Future changes (v1.1+):

- Adding new tools? Add to registry, no contract change.
- Changing result shape? New version (v2.0), old clients must upgrade.
- Adding optional fields? Safe (use optional chaining in frontend).

---

## Design Rationale

- **No wrapping**: Payload is sent verbatim to prevent reshaping bugs
- **Deterministic**: Tool registry is server-side, no free-form LLM calls
- **Testable**: Every tool has a contract test
- **Extensible**: Add tools to registry without frontend changes
- **Safe**: Facility scope + role enforcement built-in
- **Observable**: Writes array proves what was persisted

---

## Next Steps

1. **Harvest Window e2e test**: Navigate UI, post payload, confirm response shape
2. **Add second tool**: Copy pattern from harvest.estimateHarvestWindow
3. **Confidence gating**: Add modal for low-confidence results
4. **Calendar integration**: Persist writes to calendar on success

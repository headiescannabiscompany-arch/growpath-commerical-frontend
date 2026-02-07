# GrowPath Tool → Function → Stored Object Spec (V1.0.1 Hardened)

**Version:** 1.0.1
**Owner:** GrowPath
**Scope:** Personal + Commercial + Facility
**Purpose:** Contract-locked spec for tools, functions, stored objects, triggers, guardrails, and AI transport.

---

## 0) Global Conventions

### 0.1 IDs / Foreign Keys

- All objects use `id: string` (UUID).
- Foreign keys: `facilityId`, `growId`, `runId`, `cultivarId`, `userId`, `recipeId`, `eventId` (all `string`).

### 0.2 Timestamps / Soft Delete

All stored objects include:

- `createdAt: string` (ISO 8601)
- `updatedAt: string` (ISO 8601)
- `deletedAt?: string | null` (soft delete)

### 0.3 Canonical Response Envelope (Option A)

**Success:**

```json
{ "success": true, "data": {}, "error": null }
```

**Error:**

```json
{ "success": false, "data": null, "error": { "code": "STRING", "message": "STRING" } }
```

### 0.4 Error Codes (Shared)

**Input/Quality Gate:**

- `MISSING_REQUIRED_INPUTS`
- `CONFIDENCE_TOO_LOW`
- `VALIDATION_ERROR`
- `UNSUPPORTED_FUNCTION`

**Bounds/Safety:**

- `OUT_OF_BOUNDS`
- `UNSUPPORTED_STAGE`
- `UNSAFE_RECOMMENDATION`

**Impact Gate (confirmation):**

- `USER_CONFIRMATION_REQUIRED`

### 0.5 Enums (Canonical)

- **Zone:** `"top" | "mid" | "lower"`
- **RiskLevel:** `"low" | "medium" | "high"`
- **Priority:** `"low" | "med" | "high"`
- **PhenoDecision:** `"keep" | "discard" | "rerun"`
- **TaskStatus:** `"open" | "done" | "skipped"`
- **Stage** (v1 minimal, extendable): `"clone" | "veg" | "flower" | "dry" | "cure"`

### 0.6 Numeric Ranges (Canonical)

- `confidence`: 0..1
- `distribution.clear/cloudy/amber`: 0..1 and should sum to ~1.0 (tolerance ±0.02)
- `ppfd`: 0..2000
- `dli`: 0..80
- `rh`: 0..100
- `vpd`: 0..5
- `ec`: 0..10
- `riskScore`: 0..1
- `biasScore`: -1..1 (negative = vegetative, positive = generative)

---

## 1) AI Transport Layer (Canonical)

### 1.1 Endpoint

**Facility-scoped canonical:**

```
POST /api/facility/:facilityId/ai/call
```

(Optional legacy dual mount, if your backend supports it elsewhere):

```
POST /api/facilities/:facilityId/ai/call
```

### 1.2 Auth / Scope

- Must pass standard auth (JWT) OR test headers (dev only), per backend contract.
- Facility scope comes from `:facilityId` param AND/OR your canonical `X-Facility-Id` handling (implementation-defined).
- Backend MUST enforce facility membership/role as applicable per tool.

### 1.3 Request Contract

```json
{
  "tool": "harvest|steering|light|climate|risk|nutrients|fert|ec|soil|topdress|diagnosis|pheno|runs|calendar|tasks",
  "fn": "string",
  "args": {},
  "context": {
    "facilityId": "uuid",
    "growId": "uuid",
    "runId": "uuid",
    "cultivarId": "uuid",
    "stage": "clone|veg|flower|dry|cure",
    "goal": "string",
    "date": "iso"
  }
}
```

### 1.4 Response Contract

```json
{
  "success": true,
  "data": {
    "result": {},
    "writes": [{ "type": "StoredObjectType", "id": "uuid" }],
    "requiresConfirmation": false,
    "confirmation": null
  },
  "error": null
}
```

**Impact Gate response (confirmation required):**

```json
{
  "success": false,
  "data": null,
  "error": { "code": "USER_CONFIRMATION_REQUIRED", "message": "..." }
}
```

### 1.5 Unsupported Function

If `tool/fn` not in registry:

```json
{
  "success": false,
  "data": null,
  "error": { "code": "UNSUPPORTED_FUNCTION", "message": "Function not registered" }
}
```

---

## 2) Event / Trigger Model

### 2.1 Event Types

- `SCHEDULED_DAILY`
- `SCHEDULED_WEEKLY`
- `SCHEDULED_LATE_FLOWER_WEEKLY`
- `LIGHTS_ON`
- `LIGHTS_OFF`
- `WATERING_EVENT`
- `STAGE_CHANGED`
- `MANUAL_RUN`

### 2.2 EventLog Stored Object

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "type": "SCHEDULED_DAILY",
  "payload": {},
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

---

## 3) Guardrails (Hardened)

### 3.1 Gate A — Input/Quality Gate (hard stop)

Return an error if:

- required fields are missing → `MISSING_REQUIRED_INPUTS`
- analysis confidence < 0.60 → `CONFIDENCE_TOO_LOW`
- stage invalid/unknown → `UNSUPPORTED_STAGE`
- invalid enum/range → `VALIDATION_ERROR`

### 3.2 Gate B — Impact Gate (propose but require user confirmation)

If recommendation changes exceed max delta thresholds:

- Return `USER_CONFIRMATION_REQUIRED` with a clear message.
- Frontend performs explicit confirm flow (v1 uses a second call with `args.confirmationToken` or separate "confirm" endpoint; implementation choice).

**Default max deltas (v1):**

- EC change per watering event: `abs(deltaEC) <= 0.2`
- RH shift per cycle: `abs(deltaRH) <= 5`
- PPFD change per stage update: `<= 10%` of current setpoint

### 3.3 Safety/Policy

- No medical or legal advice. If user requests, respond with `UNSAFE_RECOMMENDATION`.
- No direct HVAC/device control unless explicitly enabled in facility settings (future v1.1).

---

## 4) Stored Object Schemas (Hardened Stubs)

All include `id`, `createdAt`, `updatedAt`, `deletedAt`.

### 4.1 TrichomeAnalysis

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "images": ["url"],
  "zones": ["top", "mid", "lower"],
  "distribution": { "clear": 0, "cloudy": 0, "amber": 0 },
  "confidence": 0,
  "notes": "string",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.2 HarvestDecision

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "window": { "min": "iso", "ideal": "iso", "max": "iso" },
  "recommendation": "string",
  "partialHarvest": false,
  "confidence": 0,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.3 HarvestPlan (NEW)

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "status": "string",
  "decisionId": "uuid",
  "nextReviewAt": "iso",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.4 SteeringReport

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "biasScore": 0,
  "drybackPercent": 0,
  "nextIrrigationTime": "iso",
  "ecDelta": 0,
  "confidence": 0,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.5 IrrigationPlan

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "events": [{ "time": "iso", "volumeMl": 0 }],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.6 LightingPlan

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "photoperiodHours": 0,
  "dli": 0,
  "targetDLI": 0,
  "recommendedPPFD": 0,
  "warnings": ["string"],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.7 ClimateCheck

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "airTempC": 0,
  "rh": 0,
  "leafOffsetC": 0,
  "vpd": 0,
  "dewPointC": 0,
  "riskLevel": "low",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.8 RiskAssessment

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "riskScore": 0,
  "riskLevel": "low",
  "mitigationSteps": ["string"],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.9 NutrientCalc

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "nppm": 0,
  "ppmp": 0,
  "ppmk": 0,
  "ratio": "string",
  "confidence": 1,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.10 FertRecipe

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "name": "string",
  "ingredients": [{ "productId": "uuid", "amount": 0, "unit": "g|ml" }],
  "targetEC": 0,
  "targetRatio": "string",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.11 RecipeRun

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "recipeId": "uuid",
  "volumeLiters": 0,
  "estimatedEC": 0,
  "cost": 0,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.12 InventoryUsage (NEW)

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "sourceType": "fert|soil|topdress",
  "sourceId": "uuid",
  "items": [{ "productId": "uuid", "amount": 0, "unit": "g|ml|L" }],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.13 ECCheck

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "targetEC": 0,
  "inEC": 0,
  "outEC": 0,
  "drift": 0,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.14 SoilRecipe

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "name": "string",
  "volumeLiters": 0,
  "ingredients": [{ "name": "string", "amount": 0, "unit": "g|L" }],
  "cost": 0,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.15 TopdressPlan

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "schedule": [
    { "date": "iso", "items": [{ "name": "string", "amount": 0, "unit": "g" }] }
  ],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.16 DiagnosisReport

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "symptoms": ["string"],
  "rankedCauses": [{ "cause": "string", "confidence": 0 }],
  "confirmationChecklist": ["string"],
  "actionPlan": ["string"],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.17 PhenoScore

```json
{
  "id": "uuid",
  "cultivarId": "uuid",
  "runId": "uuid",
  "scorecard": { "vigor": 0, "resin": 0, "terps": 0 },
  "keeperProbability": 0,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.18 PhenoDecision

```json
{
  "id": "uuid",
  "cultivarId": "uuid",
  "runId": "uuid",
  "decision": "keep",
  "rationale": "string",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.19 RunComparison

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "runA": "uuid",
  "runB": "uuid",
  "metrics": [{ "name": "string", "delta": 0 }],
  "likelyDrivers": ["string"],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.20 CalendarEvent

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "type": "string",
  "title": "string",
  "date": "iso",
  "metadata": {},
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.21 SchedulePlan

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "weekStart": "iso",
  "eventIds": ["uuid"],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.22 Task (NEW)

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "title": "string",
  "priority": "low|med|high",
  "status": "open|done|skipped",
  "dueAt": "iso",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.23 TaskList

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "date": "iso",
  "tasks": [{ "taskId": "uuid", "priority": "low|med|high" }],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.24 Alert (NEW)

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "type": "string",
  "riskLevel": "low|medium|high",
  "message": "string",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### 4.25 GrowNote (NEW)

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "growId": "uuid",
  "body": "string",
  "tags": ["string"],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

---

## 5) Function Registry (Canonical)

The AI may ONLY invoke functions below.

### Harvest

- `harvest.analyzeTrichomes`
- `harvest.estimateHarvestWindow`
- `harvest.recommendPartialHarvest`
- `harvest.updateHarvestPlan`

### Steering

- `steering.computeDryback`
- `steering.scoreSteeringBias`
- `steering.recommendNextIrrigation`
- `steering.suggestECAdjustment`

### Light

- `light.computeDLI`
- `light.targetDLI`
- `light.recommendPPFD`
- `light.co2CompatibilityCheck`

### Climate

- `climate.computeVPD`
- `climate.computeDewPoint`
- `climate.nightSwingRisk`
- `climate.recommendRHShift`

### Risk

- `risk.computeBudRotRisk`
- `risk.recommendMitigationActions`

### Nutrients

- `nutrients.computeDeliveredNPK`
- `nutrients.computeRatio`

### Fert

- `fert.buildRecipe`
- `fert.scaleRecipe`
- `fert.estimateCost`

### EC

- `ec.targetEC`
- `ec.computeDrift`
- `ec.recommendCorrection`

### Soil

- `soil.buildMix`
- `soil.scaleAmendments`
- `soil.computeCost`

### Topdress

- `topdress.recommendTopdress`
- `topdress.computeTopdressAmounts`

### Diagnosis

- `diagnosis.analyzeSymptoms`
- `diagnosis.proposeCauses`
- `diagnosis.confirmChecks`
- `diagnosis.recommendAction`

### Pheno

- `pheno.scorePheno`
- `pheno.comparePhenotypes`
- `pheno.recommendKeeper`

### Runs

- `runs.compareRuns`
- `runs.attributeDeltas`

### Calendar

- `calendar.generateCalendar`
- `calendar.updateCalendarOnEvent`

### Tasks

- `tasks.generateDailyTasks`
- `tasks.prioritizeTasks`

---

## 6) Function Contracts (Complete)

All functions are invoked via `POST /api/facility/:facilityId/ai/call` with `{ tool, fn, args, context }`.

### 6.1 HARVEST

#### harvest.analyzeTrichomes

**Args:**

```json
{ "images": ["url"], "zones": ["top"], "notes": "string" }
```

**Writes:** `TrichomeAnalysis`, `GrowNote`
**Returns:** `{ trichomeAnalysisId }`
**Quality Gate:** missing images → `MISSING_REQUIRED_INPUTS`; confidence<0.6 → `CONFIDENCE_TOO_LOW`

#### harvest.estimateHarvestWindow

**Args:**

```json
{
  "daysSinceFlip": 0,
  "cultivarId": "uuid",
  "goal": "string",
  "aromaNotes": "string",
  "resinTexture": "string"
}
```

**Writes:** `HarvestDecision`, `GrowNote`
**Returns:** `{ harvestDecisionId }`
**Quality Gate:** daysSinceFlip missing → `MISSING_REQUIRED_INPUTS`

#### harvest.recommendPartialHarvest

**Args:**

```json
{ "canopyZones": ["top", "lower"], "maturitySpread": "string" }
```

**Writes:** `HarvestDecision` (update)
**Returns:** `{ harvestDecisionId }`

#### harvest.updateHarvestPlan

**Args:**

```json
{ "decisionId": "uuid", "nextReviewAt": "iso" }
```

**Writes:** `HarvestPlan`, `CalendarEvent`
**Returns:** `{ harvestPlanId, calendarEventId }`

---

### 6.2 STEERING

#### steering.computeDryback

**Args:**

```json
{
  "media": "string",
  "containerSize": "string",
  "irrigationEvents": [{ "time": "iso", "volumeMl": 0 }]
}
```

**Writes:** `SteeringReport`
**Returns:** `{ drybackPercent }`

#### steering.scoreSteeringBias

**Args:**

```json
{ "media": "string", "inEC": 0, "outEC": 0, "postureNotes": "string" }
```

**Writes:** `SteeringReport`, `GrowNote`
**Returns:** `{ steeringReportId }`
**Bounds Gate:** EC beyond cultivar max → `OUT_OF_BOUNDS`

#### steering.recommendNextIrrigation

**Args:**

```json
{ "biasScore": 0, "stage": "clone|veg|flower|dry|cure" }
```

**Writes:** `IrrigationPlan`, `Task`
**Returns:** `{ irrigationPlanId }`

#### steering.suggestECAdjustment

**Args:**

```json
{ "inEC": 0, "outEC": 0, "stage": "clone|veg|flower|dry|cure" }
```

**Writes:** `ECCheck`
**Returns:** `{ deltaEC }`
**Impact Gate:** abs(deltaEC)>0.2 → `USER_CONFIRMATION_REQUIRED`

---

### 6.3 LIGHT

#### light.computeDLI

**Args:** `{ "ppfd":0, "photoperiodHours":0 }`
**Returns:** `{ dli }`

#### light.targetDLI

**Args:** `{ "stage":"...", "cultivarId":"uuid" }`
**Returns:** `{ targetDLI }`

#### light.recommendPPFD

**Args:** `{ "targetDLI":0, "photoperiodHours":0 }`
**Writes:** `LightingPlan`
**Returns:** `{ lightingPlanId }`
**Impact Gate:** >10% jump from current setpoint (if provided via context/args) → `USER_CONFIRMATION_REQUIRED`

#### light.co2CompatibilityCheck

**Args:** `{ "ppfd":0, "co2ppm":0 }`
**Returns:** `{ warnings:["string"] }`

---

### 6.4 CLIMATE

#### climate.computeVPD

**Args:** `{ "airTempC":0, "rh":0, "leafOffsetC":0 }`
**Returns:** `{ vpd }`

#### climate.computeDewPoint

**Args:** `{ "airTempC":0, "rh":0 }`
**Returns:** `{ dewPointC }`

#### climate.nightSwingRisk

**Args:** `{ "dayVpd":0, "nightRh":0, "canopyDensity":"string" }`
**Writes:** `ClimateCheck`, `Alert`
**Returns:** `{ riskLevel }`

#### climate.recommendRHShift

**Args:** `{ "stage":"...", "targetVpd":0 }`
**Returns:** `{ recommendedRh:0 }`
**Impact Gate:** abs(deltaRH)>5 (if current RH provided) → `USER_CONFIRMATION_REQUIRED`

---

### 6.5 RISK

#### risk.computeBudRotRisk

**Args:** `{ "vpd":0, "dewPointC":0, "canopyDensity":"string", "stage":"..." }`
**Writes:** `RiskAssessment`, `Alert`
**Returns:** `{ riskAssessmentId }`

#### risk.recommendMitigationActions

**Args:** `{ "riskLevel":"low|medium|high" }`
**Writes:** `Task` (0..n)
**Returns:** `{ tasksCreated:0 }`

---

### 6.6 NUTRIENTS

#### nutrients.computeDeliveredNPK

**Args:**

```json
{ "products": [{ "productId": "uuid", "dose": 0, "unit": "g|ml" }], "volumeLiters": 0 }
```

**Writes:** `NutrientCalc`
**Returns:** `{ nutrientCalcId }`

#### nutrients.computeRatio

**Args:** `{ "nppm":0, "ppmp":0, "ppmk":0 }`
**Returns:** `{ ratio:"string" }`

---

### 6.7 FERT

#### fert.buildRecipe

**Args:**

```json
{
  "name": "string",
  "targetEC": 0,
  "targetRatio": "string",
  "products": [{ "productId": "uuid", "amount": 0, "unit": "g|ml" }]
}
```

**Writes:** `FertRecipe`
**Returns:** `{ recipeId }`
**Quality Gate:** missing product guarantees (implementation) → `VALIDATION_ERROR`

#### fert.scaleRecipe

**Args:** `{ "recipeId":"uuid", "volumeLiters":0 }`
**Writes:** `RecipeRun`
**Returns:** `{ recipeRunId }`

#### fert.estimateCost

**Args:** `{ "recipeId":"uuid", "volumeLiters":0 }`
**Returns:** `{ cost:0 }`

---

### 6.8 EC

#### ec.targetEC

**Args:** `{ "stage":"...", "medium":"string", "cultivarId":"uuid" }`
**Returns:** `{ targetEC:0 }`

#### ec.computeDrift

**Args:** `{ "inEC":0, "outEC":0 }`
**Writes:** `ECCheck`
**Returns:** `{ drift:0, ecCheckId:"uuid" }`

#### ec.recommendCorrection

**Args:** `{ "drift":0, "stage":"...", "medium":"string" }`
**Writes:** `Task`
**Returns:** `{ deltaEC:0 }`
**Impact Gate:** abs(deltaEC)>0.2 → `USER_CONFIRMATION_REQUIRED`

---

### 6.9 SOIL

#### soil.buildMix

**Args:**

```json
{
  "name": "string",
  "template": "string",
  "volumeLiters": 0,
  "amendments": [{ "name": "string", "amount": 0, "unit": "g|L" }]
}
```

**Writes:** `SoilRecipe`, `InventoryUsage`
**Returns:** `{ soilRecipeId:"uuid" }`

#### soil.scaleAmendments

**Args:** `{ "soilRecipeId":"uuid","volumeLiters":0 }`
**Returns:** `{ scaledIngredients:[...] }`

#### soil.computeCost

**Args:** `{ "soilRecipeId":"uuid" }`
**Returns:** `{ cost:0 }`

---

### 6.10 TOPDRESS

#### topdress.recommendTopdress

**Args:** `{ "stage":"...", "medium":"string", "lastTopdressAt":"iso" }`
**Writes:** `TopdressPlan`, `CalendarEvent`, `Task`
**Returns:** `{ topdressPlanId:"uuid" }`

#### topdress.computeTopdressAmounts

**Args:** `{ "volumeLiters":0, "amendments":[{"name":"string","rate":"string"}] }`
**Returns:** `{ amounts:[{"name":"string","amount":0,"unit":"g"}] }`

---

### 6.11 DIAGNOSIS

#### diagnosis.analyzeSymptoms

**Args:** `{ "images":["url"], "notes":"string" }`
**Writes:** `DiagnosisReport`
**Returns:** `{ diagnosisReportId:"uuid" }`
**Quality Gate:** missing images+notes → `MISSING_REQUIRED_INPUTS`

#### diagnosis.proposeCauses

**Args:** `{ "diagnosisReportId":"uuid", "envSummary":"string", "feedSummary":"string" }`
**Writes:** `DiagnosisReport` (update)
**Returns:** `{ rankedCauses:[...] }`

#### diagnosis.confirmChecks

**Args:** `{ "diagnosisReportId":"uuid" }`
**Returns:** `{ checklist:["string"] }`

#### diagnosis.recommendAction

**Args:** `{ "diagnosisReportId":"uuid", "selectedCause":"string" }`
**Writes:** `Task`, `Alert` (optional)
**Returns:** `{ tasksCreated:0 }`
**Impact Gate:** high-impact change (EC/RH/PPFD) → `USER_CONFIRMATION_REQUIRED`

---

### 6.12 PHENO (Commercial/Facility)

#### pheno.scorePheno

**Args:** `{ "runId":"uuid","cultivarId":"uuid","traits":{},"weights":{} }`
**Writes:** `PhenoScore`
**Returns:** `{ phenoScoreId:"uuid" }`

#### pheno.comparePhenotypes

**Args:** `{ "runIds":["uuid"] }`
**Returns:** `{ comparisons:{} }`

#### pheno.recommendKeeper

**Args:** `{ "runId":"uuid","thresholds":{} }`
**Writes:** `PhenoDecision`
**Returns:** `{ phenoDecisionId:"uuid" }`

---

### 6.13 RUNS (Commercial/Facility)

#### runs.compareRuns

**Args:** `{ "runA":"uuid","runB":"uuid","metrics":["string"] }`
**Writes:** `RunComparison`
**Returns:** `{ runComparisonId:"uuid" }`

#### runs.attributeDeltas

**Args:** `{ "runComparisonId":"uuid","changes":["string"] }`
**Returns:** `{ likelyDrivers:["string"] }`
**Guardrail:** must not claim proven causality → if user asks for certainty, respond with uncertainty language (implementation).

---

### 6.14 CALENDAR

#### calendar.generateCalendar

**Args:** `{ "stage":"...","cultivarId":"uuid","medium":"string" }`
**Writes:** `SchedulePlan`, `CalendarEvent` (0..n), `Task` (0..n)
**Returns:** `{ schedulePlanId:"uuid" }`

#### calendar.updateCalendarOnEvent

**Args:** `{ "eventId":"uuid" }`
**Writes:** `SchedulePlan` (update), `CalendarEvent` (optional)
**Returns:** `{ schedulePlanId:"uuid" }`

---

### 6.15 TASKS

#### tasks.generateDailyTasks

**Args:** `{ "date":"iso" }`
**Writes:** `TaskList`, `Task` (0..n)
**Returns:** `{ taskListId:"uuid" }`

#### tasks.prioritizeTasks

**Args:** `{ "taskIds":["uuid"], "riskSignals":["string"] }`
**Returns:** `{ prioritized:[{"taskId":"uuid","priority":"low|med|high"}] }`

---

## 7) Registry Enforcement

Any call not listed in Section 5 must return `UNSUPPORTED_FUNCTION`.

---

## 8) Next Additions (V1.1)

- IPM Rotation Builder
- Dry/Cure RH & Burp Scheduler
- Inventory Decrement + Reorder Alerts
- Batch Costing & COGS

---

## 9) File Status

✅ **Canonical V1.0.1 hardened spec.**
🔒 **Changes require version bump + review.**

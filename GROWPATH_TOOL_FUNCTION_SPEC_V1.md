# GrowPath Tool → Function → Stored Object Spec (V1.0.1)

**Version:** 1.0.1 (Hardening Pass)
**Owner:** GrowPath
**Scope:** Personal + Commercial + Facility
**Purpose:** Engineering-ready spec for AI tools, functions, stored objects, triggers, and guardrails.
**Status:** Ready for Backend Implementation + Frontend AI Caller

---

## 0) Global Conventions

### IDs

- All objects use `id: string` (UUID v4).
- Foreign keys: `facilityId`, `growId`, `runId`, `cultivarId`, `userId` (string).

### Timestamps

- All stored objects include:
  - `createdAt: string` (ISO 8601, UTC)
  - `updatedAt: string` (ISO 8601, UTC)
  - `deletedAt?: string | null` (soft delete, ISO 8601)

### Response Envelope (Backend-Aligned)

**All AI endpoints** follow GrowPath backend conventions:

Success:

```json
{
  "success": true,
  "data": { ... }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "STRING",
    "message": "STRING"
  }
}
```

**HTTP Status Codes:**

- `200` — Success (data returned)
- `202` — Accepted (long-running, return jobId)
- `400` — Bad Request (VALIDATION_ERROR, MISSING_REQUIRED_INPUTS, OUT_OF_BOUNDS)
- `401` — Unauthorized (AUTH_REQUIRED, TOKEN_INVALID)
- `403` — Forbidden (CAPABILITY_REQUIRED, FACILITY_FORBIDDEN)
- `404` — Not Found (RESOURCE_NOT_FOUND)
- `422` — Unprocessable (CONFIRMATION_REQUIRED, UNSAFE_RECOMMENDATION)
- `500` — Internal Server Error

### Guardrail Codes (Canonical)

**Gate A: Input Quality (Refuse)**

- `MISSING_REQUIRED_INPUTS` — required field missing, cannot proceed
- `CONFIDENCE_TOO_LOW` — inputs too ambiguous, ask for more data
- `OUT_OF_BOUNDS` — input outside allowed range

**Gate B: Impact Assessment (Confirm)**

- `USER_CONFIRMATION_REQUIRED` — high-impact change, ask before applying
- `UNSAFE_RECOMMENDATION` — violates guardrail, refuse with explanation

**Decision Codes**

- `UNSUPPORTED_STAGE` — stage not in canonical list
- `UNSUPPORTED_CULTIVAR` — cultivar not found
- `FACILITY_FORBIDDEN` — user lacks permission

---

## 1) AI Transport Layer (Canonical Routes)

### Primary Endpoint

**Route:** `POST /api/facility/:facilityId/ai/call`
**Headers:**

- `Authorization: Bearer {token}`
- `Content-Type: application/json`
- `X-Facility-Id: {facilityId}` (optional, use if not in path)

**Request:**

```json
{
  "function": "harvest.analyzeTrichomes",
  "growId": "uuid",
  "inputs": { ... }
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "callId": "uuid",
    "objectId": "uuid",
    "objectType": "TrichomeAnalysis",
    "createdAt": "iso"
  }
}
```

**Response (Confirmation Required):**

```json
{
  "success": false,
  "error": {
    "code": "USER_CONFIRMATION_REQUIRED",
    "message": "This action will update EC by +0.3. Confirm to apply.",
    "gate": "impact",
    "proposedChange": { ... },
    "confirmationId": "uuid"
  }
}
```

**Response (Input Rejected):**

```json
{
  "success": false,
  "error": {
    "code": "CONFIDENCE_TOO_LOW",
    "message": "Trichome images are unclear. Please provide higher resolution photos.",
    "gate": "quality",
    "requiredInputs": ["images.resolution_min"]
  }
}
```

### Legacy Route (Deprecated, Keep for Compat)

**Route:** `POST /api/ai/{function}`
→ Redirects to `/api/facility/:facilityId/ai/call`

---

## 2) Function Registry (Canonical)

### Harvest Readiness

- `harvest.analyzeTrichomes`
- `harvest.estimateHarvestWindow`
- `harvest.recommendPartialHarvest`
- `harvest.updateHarvestPlan`

### Crop Steering

- `steering.computeDryback`
- `steering.scoreSteeringBias`
- `steering.recommendNextIrrigation`
- `steering.suggestECAdjustment`

### Light Planning

- `light.computeDLI`
- `light.targetDLI`
- `light.recommendPPFD`
- `light.co2CompatibilityCheck`

### Climate & VPD

- `climate.computeVPD`
- `climate.computeDewPoint`
- `climate.nightSwingRisk`
- `climate.recommendRHShift`

### Bud Rot Risk

- `risk.computeBudRotRisk`
- `risk.recommendMitigationActions`

### Nutrients

- `nutrients.computeDeliveredNPK`
- `nutrients.computeRatio`

### Fert Recipes

- `fert.buildRecipe`
- `fert.scaleRecipe`
- `fert.estimateCost`

### EC / PPM

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

### Diagnostics

- `diagnosis.analyzeSymptoms`
- `diagnosis.proposeCauses`
- `diagnosis.confirmChecks`
- `diagnosis.recommendAction`

### Genetics

- `pheno.scorePheno`
- `pheno.comparePhenotypes`
- `pheno.recommendKeeper`

### Run Comparison

- `runs.compareRuns`
- `runs.attributeDeltas`

### Scheduling

- `calendar.generateCalendar`
- `calendar.updateCalendarOnEvent`

### Daily Tasks

- `tasks.generateDailyTasks`
- `tasks.prioritizeTasks`

---

## 3) Event / Trigger Model

### Event Types (Canonical)

- `SCHEDULED_DAILY` — Daily task generation, health check
- `SCHEDULED_WEEKLY` — Weekly planning
- `SCHEDULED_LATE_FLOWER_WEEKLY` — Bud rot risk + finishing checks (only when stage >= FLOWER_WEEK_4)
- `LIGHTS_ON` — Triggered when grow lights turn on
- `LIGHTS_OFF` — Triggered when grow lights turn off
- `WATERING_EVENT` — Triggered after watering log entry
- `STAGE_CHANGED` — Triggered when cultivar stage advances (VEG → FLOWER, FLOWER → CURE, etc.)
- `MANUAL_RUN` — User manually invoked AI function

### Event Envelope

```json
{
  "id": "uuid",
  "type": "SCHEDULED_DAILY",
  "growId": "uuid",
  "facilityId": "uuid",
  "payload": {},
  "createdAt": "2026-02-07T00:00:00.000Z"
}
```

---

## 4) Stored Object Schemas (Complete Stubs)

### TrichomeAnalysis

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "images": ["url"],
  "zones": ["top", "mid", "lower"],
  "distribution": {
    "clear": 0.0,
    "cloudy": 0.0,
    "amber": 0.0
  },
  "confidence": 0.7,
  "notes": "string",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `confidence`: 0.0 to 1.0
- `distribution.*`: 0.0 to 1.0, sum = 1.0 ±0.05

### HarvestDecision

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "window": {
    "min": "iso",
    "ideal": "iso",
    "max": "iso"
  },
  "recommendation": "harvest_now|wait_3_5_days|wait_1_week",
  "partialHarvest": false,
  "partialZones": ["top", "mid"],
  "confidence": 0.85,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `recommendation`: enum (harvest_now|wait_3_5_days|wait_1_week|partial)
- `confidence`: 0.6 to 1.0

### HarvestPlan

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "status": "planned|in_progress|completed",
  "decisionId": "uuid",
  "completedAt": "iso|null",
  "yield": 0.0,
  "yieldUnit": "g|oz|lb",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### SteeringReport

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "biasScore": -1.0,
  "biasDirection": "vegetative|generative",
  "drybackPercent": 50.0,
  "nextIrrigationTime": "iso",
  "ecDelta": 0.0,
  "recommendedEcAdjustment": -0.1,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `biasScore`: -1.0 to +1.0 (negative=vegetative, positive=generative)
- `biasDirection`: enum (vegetative|generative)
- `drybackPercent`: 20 to 80

### IrrigationPlan

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "events": [{ "time": "iso", "volume": 2.5, "unit": "L|gal" }],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### LightingPlan

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "targetDLI": 18.0,
  "recommendedPPFD": 1000,
  "photoperiod": 18,
  "warnings": ["string"],
  "co2Compatible": true,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `targetDLI`: 8 to 40 (mol/m²/day)
- `recommendedPPFD`: 200 to 1500 (μmol/m²/s)
- `photoperiod`: 4 to 24 (hours)

### ClimateCheck

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "vpd": 1.2,
  "vpdStatus": "optimal|high|low",
  "dewPoint": 15.5,
  "riskLevel": "low",
  "recommendedRh": 65.0,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `vpd`: 0.4 to 3.0 (kPa)
- `vpdStatus`: enum (optimal|high|low)
- `riskLevel`: enum (low|medium|high)
- `recommendedRh`: 35 to 85 (%)

### RiskAssessment

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "riskType": "bud_rot|powdery_mildew|heat_stress",
  "riskScore": 0.25,
  "mitigationSteps": ["string"],
  "urgency": "low|medium|high",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `riskScore`: 0.0 to 1.0
- `urgency`: enum (low|medium|high)

### NutrientCalc

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "nppm": 250,
  "ppmp": 80,
  "ppmk": 150,
  "ratio": "3:1:2",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `nppm`, `ppmp`, `ppmk`: 0 to 1000 (ppm)

### FertRecipe

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "name": "string",
  "stage": "veg|flower_early|flower_mid|flower_late",
  "ingredients": [{ "productId": "uuid", "amount": 5.0, "unit": "g|ml" }],
  "targetEC": 1.2,
  "targetRatio": "3:1:2",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `stage`: enum (veg|flower_early|flower_mid|flower_late)
- `targetEC`: 0.5 to 2.5 (mS/cm)

### RecipeRun

```json
{
  "id": "uuid",
  "recipeId": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "volume": 10.0,
  "volumeUnit": "L|gal",
  "estimatedEC": 1.18,
  "cost": 25.5,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### ECCheck

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "targetEC": 1.2,
  "inEC": 1.15,
  "outEC": 1.8,
  "drift": 0.65,
  "interpretation": "high_drift|normal|low_uptake",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `drift`: 0.0 to 5.0 (EC difference)
- `interpretation`: enum (high_drift|normal|low_uptake)

### SoilRecipe

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "name": "string",
  "volume": 50.0,
  "volumeUnit": "L",
  "ingredients": [{ "name": "string", "amount": 30.0, "unit": "L|cups|tbsp" }],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### TopdressPlan

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "schedule": [
    { "date": "iso", "items": [{ "name": "string", "amount": 2.5, "unit": "g|tbsp" }] }
  ],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### DiagnosisReport

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "symptoms": ["string"],
  "rankedCauses": [{ "cause": "string", "confidence": 0.8, "tests": ["string"] }],
  "confirmationChecklist": ["string"],
  "actionPlan": ["string"],
  "status": "pending_confirmation|confirmed|dismissed",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `status`: enum (pending_confirmation|confirmed|dismissed)

### PhenoScore

```json
{
  "id": "uuid",
  "runId": "uuid",
  "cultivarId": "uuid",
  "facilityId": "uuid",
  "scorecard": {
    "vigor": 8,
    "resin": 9,
    "terps": 7,
    "finish_time": 58,
    "stress_tolerance": 7,
    "yield_potential": 8
  },
  "keeperProbability": 0.85,
  "notes": "string",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `scorecard.*`: 0 to 10 (score)
- `keeperProbability`: 0.0 to 1.0

### PhenoDecision

```json
{
  "id": "uuid",
  "runId": "uuid",
  "cultivarId": "uuid",
  "facilityId": "uuid",
  "decision": "keep",
  "rationale": "string",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `decision`: enum (keep|discard|rerun)

### RunComparison

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "runA": "uuid",
  "runB": "uuid",
  "metrics": [
    { "name": "string", "valueA": 0, "valueB": 0, "delta": 0, "unit": "string" }
  ],
  "likelyDrivers": ["string"],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### CalendarEvent

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "type": "water|feed|defol|lolli|flip|harvest|check",
  "title": "string",
  "date": "iso",
  "metadata": {},
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `type`: enum (water|feed|defol|lolli|flip|harvest|check)

### SchedulePlan

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "weekStart": "iso",
  "events": ["uuid"],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### Task

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "title": "string",
  "description": "string|null",
  "status": "pending|in_progress|completed|cancelled",
  "priority": "low|med|high",
  "dueDate": "iso|null",
  "completedAt": "iso|null",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `status`: enum (pending|in_progress|completed|cancelled)
- `priority`: enum (low|med|high)

### TaskList

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "date": "iso",
  "tasks": ["uuid"],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

### Alert

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "type": "bud_rot_risk|vpd_warning|ec_drift|stage_milestone",
  "severity": "low|medium|high|critical",
  "message": "string",
  "actionable": true,
  "actionId": "uuid|null",
  "read": false,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `type`: enum (bud_rot_risk|vpd_warning|ec_drift|stage_milestone|harvest_ready)
- `severity`: enum (low|medium|high|critical)

### GrowNote

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "type": "observation|decision|ai_reasoning|user_note",
  "content": "string",
  "stage": "veg|flower_week_1|...|cure",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

**Constraints:**

- `type`: enum (observation|decision|ai_reasoning|user_note)
- `stage`: enum (veg|flower_week_1|flower_week_2|...|flower_week_10|cure)

### InventoryUsage

```json
{
  "id": "uuid",
  "inventoryId": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "amountUsed": 50.0,
  "unit": "g|ml|L|gal",
  "recipeId": "uuid|null",
  "usedAt": "iso",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

---

## 5) Function Contracts (Full Registry)

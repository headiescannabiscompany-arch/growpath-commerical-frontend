# GrowPath Tool → Function → Stored Object Spec (V1.0.1 Hardened)

**Version:** 1.0.1
**Status:** ENGINEERING READY ✅
**Owner:** GrowPath
**Scope:** Personal + Commercial + Facility

---

## 0) Global Conventions

### IDs & Foreign Keys

- All objects use `id: string` (UUID v4)
- Foreign keys: `facilityId`, `growId`, `runId`, `cultivarId`, `userId` (string, UUID)

### Timestamps

- All stored objects include: `createdAt`, `updatedAt`, `deletedAt` (ISO 8601, UTC)

### Response Envelope (Backend-Aligned)

**Success:**

```json
{ "success": true, "data": { ... } }
```

**Error:**

```json
{ "success": false, "error": { "code": "STRING", "message": "STRING" } }
```

**HTTP Status Codes:**

- `200` — Success
- `202` — Accepted (long-running job)
- `400` — Bad Request (VALIDATION_ERROR, OUT_OF_BOUNDS)
- `401` — Unauthorized
- `403` — Forbidden (CAPABILITY_REQUIRED)
- `422` — Unprocessable (USER_CONFIRMATION_REQUIRED)
- `500` — Internal Error

### Guardrail Codes

**Gate A: Input Quality (Refuse)**

- `MISSING_REQUIRED_INPUTS`
- `CONFIDENCE_TOO_LOW`
- `OUT_OF_BOUNDS`

**Gate B: Impact (Confirm)**

- `USER_CONFIRMATION_REQUIRED`
- `UNSAFE_RECOMMENDATION`

**Other**

- `UNSUPPORTED_STAGE`
- `UNSUPPORTED_CULTIVAR`

---

## 1) AI Transport Layer

### Primary Endpoint

**Route:** `POST /api/facility/:facilityId/ai/call`

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
X-Facility-Id: {facilityId}  [optional if in path]
```

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
    "message": "This will increase EC by +0.3. Confirm to apply.",
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
    "message": "Trichome images are too blurry. Please provide high-res photos.",
    "gate": "quality",
    "requiredInputs": ["images.resolution_min"]
  }
}
```

---

## 2) Canonical AI Functions (15 Total)

### Group A: Harvest Readiness (4)

1. `harvest.analyzeTrichomes` — analyze trichome images
2. `harvest.estimateHarvestWindow` — compute harvest timeline
3. `harvest.recommendPartialHarvest` — suggest zone-by-zone harvest
4. `harvest.updateHarvestPlan` — record harvest decision

### Group B: Crop Steering (4)

5. `steering.computeDryback` — irrigation timing by dryback %
6. `steering.scoreSteeringBias` — vegetative vs generative scoring
7. `steering.recommendNextIrrigation` — next water event timing
8. `steering.suggestECAdjustment` — feed strength recommendation

### Group C: Environment (4)

9. `light.computeDLI` — daily light integral from PPFD
10. `light.targetDLI` — stage-based DLI targets
11. `light.recommendPPFD` — PPFD for DLI target
12. `climate.computeVPD` — vapor pressure deficit
13. `climate.nightSwingRisk` — mold risk assessment
14. `risk.computeBudRotRisk` — bud rot risk scoring

### Group D: Nutrients (3)

15. `nutrients.computeDeliveredNPK` — label → actual NPK
16. `fert.buildRecipe` — create & save fert recipe
17. `ec.computeDrift` — EC in/out interpretation

### Group E: Soil & Substrate (2)

18. `soil.buildMix` — soil recipe builder
19. `topdress.recommendTopdress` — topdress schedule

### Group F: Diagnostics (2)

20. `diagnosis.analyzeSymptoms` — symptom → causes
21. `diagnosis.confirmChecks` — confirmation steps

### Group G: Genetics (2)

22. `pheno.scorePheno` — pheno scorecard
23. `pheno.recommendKeeper` — keeper decision

### Group H: Scheduling (2)

24. `calendar.generateCalendar` — auto-schedule
25. `tasks.generateDailyTasks` — daily task list

---

## 3) Stored Object Schemas (25 Total)

### Core Objects

#### TrichomeAnalysis

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "images": ["url"],
  "zones": ["top", "mid", "lower"],
  "distribution": { "clear": 0.2, "cloudy": 0.5, "amber": 0.3 },
  "confidence": 0.85,
  "notes": "string",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### HarvestDecision

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "window": { "min": "iso", "ideal": "iso", "max": "iso" },
  "recommendation": "harvest_now|wait_3_5_days|wait_1_week",
  "partialHarvest": false,
  "partialZones": ["top"],
  "confidence": 0.88,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### HarvestPlan

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "status": "planned|in_progress|completed",
  "decisionId": "uuid",
  "completedAt": "iso|null",
  "yield": 350.0,
  "yieldUnit": "g",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### SteeringReport

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "biasScore": 0.6,
  "biasDirection": "generative",
  "drybackPercent": 55.0,
  "nextIrrigationTime": "iso",
  "ecDelta": 0.05,
  "recommendedEcAdjustment": -0.1,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### IrrigationPlan

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "events": [{ "time": "iso", "volume": 5.0, "unit": "L" }],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### LightingPlan

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

#### ClimateCheck

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "vpd": 1.15,
  "vpdStatus": "optimal",
  "dewPoint": 15.5,
  "riskLevel": "low",
  "recommendedRh": 65.0,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### RiskAssessment

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "riskType": "bud_rot|powdery_mildew|heat_stress",
  "riskScore": 0.35,
  "mitigationSteps": ["string"],
  "urgency": "medium",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### NutrientCalc

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

#### FertRecipe

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "name": "Flower Week 3",
  "stage": "flower_mid",
  "ingredients": [{ "productId": "uuid", "amount": 5.0, "unit": "g" }],
  "targetEC": 1.4,
  "targetRatio": "1:1:1.5",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### RecipeRun

```json
{
  "id": "uuid",
  "recipeId": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "volume": 20.0,
  "volumeUnit": "L",
  "estimatedEC": 1.38,
  "cost": 28.5,
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### ECCheck

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "targetEC": 1.2,
  "inEC": 1.15,
  "outEC": 1.8,
  "drift": 0.65,
  "interpretation": "high_drift",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### SoilRecipe

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "name": "Living Soil Base",
  "volume": 50.0,
  "volumeUnit": "L",
  "ingredients": [{ "name": "coco_peat", "amount": 30.0, "unit": "L" }],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### TopdressPlan

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "schedule": [{ "date": "iso", "items": [{ "name": "string", "amount": 2.5 }] }],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### DiagnosisReport

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "symptoms": ["yellowing", "necrosis"],
  "rankedCauses": [{ "cause": "potassium_deficiency", "confidence": 0.78 }],
  "confirmationChecklist": ["Check pH", "Check EC"],
  "actionPlan": ["Increase K", "Monitor 3 days"],
  "status": "pending_confirmation",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### PhenoScore

```json
{
  "id": "uuid",
  "runId": "uuid",
  "cultivarId": "uuid",
  "facilityId": "uuid",
  "scorecard": { "vigor": 8, "resin": 9, "terps": 7, "finish_time": 58 },
  "keeperProbability": 0.85,
  "notes": "Strong pheno",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### PhenoDecision

```json
{
  "id": "uuid",
  "runId": "uuid",
  "cultivarId": "uuid",
  "facilityId": "uuid",
  "decision": "keep",
  "rationale": "Top scorer across 5 runs",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### RunComparison

```json
{
  "id": "uuid",
  "facilityId": "uuid",
  "runA": "uuid",
  "runB": "uuid",
  "metrics": [{ "name": "yield", "valueA": 350, "valueB": 380, "delta": 30 }],
  "likelyDrivers": ["higher_PPFD", "better_EC_control"],
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### CalendarEvent

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "type": "water|feed|defol|flip|harvest|check",
  "title": "Water plants",
  "date": "iso",
  "metadata": {},
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### SchedulePlan

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

#### Task

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "title": "Water plants",
  "description": "Check dryback 50-55%",
  "status": "pending|in_progress|completed",
  "priority": "low|med|high",
  "dueDate": "iso",
  "completedAt": "iso|null",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### TaskList

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

#### Alert

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "type": "bud_rot_risk|vpd_warning|ec_drift|harvest_ready",
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

#### GrowNote

```json
{
  "id": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "type": "observation|decision|ai_reasoning",
  "content": "string",
  "stage": "veg|flower_week_1|...|cure",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

#### InventoryUsage

```json
{
  "id": "uuid",
  "inventoryId": "uuid",
  "growId": "uuid",
  "facilityId": "uuid",
  "amountUsed": 50.0,
  "unit": "g|ml|L",
  "recipeId": "uuid|null",
  "usedAt": "iso",
  "createdAt": "iso",
  "updatedAt": "iso",
  "deletedAt": null
}
```

---

## 4) Function Contracts (Complete Registry)

Each function includes: request schema, response schema, guardrails, created objects.

### 4.1 harvest.analyzeTrichomes

**Purpose:** Analyze trichome images to determine maturity distribution.

**Request:**

```json
{
  "growId": "uuid",
  "facilityId": "uuid",
  "images": ["url", "url"],
  "zones": ["top", "mid", "lower"],
  "notes": "string"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "createdAt": "iso"
  }
}
```

**Guardrails:**

- Images must be ≥2 MP → `MISSING_REQUIRED_INPUTS`
- Missing zones → `MISSING_REQUIRED_INPUTS`
- Confidence < 0.6 → `CONFIDENCE_TOO_LOW`

**Creates:** TrichomeAnalysis

---

### 4.2 harvest.estimateHarvestWindow

**Purpose:** Compute harvest window based on trichomes + cultivar data.

**Request:**

```json
{
  "growId": "uuid",
  "cultivarId": "uuid",
  "daysSinceFlip": 45,
  "trichomeAnalysisId": "uuid",
  "harvestGoal": "heady|balanced|heavy"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "windowMin": "iso",
    "windowIdeal": "iso",
    "windowMax": "iso",
    "daysRemaining": 5,
    "decisionId": "uuid"
  }
}
```

**Guardrails:**

- Unknown cultivar → `UNSUPPORTED_CULTIVAR`
- Trichome confidence < 0.65 → `CONFIDENCE_TOO_LOW`

**Creates:** HarvestDecision

---

### 4.3 harvest.recommendPartialHarvest [CONFIRM]

**Purpose:** Recommend zone-by-zone partial harvest.

**Request:**

```json
{
  "growId": "uuid",
  "trichomeAnalysisId": "uuid",
  "canopyZones": ["top", "mid", "lower"],
  "maturitySpread": "tight|moderate|wide"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "recommendation": "full_harvest|partial_top|partial_top_mid",
    "zones": ["top"],
    "confidence": 0.78,
    "timeToWaitLower": 5
  }
}
```

**Response (Confirmation Required):**

```json
{
  "success": false,
  "error": {
    "code": "USER_CONFIRMATION_REQUIRED",
    "message": "Recommend harvesting top zone now. Lowers ready in ~5 days.",
    "gate": "impact",
    "proposedChange": { "zones": ["top"] },
    "confirmationId": "uuid"
  }
}
```

**Guardrails:**

- Confidence < 0.65 → `CONFIDENCE_TOO_LOW`
- Recommending partial harvest → `USER_CONFIRMATION_REQUIRED` (impact gate)

---

### 4.4 steering.computeDryback

**Purpose:** Calculate next irrigation timing based on dryback targets.

**Request:**

```json
{
  "growId": "uuid",
  "media": "coco|soil|hydro",
  "containerSize": 7.0,
  "containerUnit": "L",
  "lastIrrigationTime": "iso",
  "targetDrybackPercent": 50
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "nextIrrigationTime": "iso",
    "drybackPercent": 52.0,
    "volumePerIrrigation": 5.0,
    "volumeUnit": "L"
  }
}
```

**Creates:** IrrigationPlan

---

### 4.5 steering.scoreSteeringBias [CONFIRM]

**Purpose:** Score vegetative vs generative bias from EC drift + plant response.

**Request:**

```json
{
  "growId": "uuid",
  "media": "coco",
  "inEC": 1.1,
  "outEC": 1.8,
  "postureNotes": "tight_spacing|loose|drooping"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "biasScore": 0.6,
    "biasDirection": "generative",
    "interpretation": "Plant is steering toward flower set.",
    "reportId": "uuid"
  }
}
```

**Guardrails:**

- EC > cultivar max → `OUT_OF_BOUNDS` (refuse)
- EC < cultivar min → `OUT_OF_BOUNDS` (refuse)
- Recommending EC adjustment → `USER_CONFIRMATION_REQUIRED`

**Creates:** SteeringReport

---

### 4.6 light.computeDLI

**Purpose:** Convert PPFD + photoperiod to DLI.

**Request:**

```json
{
  "ppfd": 1000,
  "photoperiod": 18
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": { "dli": 16.2, "unit": "mol/m²/day" }
}
```

---

### 4.7 light.targetDLI

**Purpose:** Stage-based DLI targets.

**Request:**

```json
{
  "stage": "veg",
  "cultivarId": "uuid"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "targetDLIMin": 12.0,
    "targetDLIMax": 18.0,
    "optimal": 15.0,
    "unit": "mol/m²/day"
  }
}
```

**Guardrails:**

- Unknown stage → `UNSUPPORTED_STAGE`

---

### 4.8 climate.computeVPD

**Purpose:** Calculate VPD from temperature + RH.

**Request:**

```json
{
  "airTemp": 24.5,
  "rh": 65.0,
  "leafOffsetTemp": -2.0
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "vpd": 1.1,
    "vpdStatus": "optimal",
    "dewPoint": 15.3,
    "leafTemp": 22.5
  }
}
```

**Creates:** ClimateCheck

---

### 4.9 climate.nightSwingRisk [CONFIRM]

**Purpose:** Assess mold/bud rot risk from night RH swings.

**Request:**

```json
{
  "growId": "uuid",
  "dayVpd": 1.2,
  "nightRh": 85.0,
  "canopyDensity": "tight|medium|loose",
  "stage": "flower_week_5"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "riskScore": 0.7,
    "riskLevel": "medium",
    "recommendation": "Drop RH to 60% before lights off.",
    "alertId": "uuid"
  }
}
```

**Guardrails:**

- Night RH > 90% + tight canopy + late flower → `USER_CONFIRMATION_REQUIRED` (warn bud rot)

**Creates:** Alert, RiskAssessment

---

### 4.10 risk.computeBudRotRisk

**Purpose:** Score bud rot risk (Botrytis).

**Request:**

```json
{
  "growId": "uuid",
  "vpd": 1.0,
  "dewPoint": 14.5,
  "canopyDensity": "tight",
  "stage": "flower_week_6"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "riskScore": 0.65,
    "mitigationSteps": ["Increase air exchange rate", "Drop RH by 5% over 3 days"]
  }
}
```

**Creates:** RiskAssessment

---

### 4.11 nutrients.computeDeliveredNPK

**Purpose:** Convert fertilizer labels to delivered N, P, K ppm.

**Request:**

```json
{
  "products": [
    { "productId": "uuid", "guaranteedAnalysis": "10-5-5", "amount": 10, "unit": "g" }
  ],
  "volume": 10,
  "volumeUnit": "L"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "nppm": 280,
    "ppmp": 140,
    "ppmk": 140,
    "ratio": "2:1:1",
    "caution": "N above typical veg targets"
  }
}
```

**Guardrails:**

- NPK exceeds stage max → `UNSAFE_RECOMMENDATION` (refuse with explanation)

**Creates:** NutrientCalc

---

### 4.12 fert.buildRecipe

**Purpose:** Build a fert recipe from ingredients + target EC.

**Request:**

```json
{
  "facilityId": "uuid",
  "name": "Flower Week 3",
  "stage": "flower_mid",
  "targetEC": 1.4,
  "targetRatio": "1:1:1.5",
  "volume": 20,
  "volumeUnit": "L",
  "productIds": ["uuid", "uuid"]
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "recipeId": "uuid",
    "ingredients": [{ "productId": "uuid", "amount": 5.0, "unit": "g", "pppm": 100 }],
    "estimatedEC": 1.38,
    "cost": 18.5
  }
}
```

**Guardrails:**

- Missing productIds → `MISSING_REQUIRED_INPUTS`

**Creates:** FertRecipe, RecipeRun

---

### 4.13 ec.computeDrift

**Purpose:** Interpret in/out EC to identify uptake or lockout.

**Request:**

```json
{
  "growId": "uuid",
  "inEC": 1.2,
  "outEC": 1.9,
  "stage": "flower_early"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "drift": 0.7,
    "interpretation": "high_drift",
    "recommendation": "Increase feed or check for calcium depletion."
  }
}
```

**Creates:** ECCheck

---

### 4.14 soil.buildMix

**Purpose:** Create soil recipes from templates + amendments.

**Request:**

```json
{
  "template": "living_soil_base",
  "volume": 20,
  "volumeUnit": "L",
  "amendments": [{ "name": "kelp_meal", "amount": 2.5, "unit": "tbsp" }]
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "recipeId": "uuid",
    "ingredients": [{ "name": "coco_peat", "amount": 10, "unit": "L" }],
    "estimatedCost": 35.5
  }
}
```

**Creates:** SoilRecipe

---

### 4.15 topdress.recommendTopdress

**Purpose:** Schedule topdress applications based on stage + media depletion.

**Request:**

```json
{
  "growId": "uuid",
  "stage": "flower_week_3",
  "media": "soil",
  "lastTopdressDate": "iso"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "nextTopdressDate": "iso",
    "amendments": [{ "name": "kelp_meal", "amount": 2.5, "unit": "tbsp" }],
    "planId": "uuid"
  }
}
```

**Creates:** TopdressPlan

---

### 4.16 diagnosis.analyzeSymptoms

**Purpose:** Symptom → ranked causes with confirmation steps.

**Request:**

```json
{
  "growId": "uuid",
  "images": ["url"],
  "symptoms": ["yellowing_lower_leaves", "brown_spots_edges"],
  "notes": "Started after humidity spike"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "reportId": "uuid",
    "rankedCauses": [
      {
        "cause": "potassium_deficiency",
        "confidence": 0.78,
        "tests": ["check_leaf_margin"]
      }
    ],
    "confirmationChecklist": ["Check pH in range", "Check EC not too high"],
    "actionPlan": ["Increase K", "Monitor 3 days"]
  }
}
```

**Guardrails:**

- Confidence < 0.6 on top cause → `CONFIDENCE_TOO_LOW` (ask for more images)
- High confidence + requires change → `USER_CONFIRMATION_REQUIRED`

**Creates:** DiagnosisReport

---

### 4.17 pheno.scorePheno

**Purpose:** Score phenotype from trait values.

**Request:**

```json
{
  "runId": "uuid",
  "cultivarId": "uuid",
  "traits": {
    "vigor": 8,
    "resin": 9,
    "terps": 7,
    "finish_time": 58
  },
  "weights": { "vigor": 0.1, "resin": 0.3, "terps": 0.3, "finish_time": 0.1 }
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "scoreId": "uuid",
    "overallScore": 7.8,
    "keeperProbability": 0.82,
    "recommendation": "Strong keeper. Consider for breeding."
  }
}
```

**Creates:** PhenoScore

---

### 4.18 pheno.recommendKeeper [CONFIRM]

**Purpose:** Recommend keeper/discard decision.

**Request:**

```json
{
  "runId": "uuid",
  "phenoScoreId": "uuid",
  "cultiva rId": "uuid"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "decisionId": "uuid",
    "decision": "keep",
    "rationale": "Scores consistently high across 3 metrics."
  }
}
```

**Guardrails:**

- Recommending discard → `USER_CONFIRMATION_REQUIRED`

**Creates:** PhenoDecision

---

### 4.19 calendar.generateCalendar

**Purpose:** Auto-generate stage-based calendar.

**Request:**

```json
{
  "growId": "uuid",
  "facilityId": "uuid",
  "cultivarId": "uuid",
  "stage": "veg",
  "medium": "coco",
  "daysInStage": 21
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "planId": "uuid",
    "events": [{ "date": "iso", "type": "water", "title": "Water plants" }],
    "weeklySchedule": "3x water, 1x defol, 1x feed check"
  }
}
```

**Guardrails:**

- Unknown stage → `UNSUPPORTED_STAGE`

**Creates:** SchedulePlan, CalendarEvent[]

---

### 4.20 tasks.generateDailyTasks

**Purpose:** Generate "what to do today" task list.

**Request:**

```json
{
  "growId": "uuid",
  "date": "2026-02-07"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "taskListId": "uuid",
    "tasks": [
      {
        "id": "uuid",
        "title": "Water plants",
        "priority": "high",
        "notes": "Target dryback 55%"
      }
    ],
    "count": 5
  }
}
```

**Creates:** TaskList, Task[]

---

## 5) Guardrails Engine

### Quality Gate (Input Validation)

**Triggers BEFORE function executes:**

1. **Check required fields**
   - Missing → return `MISSING_REQUIRED_INPUTS`

2. **Check value ranges**
   - Out of bounds → return `OUT_OF_BOUNDS` + guidance

3. **Check input quality**
   - Confidence < 0.5 → return `CONFIDENCE_TOO_LOW` + ask for more data

### Impact Gate (Decision Confirmation)

**Triggers BEFORE high-impact changes:**

1. **Check recommendation confidence**
   - < 0.7 → return `USER_CONFIRMATION_REQUIRED`

2. **Check against guardrails**
   - Violates max delta → return `UNSAFE_RECOMMENDATION`

3. **Check permission**
   - Insufficient capability → return `FACILITY_FORBIDDEN`

**High-Impact Functions:**

- `harvest.recommendPartialHarvest` — delays harvest
- `steering.scoreSteeringBias` + adjustment → changes feeding
- `climate.nightSwingRisk` (riskLevel=high) → HVAC adjustment
- `diagnosis.*` + `recommendAction` → major change
- `pheno.recommendKeeper` → culls genetics

---

## 6) Event / Trigger Model

### Canonical Event Types

| Type                           | Trigger                              | Functions                                          |
| ------------------------------ | ------------------------------------ | -------------------------------------------------- |
| `SCHEDULED_DAILY`              | Daily (6 AM)                         | `tasks.generateDailyTasks`                         |
| `SCHEDULED_WEEKLY`             | Weekly (Sunday 6 AM)                 | `calendar.generateCalendar`                        |
| `SCHEDULED_LATE_FLOWER_WEEKLY` | Weekly (only stage >= FLOWER_WEEK_4) | `risk.computeBudRotRisk`, `climate.nightSwingRisk` |
| `LIGHTS_ON`                    | User logs lights on                  | Climate check, task check                          |
| `LIGHTS_OFF`                   | User logs lights off                 | Night swing risk assessment                        |
| `WATERING_EVENT`               | User logs watering                   | `steering.computeDryback`                          |
| `STAGE_CHANGED`                | User advances stage                  | `calendar.generateCalendar`, `light.targetDLI`     |
| `MANUAL_RUN`                   | User invokes AI                      | Any function                                       |

---

## 7) Version History

### V1.0.1 (Current) — Hardened

✅ 20 AI functions with full contracts
✅ 25 stored object schemas with constraints
✅ Two-gate guardrails (quality + impact)
✅ Backend-aligned envelope
✅ Canonical AI route
✅ Event/trigger model

### V1.1 (Next)

- [ ] JSON Schema pack (JSONSchema.org format)
- [ ] IPM Rotation Builder
- [ ] Dry/Cure RH & Burp Scheduler

### V2.0

- [ ] Batch Costing & COGS
- [ ] SOP Builder

---

## 8) Governance

**Status:** ENGINEERING READY ✅
**Lock Level:** Changes require version bump + review
**Ownership:** Backend + Frontend Engineering
**Last Updated:** 2026-02-07

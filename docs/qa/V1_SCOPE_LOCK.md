# V1 Scope Lock — AI (Must-Ship vs Deferred)

This doc locks AI scope for v1 to prevent drift.
Rule: End-to-end means UI input → backend compute → stored result object(s) → readback → UI renders deterministic results.

## V1 Must-Ship (End-to-End)

### AI-01 Harvest Readiness — Trichome Analysis
- Tool key: `harvest.analyzeTrichomes` (or existing tool registry key)
- User value: Are these trichomes ready?
- Inputs (minimum):
  - image(s) or imageRef(s)
  - strain optional
  - stage/day optional (if known)
  - TimeContext (nowIso, timezone)
- Output (minimum):
  - ripeness classification
  - confidence band
  - notes/explanation
- Stored object:
  - `HarvestTrichomeAnalysisResult`
- Readback:
  - list/retrieve results for a plant/grow

Acceptance:
- Deterministic output shape (envelope + result schema)
- Quality Gate blocks on missing/invalid image refs
- Impact Gate NOT required (read-only recommendation)

---

### AI-02 Harvest Window Estimate
- Tool key: `harvest.estimateHarvestWindow`
- User value: What’s my harvest window?
- Inputs (minimum):
  - cultivar/strain optional
  - flower day anchor (or user-provided day 1 of flower)
  - observed trichome result id optional
  - TimeContext
- Output (minimum):
  - earliestIso / latestIso window
  - confidence band + reasons
- Stored object:
  - `HarvestWindowResult`
- Readback:
  - list/retrieve by grow/plant

Acceptance:
- Produces same window given same anchors + TimeContext
- Quality Gate blocks if no anchors provided (or requires user to provide)

---

### AI-03 Climate Compute — VPD / Dew Point Guard
- Tool key: `climate.computeVPD`
- User value: Is my VPD safe right now?
- Inputs (minimum):
  - temp (air)
  - RH
  - leafTemp optional
  - TimeContext
- Output (minimum):
  - VPD (kPa)
  - dew point
  - banding (safe/caution/risk)
  - recommended target range
- Stored object:
  - `VpdResult`
- Readback:
  - list/retrieve recent results (windowDays)

Acceptance:
- Deterministic math output (no LLM required)
- Quality Gate blocks on out-of-range values (RH > 100, etc.)

---

### AI-04 EC Correction Recommendation
- Tool key: `ec.recommendCorrection`
- User value: My EC drifted—what do I do?
- Inputs (minimum):
  - currentEC, targetEC
  - reservoir volume optional (if using dilution math)
  - nutrient strength profile optional
  - TimeContext
- Output (minimum):
  - recommended action (dilute/add nutrients/flush) with amounts if possible
  - confidence band + assumptions
- Stored object:
  - `EcCorrectionResult`
- Readback:
  - list/retrieve by grow/reservoir

Acceptance:
- Deterministic correction math path exists
- Impact Gate REQUIRED if tool proposes write-actions (e.g., auto-creating tasks)

## V1 Optional (UI exists, backend may be stubbed but must be clearly labeled)

- AI chat (general) if present: must not write anything; read-only responses only
- Insights cards that read existing results: allowed if no new tool execution

## Deferred (Not end-to-end in v1)

These remain disabled/coming-soon until v1 must-ship tools prove the pattern:

- Issue Diagnosis AI (nutrient deficiency / pests / disease)
- Bud Rot Risk / Powdery Mildew risk predictors
- Crop Steering planner (full automation)
- Pheno-Hunting Matrix AI scoring
- Run-to-Run Comparison AI insights generation
- Auto Grow Calendar AI optimization (beyond deterministic calendar)
- Any tool that:
  - auto-writes to compliance objects
  - modifies grow settings automatically
  - generates prescriptions without Impact Gate confirmation

## Non-negotiables (V1 AI rules)

- Deterministic-first: if a calculator exists, it runs first.
- LLM is optional validator/explainer only (mid-confidence bands).
- Quality Gate always enforced.
- Impact Gate enforced for any action that creates tasks, modifies settings, or writes high-impact objects.
- Every AI call logs:
  - toolKey, inputs (redacted if needed), outputs, confidence, timestamps, actor, facilityId

# GrowPath AI Brain Spec (V1)

**Version:** 1.0
**Owner:** GrowPath
**Scope:** Personal / Commercial / Facility
**Purpose:** Formalize GrowPath's deterministic-first, probabilistic-second AI architecture; define how/when external models are used; define reconciliation, guardrails, audit logging, and drift-stop contracts.

---

## 1) Core Philosophy (Contract)

GrowPath AI is an **orchestrator** over:

- deterministic calculators
- bounded decision rules
- persistent objects
- auditable reasoning chains

External LLMs (GPT/Claude/local) are **validators/explainers**, never the primary decision-makers.

**Non-negotiables:**

1. Deterministic core runs first and always.
2. AI only calls registered functions (Tool/Function registry).
3. High-impact changes require explicit user confirmation.
4. Every AI recommendation must be explainable and auditable.
5. Model-agnostic: external provider can be swapped without changing contracts.

---

## 2) System Components

### 2.1 Deterministic Core (Always-On)

- Pure math + bounded logic functions:
  - climate.computeVPD
  - climate.computeDewPoint
  - light.computeDLI
  - ec.computeDrift
  - nutrients.computeDeliveredNPK
  - etc.

### 2.2 AI Tool Orchestrator (GrowPath Brain)

- Receives a request or trigger
- Builds context
- Runs deterministic functions first
- Applies guardrails (quality gate → impact gate)
- Optionally calls external validator
- Reconciles + logs rationale
- Writes stored objects (GrowNote, Alerts, Tasks, Plans)

### 2.3 External Validator (Optional)

- Receives structured packets (NOT raw "vibes")
- Produces:
  - critique
  - alternative hypotheses
  - explanation suggestions
  - uncertainty flags
- Does **not** directly mutate plans or perform high-impact changes

### 2.4 Audit & Persistence Layer

- Writes:
  - GrowNote (reasoning snapshot)
  - EventLog (trigger record)
  - Decision objects (HarvestDecision, SteeringReport…)
  - Alert / Task objects
- Enables:
  - run-to-run learning
  - explainability UI
  - compliance/audit trail (facility)

---

## 3) Canonical Execution Flow

### 3.1 Inputs

The Brain is invoked by:

- **Manual run** (user taps tool)
- **Scheduled trigger** (daily/weekly/late-flower)
- **Event trigger** (watering event, lights off, stage changed)

### 3.2 Decision Pipeline (Always the same)

**1) Normalize request**

- Validate registry: tool + fn allowed
- Validate args schema (Ajv)
- Gather `context` (growId, stage, cultivarId, facilityId)

**2) Compute deterministic signals**

- Run core calculators relevant to the tool
- Build `ComputedMetrics` object (in-memory)

**3) Quality Gate**
Hard stop if:

- required inputs missing → `MISSING_REQUIRED_INPUTS`
- confidence too low (image unclear / incomplete) → `CONFIDENCE_TOO_LOW`
- invalid stage → `UNSUPPORTED_STAGE`
- invalid ranges/enums → `VALIDATION_ERROR`

**4) Generate bounded recommendation**

- Using internal rules + computed metrics
- Output:
  - `proposal`
  - `confidence` (0..1)
  - `assumptions[]`
  - `rationale[]`

**5) Impact Gate**
If recommendation changes exceed max deltas:

- return `USER_CONFIRMATION_REQUIRED`
- include `proposedChange` + `why`

**6) Optional external validation**
Only if:

- function is "validation-eligible" (see Section 6)
- and confidence is in the "gray zone" (e.g., 0.60–0.85)
- and user/facility settings allow it

**7) Reconcile**

- Compare internal proposal vs external critique
- Adjust:
  - confidence (bounded adjustment)
  - add "uncertainty flags"
  - add follow-up checks
- Never allow external validator to override guardrails

**8) Persist**

- Write stored objects per tool spec
- Always write at least one GrowNote for significant recommendations

---

## 4) Confidence Model (V1)

### 4.1 Confidence Sources (examples)

- Input quality: image clarity, sensor completeness, data freshness
- Historical alignment: prior runs / cultivar traits
- Signal consistency: metrics agree vs conflict
- Coverage: top vs lowers, multi-zone input

### 4.2 Confidence Bands

- **< 0.60**: hard stop (quality gate)
- **0.60–0.85**: eligible for external validation (if tool allows)
- **> 0.85**: typically no external call needed (unless user requests "double-check")

### 4.3 Confidence Adjustment Rules (bounded)

External validator may:

- **raise** confidence by max +0.05 if it confirms assumptions
- **lower** confidence by max −0.10 if it flags weak assumptions
- never change recommendation class without causing "requires confirmation" pathway if impact is high

---

## 5) Guardrails & Safety (Enforced)

### 5.1 Two-Gate System (Locked)

- **Gate A: Quality** → stop and ask for more data
- **Gate B: Impact** → propose but require confirmation

### 5.2 High-Impact Actions

Examples requiring confirmation when thresholds exceeded:

- EC correction > 0.2 per event
- RH shift > 5% per cycle
- PPFD step > 10% at once

### 5.3 Policy Restrictions

- No medical claims
- No legal advice
- No direct device control (HVAC/irrigation) unless explicitly enabled

---

## 6) External Model Integration Rules (V1)

### 6.1 Validation-Eligible Functions

These MAY call external validators:

- harvest.analyzeTrichomes (image interpretation)
- diagnosis.analyzeSymptoms (image + symptom interpretation)
- risk.recommendMitigationActions (wording/explanation; NOT device control)
- pheno.\* (pattern recognition + explanation, with strong caveats)
- runs.attributeDeltas (hypothesis suggestions; no causality claims)

### 6.2 Deterministic-Only Functions (Never external)

These NEVER call external models (pure math / high impact):

- climate.computeVPD
- climate.computeDewPoint
- light.computeDLI
- ec.computeDrift
- ec.recommendCorrection (especially if it suggests change)
- steering.suggestECAdjustment (impact-gated)
- nutrients.computeDeliveredNPK
- nutrients.computeRatio

### 6.3 External Packet Format (Structured)

When calling external validator, send:

- grow context (minimal)
- computed metrics
- internal proposal
- questions for critique
- constraints (no medical/legal; no device control)

**Example fields:**

- `computedMetrics`
- `proposal`
- `assumptions`
- `requestedCritique`
- `allowedResponseTypes: ["edge_cases","alt_hypotheses","explanation"]`

---

## 7) Reconciliation & Audit Logging

### 7.1 Reconciliation Outcomes

- `AGREE`: external confirms internal
- `PARTIAL`: external adds caveats/follow-ups
- `DISAGREE`: external challenges assumptions (confidence reduced)
- `INSUFFICIENT`: external response too vague / unhelpful

### 7.2 GrowNote (Audit Snapshot)

Every significant AI action writes a GrowNote:

- tool + function
- inputs summary
- computed metrics summary
- recommendation
- confidence
- guardrail status
- external validator summary (if used)
- reconciliation outcome

---

## 8) Explainability UX Requirements (V1)

Any AI output shown to a user must include:

- the recommendation
- the confidence
- the top 3 reasons ("why")
- what data it used
- what data is missing (if any)
- whether an external validator was consulted
- what would change the recommendation (next checks)

---

## 9) Testing & Drift Stoppers

- Schema drift stopper test validates:
  - AiCallRequest payload
  - success/error envelopes
  - stored object shapes
- Future: integration tests that call `/api/facility/:facilityId/ai/call` and validate `writes[]` objects against schemas.

---

## 10) Future Extensions (V1.1+)

- Local model support (on-device / edge)
- Confidence calibration from outcomes
- "Learning loop": outcome → rule tuning → weight updates
- Device control with explicit opt-in + safety interlocks

---

## 11) Definition of Done (V1)

Brain Spec is implemented when:

- AI call endpoint exists and enforces registry + schemas
- Quality + impact gates enforced
- External validation integrated for eligible tools only
- GrowNote audit snapshot written for decisions
- Drift stopper test runs in CI

---

## 12) Fastest Path to Working Product

**Next step:** Implement `/api/facility/:facilityId/ai/call` as a router with:

- Registry lookup (validate tool + fn in Section 6.1/6.2 map)
- Ajv validation (AiCallRequest schema)
- Tool dispatch (router → handler by tool)
- Guardrail gating (quality gate → impact gate)
- `writes[]` recording (persist objects)

**Validation:** Single end-to-end test:

1. Call `harvest.analyzeTrichomes` with dummy image URL
2. Assert success envelope
3. Assert a `TrichomeAnalysis` object is created and schema-valid

If you share:

- Your canonical `apiError()` helper
- One "good" router template from your codebase

I'll write the exact `ai.call` router file in your project's style (mounts, middleware, role gates, contract tests).

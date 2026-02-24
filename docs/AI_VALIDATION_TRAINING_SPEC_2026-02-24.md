# AI Validation and Training Spec
Date: 2026-02-24  
Status: Implementation blueprint aligned to current frontend architecture

## 1) Product Position (Non-Negotiable)
- AI is a journal and helper, not final authority.
- Recommendations must be framed as probabilistic guidance.
- Grower, facility leads, soil scientists, lab tests, and vendor agronomy guidance remain required decision inputs.
- Every AI recommendation should support traceability:
  - input context
  - model outputs
  - confidence
  - human override
  - actual outcome over time

## 2) Current AI Surfaces in Code
Internal diagnose (general):
- Screen: `src/screens/DiagnoseScreen.js`
- Hook: `src/hooks/useDiagnose.ts`
- APIs:
  - `analyzeDiagnosis(payload)` via `src/api/diagnose.js`
  - `diagnoseImage(uri)` via `src/api/diagnose.js`

Facility structured AI tools:
- Hook: `src/hooks/useAICall.ts`
- Endpoint: `POST /api/facility/{facilityId}/ai/call`
- Implemented tool screens:
  - `TrichomeAnalysisScreen` (`harvest.analyzeTrichomes`)
  - `HarvestWindowScreen` (`harvest.estimateHarvestWindow`)
  - `ComputeVPDScreen` (`climate.computeVPD`)
  - `ECRecommendScreen` (`ec.recommendCorrection`, confirmation loop added)
- Feature matrix source:
  - `src/features/ai/aiFeatureMatrix.ts`

## 3) LAWNS-over-Time Data Contract
LAWNS dimensions:
- Light: PPFD, DLI, fixture model, distance, spectrum
- Air: temp, RH, airflow, optional CO2
- Water: source, treatment, pH, ppm
- Nutrients: brand, strength, schedule
- Substrate: type, pH, EC
- Time: stage, timestamped logs, interventions, outcomes

Required persistent entities:
- `AiInferenceRun`
  - `id`, `facilityId`, `growId`, `plantId?`
  - `tool`, `fn`, `modelVersion`, `provider`
  - `inputSnapshot`, `outputPayload`, `confidence`
  - `createdAt`
- `AiVerifierRun`
  - `inferenceRunId`
  - `provider`, `modelVersion`
  - `inputSnapshot`, `outputPayload`, `confidence`
  - `createdAt`
- `AiComparison`
  - `inferenceRunId`, `verifierRunId`
  - `agreementScore`
  - `divergenceType`
  - `escalationRequired`
  - `comparisonNotes`
- `AiOutcomeFeedback`
  - `inferenceRunId`
  - `userDecision` (`accepted`, `modified`, `rejected`)
  - `actualAction`
  - `observedOutcome`
  - `resolved` (`yes`, `no`, `partial`)
  - `resolvedAt`
  - `notes`

## 4) External Verifier Integration (Build Plan)
Frontend API client additions:
- `src/api/aiValidation.ts` (new)
  - `POST /api/ai/verify`
  - `POST /api/ai/compare`
  - `POST /api/ai/feedback`
  - `POST /api/ai/training/export`

Expected request/response contracts:
- Verify request:
  - `{ inferenceRunId, tool, fn, normalizedInput }`
- Verify response:
  - `{ verifierRunId, provider, modelVersion, output, confidence }`
- Compare request:
  - `{ inferenceRunId, verifierRunId }`
- Compare response:
  - `{ agreementScore, divergenceType, escalationRequired, normalizedComparison }`
- Feedback request:
  - `{ inferenceRunId, userDecision, actualAction, observedOutcome, notes }`
- Feedback response:
  - `{ ok: true, feedbackId }`

## 5) Training Dataset Pipeline
Capture rules:
- No raw PII in training export.
- Attach stable anonymized actor IDs.
- Include only records with explicit user consent flags.
- Include outcomes only after sufficient observation window.

Dataset row shape (minimum):
- `runId`, `facilityClass`, `growStage`, `strainClass`, `geoClass`
- `lawnsSnapshot`
- `modelOutput`, `modelConfidence`
- `verifierOutput`, `verifierConfidence`
- `agreementScore`
- `humanAction`
- `observedOutcome`
- `timeToOutcomeDays`

Quality gates before export:
- completeness >= threshold
- outcome availability >= threshold
- no unresolved schema validation errors
- no unresolved redaction warnings

## 6) Picture Diagnosis Hardening
Needed improvements:
- multi-photo batch support with per-image quality checks
- image metadata normalization (capture time, distance hint, light condition)
- blur/exposure detector prior to AI call
- confidence-calibrated response templates:
  - low confidence => request more inputs
  - medium confidence => suggest conservative actions + monitoring
  - high confidence => suggest actionable plan + follow-up schedule

## 7) Feed, Medium, Watering, and Outcomes Loop
Minimum integration:
- Diagnose result -> create optional grow log draft
- Feed/watering events -> attach to same timeline window
- Follow-up prompt after X hours/days:
  - “Did symptoms improve?”
  - “What changed?”
  - “Upload follow-up photo”
- Persist this as `AiOutcomeFeedback` linked to original run

## 8) Mode-by-Mode AI Execution Requirements
Personal:
- Basic diagnose and guided recommendations
- optional manual context entry
- prompt for journal entries after action

Commercial:
- Same diagnosis core + content education safeguards
- ability to route validated findings into educational posts
- no hard claims without confidence and disclaimer metadata

Facility:
- Full LAWNS structured data collection
- dual-model verification mandatory for high-risk recommendations
- task generation from AI outputs with approval gates
- audit log entries for all AI-generated operational decisions

## 9) Documentation and Snapshot Requirements
For each mode and page state:
- Empty state
- Populated state
- Loading state
- Error state
- Permission-denied state
- AI low-confidence branch
- AI high-divergence (internal vs verifier) branch

Artifacts to produce:
- screenshot set
- endpoint trace log
- decision/event log (user actions + AI outcomes)

## 10) Acceptance Criteria (Go/No-Go)
Go only if all pass:
1. Every active AI action has endpoint wiring and error handling.
2. Every AI recommendation can be traced to saved input snapshot + model metadata.
3. External verifier path works and comparison output is persisted.
4. Human feedback capture is required before training export.
5. Training export job validates schema and redaction rules.
6. Per-mode page walkthrough docs + snapshots are complete.

No-go conditions:
- any planned placeholder in active production path
- untracked AI recommendation without persisted metadata
- training export without explicit feedback and redaction checks

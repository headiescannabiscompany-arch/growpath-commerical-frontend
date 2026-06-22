# GrowPath AI Delivery Status

> Status: PARTIAL
> Last reviewed: 2026-06-21

This document records the current AI implementation state. It intentionally does
not claim production readiness or end-to-end completion.

## Implemented

- `backend/routes/ai.call.js` exposes the facility AI call router.
- `climate.computeVPD` is implemented as deterministic math.
- `ec.recommendCorrection` is implemented with an impact gate.
- `harvest.estimateHarvestWindow` persists harvest decisions and calendar
  events.
- `harvest.analyzeTrichomes` returns `AI_NOT_IMPLEMENTED` in v1.
- `backend/llm/provider.js` provides an OpenAI-compatible external validator
  path for gray-zone confidence decisions.

## Verified In This Workspace

- `backend/llm/provider.test.js`: 8 passing tests.
- Focused entitlement and task-access tests have passed in local runs.
- Syntax checks passed for the AI route and LLM provider.

## Not Verified

- Full Playwright workflow coverage is blocked by missing Chromium/browser
  installation in this environment.
- The full schema pack is not present; `schemas/schemas/objects/placeholder.json`
  is the only checked-in schema under `schemas/schemas/`.
- `tests/ai/ai.schema.drift.test.js` cannot prove schema coverage until the full
  schema pack is restored.
- Existing `backend/routes/ai.call.test.js` contains expectations for
  `harvest.analyzeTrichomes` success that do not match the current v1
  non-shipping handler.

## Release Requirements

- Restore the full schema pack and make schema drift tests pass.
- Update stale AI route tests to match current v1 behavior or implement the
  missing handler.
- Run Personal, Commercial, and Facility workflows against a live backend in an
  environment with Playwright browsers installed.
- Confirm external validator configuration with production secrets outside the
  repository.

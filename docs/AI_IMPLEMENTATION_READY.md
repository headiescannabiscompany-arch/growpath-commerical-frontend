# AI Implementation Readiness Checklist

> Status: NOT RELEASE-READY
> Last reviewed: 2026-06-21

The AI stack has useful backend pieces in place, but it is not fully verified
end to end. Treat this checklist as the current readiness gate.

## Current Implementation

- Deterministic AI route: `backend/routes/ai.call.js`
- External validator provider: `backend/llm/provider.js`
- Provider unit tests: `backend/llm/provider.test.js`
- Setup guide: `backend/AI_CALL_SETUP.md`
- Brain/spec docs: `docs/GROWPATH_AI_BRAIN_SPEC_V1.md` and
  `docs/GROWPATH_TOOL_FUNCTION_SPEC_V1.0.1_HARDENED.md`

## Verified

- LLM provider behavior is covered with mocked `fetch` and no network calls.
- The validator clamps `confidenceDelta` to +/-0.10.
- Missing provider/API key returns `INSUFFICIENT` instead of failing the route.
- Deterministic high-confidence outputs skip external validation.

## Not Yet Verified

- Full AI route integration tests are not current with v1 behavior.
- Full schema drift tests are blocked by the missing schema pack.
- End-to-end frontend workflows have not been run in this environment because
  Playwright Chromium installation is blocked.
- Production LLM calls require deployment-time environment variables:
  `LLM_PROVIDER=openai`, `OPENAI_API_KEY`, optional `OPENAI_MODEL`, and optional
  `OPENAI_BASE_URL`.

## Before Release

1. Restore `schemas/schemas/common.json`, request schemas, response schemas, and
   stored object schemas.
2. Update `backend/routes/ai.call.test.js` for current v1 behavior, especially
   `harvest.analyzeTrichomes`.
3. Run backend route, provider, entitlement, and schema tests in CI.
4. Run Playwright workflows for Personal, Commercial, and Facility users against
   a live backend.
5. Verify production LLM provider configuration without committing secrets.

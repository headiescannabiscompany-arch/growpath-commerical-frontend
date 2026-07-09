# GrowPath AI Fix List (Canonicalization + Runtime Readiness)

Last updated: 2026-03-13
Scope: Frontend repo plus cross-repo contract alignment items

## Status Summary

- `No`: not all features are fully thought out, designed, implemented, and runtime-verified end to end.
- Current state: strong spec depth, partial implementation, incomplete runtime proof, and unresolved canonical drift.
- Frontend updates completed in this pass:
  - Boot contract hardening for `/api/me` readiness (no silent personal fallback while token is present).
  - Canonical doc updates for AI transport scope, personal grows endpoint, role bundle, and route behavior.

## Fix Now

### RUNTIME BLOCKER

1. Backend reachability for local/manual QA and E2E

- Problem: `/api/me` and personal grows calls fail when backend is unavailable; E2E smoke blocks.
- Action: ensure backend is running/reachable in test environments; document exact startup path for E2E.
- Done when: `/api/me` and create-grow succeed in smoke flow; `npm run e2e` passes in a networked environment.

2. Expo Router route pollution under `src/app` - DONE 2026-07-09

- Problem: utility modules under route tree can be treated as routes.
- Action completed: removed stale underscored `/home/_personal` and `/home/_facility` route files, then made `scripts/inventory-ui-routes.cjs` fail on any underscored non-layout file under `src/app`.
- Evidence: route inventory now reports 205 routes / 220 files; `npm run inventory:ui-routes`, focused route tests, Frontend CI, and Production Build Preflight passed for `45e846d8`.
- Guardrail: Expo `_layout` files remain allowed; private/helper route-tree files must move outside `src/app` or become explicit canonical routes.

3. Auth boot contract enforcement - DONE 2026-07-09

- Problem: fallback behavior after `/api/me` failure can violate boot contract expectations.
- Action completed: `RequireAuth` now blocks redirect while `/api/me` is loading or retryable-failed, and `RouteAccessGuard` renders the explicit bootstrap error on protected deep routes instead of an infinite spinner.
- Evidence: `AuthBootstrapGuard.test.tsx` covers token-present `/api/me` failure in both guard layers and verifies retry stays available without redirecting.
- Guardrail: token-present bootstrap errors must keep the session retryable until the user explicitly clears the session.

### CANONICAL CONTRACT DRIFT

4. Personal grows endpoint canonicalization - DONE 2026-07-09

- Problem: competing contracts (`/api/personal/grows` vs `/api/grows` and environment-prefixed variants).
- Action completed: `/api/personal/grows` is the canonical personal-mode list/create/timeline/photo endpoint family; the shared route map and grow-photo helper now target it, and the backend route module/test comments mount it at the canonical base path.
- Evidence: `endpoints.test.js`, `grows.photos.test.ts`, acceptance user-story API tests, and `backend/routes/grows.personal.test.js` pass with `/api/personal/grows`.
- Guardrail: `/api/grows/:id/entries` remains an explicit legacy entry-helper path until a mounted canonical replacement is implemented; do not use `/api/grows` for personal grow list/create/photo flows.

5. AI transport request shape canonicalization - DONE 2026-07-09

- Problem: two incompatible request envelopes (`function+inputs` vs `tool+fn+args+context`).
- Action completed: `{ tool, fn, args, context }` is canonical, `fn` is documented as the bare function name, and backend normalization rejects legacy `functionName` / `inputs` envelopes while accepting fully-qualified `tool.fn` only as a compatibility alias.
- Evidence: `normalizeAiCallRequest` tests cover canonical, compatibility-alias, and obsolete-envelope cases; AI schema drift tests use the bare `fn` canonical example.
- Guardrail: new AI clients and docs must use `{ tool, fn, args, context }`; do not introduce `functionName`, `inputs`, or fully-qualified `fn` examples except when explicitly documenting compatibility.

6. Facility context rule consistency - DONE 2026-07-09

- Problem: “no header-derived facility context” conflicts with older docs that implied optional facility-id headers.
- Action completed: facility scope remains path-param based (`/api/facility/:facilityId/...`), and `scripts/validate-facility-context.cjs` now blocks `X-Facility-Id` / facility-header wording from source, backend, docs, tests, and scripts while allowing explicit `x-test-facility-id` dev-test logging.
- Evidence: `npm run validate:facility-context` passes and is wired into `npm run guard`.
- Guardrail: use path params or explicit account-mode context for facility scope; do not add production request headers for facility context.

### ROLE/CAPABILITY DRIFT

7. STAFF write permission conflict - DONE 2026-07-09

- Problem: backend policy notes and capability bundles disagree on STAFF write access (grows/tasks/plants/inventory).
- Action completed: route contracts are authoritative for the V1 conflict. STAFF can write tasks and grow logs, but grows/plants/inventory create/update remain MANAGER+ and deletes remain scoped by their existing gates.
- Evidence: `applyFacilityRoleCapabilities`, `roleCapabilities`, and `roleGates` now match the contract; `modeAccess.test.ts` and `rolePolicy.test.ts` cover the STAFF regression.
- Guardrail: do not grant STAFF `GROWS_WRITE`, `PLANTS_WRITE`, `INVENTORY_WRITE`, `SOP_RUNS_WRITE`, `COMPLIANCE_WRITE`, team admin, or facility settings capabilities without changing the route contracts and tests in the same patch.

### ROUTE/PATH DRIFT

8. Community vs forum canonical route naming - DONE 2026-07-09

- Problem: runtime contract and route docs use different canonical labels.
- Action completed: defined `/forum` and `/forum/post/:id` as canonical Forum/Q&A discussion routes; documented `/communities` as a legacy Forum/Q&A directory compatibility route; kept workspace `community` entry points as Forum/Q&A support surfaces, not Feed/Campaigns.
- Evidence: `ForumFeedSeparationRoutes.test.tsx` covers `/communities`, personal community, forum detail links, and composer copy. `audit:growpath-system` now checks legacy community route copy plus personal/commercial community API separation.
- Guardrail: Feed remains commercial/facility advertising and outreach. Forum/Q&A remains discussion, support, and Q&A.

9. Personal logs/tasks behavior mismatch - DONE 2026-07-09

- Problem: docs disagree on whether logs/tasks are functional vs redirected/disabled.
- Action completed: clarified that `/home/personal/logs` remains a grow-scoped stale-link redirect to Grows, while `/home/personal/tasks` is the functional out-of-nav Personal Task Center/Schedule route.
- Evidence: `V1_UI_SURFACE.json`, `V1_FEATURE_BACKEND_MATRIX.json`, and `v1.release.matrix.test.js` now agree with runtime behavior; `PersonalTaskCenterRoute.test.tsx` covers personal task listing, creation, scheduling, source links, and linked-object routing.
- Guardrail: Personal tasks may be globally reviewable/actionable, but they must stay source-linked. Personal logs remain grow-scoped and out of top-level navigation.

### DOC TYPO / COUNT ERROR

10. AI function count contradiction + typo cleanup - DONE 2026-07-09

- Problem: total function counts and minor typos in contract field names reduce trust in specs.
- Action completed: added `docs/contracts/AI_FUNCTION_INVENTORY.json` as the canonical generated inventory for Section 5 of the hardened tool-function spec, then added `scripts/inventory-ai-functions.cjs` to validate the 44-function / 15-tool count and fail if the known field-name typo returns.
- Evidence: `node scripts/inventory-ai-functions.cjs` passes and is now wired into `npm run guard` plus release preflight.
- Guardrail: edit the hardened registry first, then run `npm run inventory:ai-functions` and update the canonical inventory in the same change.

## Fix Later

### AUTO-GENERATED NOISE

11. Matrix quality cleanup and state labeling - DONE 2026-07-09

- Problem: malformed paths, duplicate rows, unknown-mode rows, and mixed canonical/alias/planned entries.
- Action completed: added explicit `rowStatus` labels (`canonical`, `compat_alias`, `deprecated`, `planned`) across `docs/product/V1_FEATURE_BACKEND_MATRIX.json`, then hardened `scripts/validate-v1-feature-matrix.cjs` to reject invalid labels, malformed modes, unexplained duplicate routes, duplicate feature IDs, and user-visible unknown-mode rows.
- Evidence: `npm run validate:v1-matrix` passes with 226 checked rows; `v1.release.matrix.test.js` passes. Current row status distribution is 39 canonical, 121 compatibility/internal, 65 planned, and 1 deprecated.
- Guardrail: `unknown` mode is only allowed for non-visible internal `auto.*` inventory rows; duplicate UI routes must have one canonical row plus compatibility/deprecated companion rows.

12. ID format policy clarification - DONE 2026-07-09

- Problem: UUID-v4 contract language vs `_id`/Mongo-shaped compatibility behavior is ambiguous.
- Action completed: added `docs/contracts/ID_POLICY.md`, clarified the hardened tool-function spec to use opaque API string IDs, and added `scripts/validate-id-policy.cjs` to reject misleading UUID-only wording.
- Evidence: `npm run validate:id-policy` and `release.preflight.test.js` pass; validator is wired into `npm run guard` and release preflight.
- Guardrail: public API/client code should normalize to `id`; `_id` remains a persistence/compatibility fallback, not the preferred public field.

## Execution Order (Deterministic)

1. Runtime blockers (`1-3`)
2. Canonical endpoint + AI transport (`4-6`)
3. Role/capability alignment (`7`)
4. Route/path alignment (`8-9`)
5. Function count + typo cleanup (`10`)
6. Matrix and ID policy hardening (`11-12`)

## Verification Gate Per Item

- Add/update test(s) for changed behavior.
- Update canonical contract doc(s) in same change.
- Update matrix rows affected by the change.
- Capture evidence artifact for QA sign-off when behavior changes at runtime.

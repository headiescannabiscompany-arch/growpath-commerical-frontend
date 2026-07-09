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

3. Auth boot contract enforcement
- Problem: fallback behavior after `/api/me` failure can violate boot contract expectations.
- Action: lock startup behavior so no entitlement-gated screen renders before readiness; handle `/api/me` failures with explicit auth/error state rather than silent role fallback.
- Done when: startup behavior matches canonical boot contract across cold start and failed-me scenarios.

### CANONICAL CONTRACT DRIFT

4. Personal grows endpoint canonicalization
- Problem: competing contracts (`/api/personal/grows` vs `/api/grows` and environment-prefixed variants).
- Action: choose one canonical personal-mode endpoint family; mark others as compatibility aliases or deprecations.
- Done when: frontend clients, E2E, matrices, and runtime contract all point to one canonical path.

5. AI transport request shape canonicalization
- Problem: two incompatible request envelopes (`function+inputs` vs `tool+fn+args+context`).
- Action: pick one canonical transport schema; mark the other legacy with removal plan.
- Done when: AI feature docs, tool spec, and client payloads use the same request shape.

6. Facility context rule consistency
- Problem: “no header-derived facility context” conflicts with docs that still mention optional `X-Facility-Id`.
- Action: remove/annotate conflicting header guidance; keep facility context source consistent with canonical policy.
- Done when: all contracts describe one facility context mechanism.

### ROLE/CAPABILITY DRIFT

7. STAFF write permission conflict
- Problem: backend policy notes and capability bundles disagree on STAFF write access (grows/tasks/plants/inventory).
- Action: decide authoritative policy, then sync capability keys, role bundles, and enforcement docs.
- Done when: CAPABILITIES, route guards, and server-side expectations match exactly.

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

12. ID format policy clarification
- Problem: UUID-v4 contract language vs `_id`/Mongo-shaped compatibility behavior is ambiguous.
- Action: document persistence ID vs API ID normalization rules and compatibility strategy.
- Done when: ID policy is explicit in contracts and reflected in response normalizers.

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

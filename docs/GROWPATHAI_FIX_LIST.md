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

2. Expo Router route pollution under `src/app`
- Problem: utility modules under route tree can be treated as routes.
- Action: move non-screen utilities out of `src/app/**` into feature modules (for example `src/features/...`).
- Done when: route inventory contains only intentional screens/layout/error/not-found entries.

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

8. Community vs forum canonical route naming
- Problem: runtime contract and route docs use different canonical labels.
- Action: define canonical route key + alias strategy; update docs to show canonical and alias explicitly.
- Done when: route contracts and tab labels are consistent and testable.

9. Personal logs/tasks behavior mismatch
- Problem: docs disagree on whether logs/tasks are functional vs redirected/disabled.
- Action: align ROUTES + runtime contract to actual behavior; clearly mark planned/deferred states.
- Done when: route behavior in docs equals runtime behavior for personal mode.

### DOC TYPO / COUNT ERROR

10. AI function count contradiction + typo cleanup
- Problem: total function counts and minor typos (for example `cultiva rId`) reduce trust in specs.
- Action: regenerate authoritative function inventory and fix doc typos.
- Done when: one canonical function count exists and doc lint checks pass.

## Fix Later

### AUTO-GENERATED NOISE

11. Matrix quality cleanup and state labeling
- Problem: malformed paths, duplicate rows, unknown-mode rows, and mixed canonical/alias/planned entries.
- Action: prune and normalize matrix rows; add explicit `status` field (`canonical`, `compat_alias`, `deprecated`, `planned`).
- Done when: matrices are deterministic, deduplicated, and decision-grade.

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

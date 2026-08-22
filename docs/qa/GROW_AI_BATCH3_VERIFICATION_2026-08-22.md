# Grow workspace and evidence-aware AI — Batch 3 verification

Date: 2026-08-22  
Frontend baseline: `689474493cd82a866e6c8b20df781950c37fb378`  
Construction branch evidence commit: recorded by the commit containing this file

## Retained-work decisions

- Reversible grow archive and its historical production note are already represented by
  newer current-main code and tests. The retained patches were not replayed.
- The retained run-comparison work was preserved as `32d20127`, then compared with current
  main. Current main contains the equivalent or newer implementation, so applying the old
  patch would remove newer behavior.
- The retained device-integration branch is superseded by current main's broader provider,
  ownership, history-import, mapping, telemetry-prefill and secret-redaction contracts.
- The retained standalone Harvest Readiness work is already present on current main.
- The dirty trichome-policy worktree has no semantic diff; its apparent modifications are
  line-ending metadata. The substantive rules are already in the canonical Harvest method
  and `src/knowledge` registry.

No old branch was merged wholesale, and no retained worktree was deleted.

## Automated evidence

- Grow/run/timeline slice: 20 focused assertions passed for Personal Grows, Start Grow,
  Run Comparison and Grow Timeline; the harvest-history validator passed.
- Integration slice: 58 assertions passed across 11 suites covering Pulse, Growlink,
  UbiBot generic-source compatibility, Facility connection/history routes, grow-owned
  mapping, CSV review, API contracts and the integration data-use registry.
- `scripts/guard-telemetry-api.cjs` passed.
- `scripts/validate-ownership-contract.cjs` passed.
- Harvest slice: 70 assertions passed across Harvest Readiness, saved results and the
  knowledge registry; `scripts/validate-harvest-history-contract.cjs` passed.

## What this closes—and what it does not

This closes the retained-code reconciliation for Batch 3. It proves that the current tree
already retains optional-grow Harvest Readiness, evidence-aware saved results, run
comparison, grow archive, device/history integration, and the visual/zoomable timeline
foundation without importing older regressions.

The matrix rows remain `partial` until the exact production acceptance scenarios are run.
In particular, P-10 still needs a persisted public viewer lifecycle (review, publish,
reload, copy/native share and withdrawal) rather than only an editor export and a drafted
Forum/Q&A copy. P-01 and the cross-tool breadth of P-07/P-09 also remain for construction
or final-candidate acceptance as routed by the canonical scaffold.

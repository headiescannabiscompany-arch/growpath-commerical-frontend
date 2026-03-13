# Automated Test Implementation Checklist

Last updated: 2026-03-13
Owner: Frontend QA/Engineering

Use this checklist to keep automated test coverage, contract checks, and evidence workflows aligned with the current frontend repo.

## 1. Baseline Environment

- [ ] Confirm Node and npm meet repo requirements in `package.json` engines.
- [ ] Run dependency install in a networked environment.
- [ ] Verify local secrets/env needed for live or acceptance paths are present.

## 2. Guard and Contract Gates

- [ ] Run `npm run guard:contamination`.
- [ ] Run `npm run guard:client`.
- [ ] Run `npm run guard:tool-journal-flow`.
- [ ] Run `npm run guard:tool-keys`.
- [ ] Run `npm run guard:telemetry-api`.
- [ ] Run `npm run verify:dewpoint-fixture`.
- [ ] Run `npm run verify:delivery`.

## 3. Automated Test Execution

- [ ] Run fast local suite: `npm test -- --runInBand`.
- [ ] Run CI-style suite: `npm run test:ci`.
- [ ] Run acceptance harness when scope requires it: `npm run acceptance`.
- [ ] Run Playwright E2E as needed: `npm run e2e`.

## 4. Coverage for Changed Scope

- [ ] Add or update unit/integration tests for every changed screen, hook, or API client behavior.
- [ ] Add regression tests for timezone, parsing, and edge-case transforms on telemetry/tooling changes.
- [ ] Validate entitlement- and role-gated flows touched by the change.

## 5. Evidence and Artifacts

- [ ] Store failing/passing outputs under `tmp/spec/` for launch-signoff work.
- [ ] Update relevant QA docs/matrices when routes, tool surface, or capability assumptions change.
- [ ] Do not mark signoff items complete without concrete evidence paths.

## 6. CI and Merge Readiness

- [ ] Ensure required checks are wired into CI for the branch/PR.
- [ ] Confirm no unexpected drift in route/tool surface validations.
- [ ] Confirm no new guard or contract violations before merge.

## 7. If Running in Restricted Codex Environment

- [ ] If npm registry access is blocked, do not run install/test commands.
- [ ] Produce the unified diff for review.
- [ ] Run corruption scans against `src`, `tests`, and `scripts`.
- [ ] Run export sanity checks on touched files.

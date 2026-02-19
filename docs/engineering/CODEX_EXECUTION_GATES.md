# Codex Execution Gates (Deterministic Recovery Plan)

Use this sequence to recover from ghost files/corruption and drive the app to App Store test readiness.

## Operating rules
1. Work on a dedicated branch (never `main`).
2. Fix only the **first failing gate** each cycle.
3. End each cycle with a handoff bundle:
   - `git status`
   - `git diff`
   - first failing block (or PASS)
   - source-only corruption scan

## Gate 0 — Parse integrity (blocker)
Goal: no parser-level failures.

Run:
```bash
npm test
```

If parser failures occur (nested exports, duplicate identifiers, imports after code):
- hard-fix only the first broken file;
- rerun `npm test`;
- repeat until parser failures are gone.

## Gate 1 — Route inventory (source of truth)
Generate inventory:
```bash
npm run qa:routes
```

Artifacts:
- `docs/qa/route_inventory.json`
- `docs/qa/mode_role_matrix.md`

## Gate 2 — Role path sweeps
For each role (`personal-free`, `personal-pro`, `commercial`, `facility-owner`, `facility-manager`, `facility-staff`, `facility-viewer`):
- login/session bootstrap,
- load home shell,
- open each tab/subpage from inventory,
- trigger primary buttons/dropdowns,
- assert no crash/red-screen and expected CTA/gating state.

## Gate 3 — Frontend/backend contract pass
Build `docs/qa/api_contract_matrix.md` with:
- UI feature/screen,
- endpoint dependency,
- auth/role requirement,
- expected success/error envelope.

## Gate 4 — Release gate
Require all to pass before release candidate:
- lint
- typecheck
- unit/integration tests
- role smoke sweeps
- corruption scan

## Corruption scan command (source-only)
```bash
rg '\$enc|New-Object|<!doctype html>|</html>' -S \
  --glob '!coverage/**' \
  --glob '!playwright-report/**' \
  --glob '!**/lcov-report/**' \
  --glob '!scripts/handoff.ps1' \
  src tests scripts
```

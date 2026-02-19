# Codex Brain Layer + Handoff Workflow

This repo uses a split layout so both Codex and humans have clear sources of truth:

## File locations
- `AGENTS.md` (repo root): machine-readable, automatically loaded instructions for Codex.
- `scripts/handoff.ps1`: deterministic handoff script for local/CI execution.
- `docs/engineering/CODEX_WORKFLOW.md` (this file): human reference for where things live and how to run them.

## Why `AGENTS.md` stays at repo root
Codex reliably auto-loads `AGENTS.md` from the repo root and nested paths. Moving it only into `docs/` can reduce reliability because it may not be picked up as the top-level instruction layer.

## Running deterministic handoff locally (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\handoff.ps1
```

## Offline/blocked-network mode
If you only want the git + diff + scan bundle (and want to skip install/tests):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\handoff.ps1 -SkipInstall
```

## What the script outputs
1. `git status`
2. `git diff`
3. Source-only corruption scan (`src`, `tests`, `scripts`)
4. Optional install/test sequence (`npm ci`, `npx jest --clearCache`, `npm test`)

## Full path sweep bootstrap
For account-type path coverage, generate route inventory and maintain role expectations:
```powershell
npm run qa:routes
```
Artifacts:
- `docs/qa/route_inventory.json`
- `docs/qa/mode_role_matrix.md`

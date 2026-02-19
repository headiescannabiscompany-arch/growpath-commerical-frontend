# GrowPathAI — Codex Prompt Library

## Triage (first failure only)
Task:
- Run tests.
- Fix ONLY the first failing block and re-run.
Output:
- Unified diff
- Commands run + outcome
- First failure snippet (only)

## Corruption cleanup (PowerShell/HTML in JS)
Task:
- Remove all non-JS contamination from the file.
- Ensure valid JS/TS syntax and a clean ending newline.
- Show first 5 + last 15 lines of the fixed file.
- Grep for $enc and <!doctype html> (should be none).

## Expo Router route stabilization
Task:
- Ensure every route file has a default export component.
- Remove top-level code before imports.
- Remove hooks outside components.
- Remove conditional hooks.
Output:
- Unified diff + file list touched
- Run npm test

## Facility scoping enforcement (backend)
Task:
- Ensure facilityId route param is used consistently.
- Enforce membership + role gates.
- Keep error envelopes deterministic.
- Soft delete: deletedAt excluded from lists.
Output:
- Unified diff
- Contract tests passing

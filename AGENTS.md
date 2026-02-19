# Codex operating guidance

## Canonical locations
- Keep `AGENTS.md` at the repository root so Codex can always load it automatically.
- Keep executable automation in `scripts/` (for example `scripts/handoff.ps1`).
- Keep detailed human-facing workflow docs in `docs/` (see `docs/engineering/CODEX_WORKFLOW.md`).

## Verification
If npm registry access is blocked in the Codex execution environment (for example, `403` from `registry.npmjs.org`), Codex must not run package install/test commands in that environment.

Instead, Codex should:
- Produce the unified diff.
- Run corruption scans against `src`, `tests`, and `scripts`.
- Run export sanity checks (for example, `rg` checks for `export` placement in touched files).

Human/CI should run dependency install and tests in a networked environment and provide the first failing block if tests fail.

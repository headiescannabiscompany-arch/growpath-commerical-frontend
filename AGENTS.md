# Codex operating guidance

## Verification
If npm registry access is blocked in the Codex execution environment (for example, `403` from `registry.npmjs.org`), Codex must not run package install/test commands in that environment.

Instead, Codex should:
- Produce the unified diff.
- Run corruption scans against `src`, `tests`, and `scripts`.
- Run export sanity checks (for example, `rg` checks for `export` placement in touched files).

Human/CI should run dependency install and tests in a networked environment and provide the first failing block if tests fail.

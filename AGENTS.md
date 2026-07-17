# Codex operating guidance

## Verification

If npm registry access is blocked in the Codex execution environment (for example, `403` from `registry.npmjs.org`), Codex must not run package install/test commands in that environment.

Instead, Codex should:

- Produce the unified diff.
- Run corruption scans against `src`, `tests`, and `scripts`.
- Run export sanity checks (for example, `rg` checks for `export` placement in touched files).

Human/CI should run dependency install and tests in a networked environment and provide the first failing block if tests fail.

## Codex Browser and production evidence

- Treat the Codex in-app Browser as separate from ordinary Chrome. A page being open in Chrome does not prove that the in-app Browser is connected.
- After a Codex or Browser plugin update, fully quit Codex, confirm the Browser plugin is enabled, start a new chat, and open the in-app Browser with `Ctrl+Shift+B` before attempting browser automation.
- Before promising screenshots or video, confirm the current chat can see an in-app Browser tab. If it cannot, report that limitation and follow `docs/codex-browser-evidence-runbook.md`; do not substitute invented, stale, or unrelated evidence.
- Product tests, live URL checks, deployment status, screenshots, and video are distinct evidence. State exactly which checks were completed and retain the commit SHA and production URL with the evidence.
- Never claim that a commit/push hook captures photos or security evidence unless the hook and resulting artifact were directly verified.

# Codex operating guidance

## GrowPathAI domain knowledge

Before modifying a GrowPathAI tool or domain workflow, read `docs/knowledge/README.md`, `docs/knowledge/source-reliability-registry.md`, `docs/knowledge/ai-decision-policy.md`, and every method document routed for that work in the README.

Do not leave domain rules only in chat history. Update the relevant method document and the app-readable registries in `src/knowledge` when behavior or evidence policy changes. Cannabis-facing changes must also follow `docs/knowledge/cannabis-visibility-policy.md`.

## Verification

If npm registry access is blocked in the Codex execution environment (for example, `403` from `registry.npmjs.org`), Codex must not run package install/test commands in that environment.

Instead, Codex should:

- Produce the unified diff.
- Run corruption scans against `src`, `tests`, and `scripts`.
- Run export sanity checks (for example, `rg` checks for `export` placement in touched files).

Human/CI should run dependency install and tests in a networked environment and provide the first failing block if tests fail.

## Codex Browser and production evidence

- Treat the Codex in-app Browser as separate from ordinary Chrome. A page being open in Chrome does not prove that the in-app Browser is connected.
- Only invoke the Browser recovery runbook when the user explicitly requests browser automation or visual production evidence. Do not prescribe Codex restarts, `Ctrl+Shift+B`, or starting Expo as generic troubleshooting steps.
- Before promising screenshots or video, inspect the current chat's available Browser tools. If no Browser tool is available, report that limitation once and continue with non-visual checks that are in scope; do not repeatedly send the user through recovery steps or substitute invented, stale, or unrelated evidence.
- A verified Codex or Browser plugin update may justify offering the recovery steps in `docs/codex-browser-evidence-runbook.md`, but only after the Browser is required and unavailable. Do not assume an update occurred.
- Product tests, live URL checks, deployment status, screenshots, and video are distinct evidence. State exactly which checks were completed and retain the commit SHA and production URL with the evidence.
- Never claim that a commit/push hook captures photos or security evidence unless the hook and resulting artifact were directly verified.

# Retained work reconciliation — 2026-08-22

This ledger is the Batch 0 input to the
[canonical construction scaffold](./CANONICAL_CONSTRUCTION_SCAFFOLD_2026-08-22.md).
It records what remains outside `origin/main` at frontend commit
`689474493cd82a866e6c8b20df781950c37fb378` so later batches reuse completed
work instead of rebuilding it.

The generated detailed inventory is written by
`scripts/audit-retained-worktrees.ps1` to `tmp/worktree-reconciliation/`.
Temporary inventory files are diagnostic artifacts; this document is the
durable decision record.

## Reconciliation rules

- A branch is not integrated merely because it exists or was deployed once.
- A clean branch with unique patches is reviewed in its assigned construction
  batch and cherry-picked or manually reconciled against current `main`.
- Dirty work is preserved until its diff and untracked source files are
  reconciled. No useful dirty worktree is deleted.
- Old acceptance text is evidence input, not permission to mark a current row
  live-accepted without a new production check.
- Hat work remains preserved but is not integrated before R05. At R05, stop for the
  owner; retained TBG concepts are design references for GrowPathAI-only derivatives,
  not TBG product authorization.
- Nested worktree folders and a missing external temporary checkout are
  registration noise, not product features.

## Unique clean work to reconcile

| Branch                                          | Matrix rows      | Assigned batch | Decision                                                                                                        |
| ----------------------------------------------- | ---------------- | -------------: | --------------------------------------------------------------------------------------------------------------- |
| `codex/plant-id-reviewed-evidence-consolidated` | P03–P06, N01–N04 |              1 | Reconciled: superseded by the newer 73-record catalog and pre-polish gates already on `main`; no patch applied. |
| `codex/admin-report-actions-frontend`           | A03–A05          |              2 | Reconciled: functional patch is on `main`; unique historical acceptance prose is evidence only.                 |
| `codex/device-integration-frontend-p0`          | P10, F05–F06     |            3/5 | Reconciled: superseded by the broader, newer provider/history implementation on `main`; 58 focused assertions plus telemetry and ownership guards pass. No older patch applied. |
| `codex/finish-old-work-integration`             | P02              |              3 | Reconciled: reversible archive behavior and tests are already on `main`; no patch applied.                       |
| `codex/archive-live-evidence`                   | P02              |              3 | Reconciled as historical evidence only; current archive tests pass, but production acceptance remains separate. |
| `codex/standalone-harvest-readiness`            | P08              |              3 | Reconciled: standalone/optional-grow access, retained-result sharing and the current knowledge contract are already on `main`; 70 focused assertions and the harvest-history validator pass. |
| `codex/live-lifecycle-p0-frontend`              | S05–S06          |              4 | Reconciled: its draft/review/publish lifecycle is already on newer `main`; applying the old branch would remove newer safeguards. |
| `codex/discover-media-exact-links`              | S01–S02, S08     |              4 | Reconciled: exact-record discovery links and regression tests are already on current `main`; no patch applied.   |
| `codex/live-studio-closure-doc-20260815`        | S05              |              4 | Reconciled as historical evidence only; current credential/deployment state remains a final-candidate check.     |
| `codex/release-acceptance-evidence`             | C01–C05, R03     |            5/8 | Reconciled: the Commercial tab fix is already on current `main`; the older report remains historical evidence only and is not replayed. |

## Meaningful dirty work to preserve and reconcile

| Worktree/branch                                                                            | Matrix rows   | Assigned batch | Preserved content                                                                                                                |
| ------------------------------------------------------------------------------------------ | ------------- | -------------: | -------------------------------------------------------------------------------------------------------------------------------- |
| `tmp/frontend-run-comparison` / `codex/run-comparison-evidence`                            | P07           |              3 | Reconciled: preserved as commit `32d20127`, then found superseded by newer equivalent/current code on `main`; focused tests and history validator pass. |
| `frontend-trichome-coverage-policy` / `codex/trichome-coverage-policy`                     | P08           |              3 | Reconciled: the worktree has no semantic diff (line-ending metadata only); its coverage, glare and uncertainty rules are already in the current method and app-readable registry. |
| `frontend-social-video-live-experience` / `codex/app-wide-canonical-sharing`               | S05–S08       |              4 | Reconciled: preserved private-draft sharing fix as `83aa8f7e`; cherry-pick was empty because the exact behavior and regression test already exist on current `main`. |
| `commercial-trials-batches-state-a11y-batch89` / `codex/commercial-hat-placeholder-assets` | R05           |              8 | Hat manifests, trial UI, research-copy rules, images, and tests. Preserve until after crawl; stop for owner review and reuse only GrowPathAI-safe material. |
| `trichome-counter-adjudication-next` / `codex/workspace-contextual-tools-accessibility`    | none directly |              0 | Only an untracked nested backend-commercial-profile checkout; inspect its registered backend worktree separately before cleanup. |

## Registration and workspace noise

- The root `codex/plant-id-to-grow-lifecycle` checkout reports many untracked
  paths because it contains the retained worktrees and historical temporary
  output. Its tracked frontend diff is not the source of those product changes.
- `C:/Users/jcind/AppData/Local/Temp/growpath-harvest-evidence-reload` contains
  only its `.git` pointer while Git reports the checkout contents as deleted.
  It is a broken temporary registration, not a source of unique implementation.
- Nineteen clean worktrees are already ancestors of or patch-equivalent to
  current `origin/main`. They can be removed only after the remaining unique
  work has been integrated and a final worktree audit confirms that status.

## Ordered extraction queue

1. Plant ID/Nature evidence and contracts.
2. Admin reporting and moderation deep links.
3. Grow archive, run comparison, harvest readiness, trichome policy, and the
   personal portion of device history.
4. Existing live lifecycle, exact discovery links, sharing, viewer controls,
   comments/chat, and premiere contracts.
5. Commercial/facility device history and the commercial tab correction.
6. Remaining lightweight business-operation rows from the canonical matrix.
7. Money and notification rows.
8. Final crawl, independent review, hats, then app stores.

Each extraction must update the canonical product matrix in the same commit or
follow-up acceptance commit. No row is closed by this inventory alone.
